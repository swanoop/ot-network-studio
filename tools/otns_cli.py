#!/usr/bin/env python3
"""Lightweight, dependency-free companion CLI for OT Network Studio projects.

Reads schema v1 and v2 project files. For the full rule engine, firewall rule
matrix and conduit register, use the Node CLI (`npm run otns -- check ...`),
which shares its code with the web app.

    python tools/otns_cli.py validate project.otns.json
    python tools/otns_cli.py summary  project.otns.json
    python tools/otns_cli.py report   project.otns.json --output report.md
    python tools/otns_cli.py inventory project.otns.json --output inventory.csv
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any

ASSET_W, ASSET_H = 180, 96
ZONE_W, ZONE_H = 520, 280
EDGE_KINDS = {"flow", "link"}
SL_VALUES = {"SL 1", "SL 2", "SL 3", "SL 4"}


def load_project(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ValueError(f"File not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON: {exc}") from exc
    if not isinstance(data, dict):
        raise ValueError("Project root must be a JSON object.")
    return data


def validate_project(data: dict[str, Any]) -> list[str]:
    errors: list[str] = []
    version = data.get("schemaVersion")
    if version not in (1, 2):
        errors.append("schemaVersion must be 1 or 2.")
    if not isinstance(data.get("name"), str) or not data["name"].strip():
        errors.append("name must be a non-empty string.")

    nodes = data.get("nodes") if isinstance(data.get("nodes"), list) else None
    edges = data.get("edges") if isinstance(data.get("edges"), list) else None
    if nodes is None:
        errors.append("nodes must be an array.")
        nodes = []
    if edges is None:
        errors.append("edges must be an array.")
        edges = []

    ids: set[str] = set()
    for i, node in enumerate(nodes):
        if not isinstance(node, dict):
            errors.append(f"nodes[{i}] must be an object.")
            continue
        node_id = node.get("id")
        if not isinstance(node_id, str) or not node_id:
            errors.append(f"nodes[{i}].id must be a non-empty string.")
        elif node_id in ids:
            errors.append(f"Duplicate node id: {node_id}")
        else:
            ids.add(node_id)
        d = node.get("data")
        if not isinstance(d, dict):
            errors.append(f"nodes[{i}].data must be an object.")
            continue
        if d.get("kind") not in {"asset", "zone"}:
            errors.append(f"nodes[{i}].data.kind must be 'asset' or 'zone'.")
        if d.get("kind") == "zone" and d.get("securityLevelTarget") not in (None, *SL_VALUES):
            errors.append(f"nodes[{i}] has an invalid securityLevelTarget.")
        pos = node.get("position")
        if not isinstance(pos, dict) or not all(isinstance(pos.get(k), (int, float)) for k in ("x", "y")):
            errors.append(f"nodes[{i}].position must have numeric x and y.")

    for i, edge in enumerate(edges):
        if not isinstance(edge, dict):
            errors.append(f"edges[{i}] must be an object.")
            continue
        for end in ("source", "target"):
            if edge.get(end) not in ids:
                errors.append(f"edges[{i}] references unknown {end}: {edge.get(end)}")
        d = edge.get("data")
        if version == 2:
            if not isinstance(d, dict):
                errors.append(f"edges[{i}].data must be an object in schema v2.")
            elif d.get("kind") not in EDGE_KINDS:
                errors.append(f"edges[{i}].data.kind must be 'flow' or 'link'.")
    return errors


def _num(value: Any, fallback: float) -> float:
    try:
        return float(value)
    except (TypeError, ValueError):
        return fallback


def _rect(node: dict[str, Any]) -> tuple[float, float, float, float]:
    pos = node.get("position") or {}
    x, y = _num(pos.get("x"), 0), _num(pos.get("y"), 0)
    if (node.get("data") or {}).get("kind") == "zone":
        style = node.get("style") or {}
        return x, y, _num(style.get("width"), _num(node.get("width"), ZONE_W)), _num(style.get("height"), _num(node.get("height"), ZONE_H))
    return x, y, _num(node.get("width"), ASSET_W), _num(node.get("height"), ASSET_H)


def assets(data: dict[str, Any]) -> list[dict[str, Any]]:
    return [n for n in data.get("nodes", []) if isinstance(n, dict) and (n.get("data") or {}).get("kind") == "asset"]


def zones(data: dict[str, Any]) -> list[dict[str, Any]]:
    return [n for n in data.get("nodes", []) if isinstance(n, dict) and (n.get("data") or {}).get("kind") == "zone"]


def zone_membership(data: dict[str, Any]) -> dict[str, str | None]:
    """Asset id -> zone title, using the same rule as the app: the smallest zone containing the asset centre."""
    zone_rects = sorted(((z, _rect(z)) for z in zones(data)), key=lambda zr: zr[1][2] * zr[1][3])
    result: dict[str, str | None] = {}
    for a in assets(data):
        x, y, w, h = _rect(a)
        cx, cy = x + w / 2, y + h / 2
        match = next((z for z, (zx, zy, zw, zh) in zone_rects if zx <= cx <= zx + zw and zy <= cy <= zy + zh), None)
        result[a["id"]] = (match["data"].get("title") if match else None)
    return result


def edge_kind(edge: dict[str, Any]) -> str:
    d = edge.get("data") or {}
    return d.get("kind", "flow") if isinstance(d, dict) else "flow"


def project_summary(data: dict[str, Any]) -> str:
    project_assets = [a["data"] for a in assets(data)]
    membership = zone_membership(data)
    edges = [e for e in data.get("edges", []) if isinstance(e, dict)]
    categories = Counter(a.get("category", "Unspecified") for a in project_assets)
    criticality = Counter(a.get("criticality", "unspecified") for a in project_assets)
    protocols = Counter(p for a in project_assets for p in a.get("protocols", []) if isinstance(p, str))
    per_zone = Counter(z or "Unzoned" for z in membership.values())

    lines = [
        f"Project: {data.get('name', 'Unnamed')}",
        f"Schema: {data.get('schemaVersion', 'unknown')}",
        f"Assets: {len(project_assets)}",
        f"Zones: {len(zones(data))}",
        f"Flows: {sum(1 for e in edges if edge_kind(e) == 'flow')}",
        f"Links: {sum(1 for e in edges if edge_kind(e) == 'link')}",
        "",
        "Assets per zone:",
        *[f"  {name}: {count}" for name, count in per_zone.most_common()],
        "",
        "Asset categories:",
        *[f"  {name}: {count}" for name, count in categories.most_common()],
        "",
        "Criticality:",
        *[f"  {name}: {count}" for name, count in criticality.most_common()],
        "",
        "Protocols:",
        *([f"  {name}: {count}" for name, count in protocols.most_common()] or ["  None recorded"]),
    ]
    return "\n".join(lines)


def _md(value: Any) -> str:
    if value in (None, ""):
        return "—"
    return str(value).replace("|", "\\|").replace("\n", " ")


def markdown_report(data: dict[str, Any]) -> str:
    membership = zone_membership(data)
    lines = [
        f"# {data.get('name', 'OT Network Studio Project')}",
        "",
        "Generated by the OT Network Studio Python CLI. For findings, conduits and the firewall rule matrix, use `npm run otns -- report`.",
        "",
        "## Zones",
        "",
        "| Zone | Type | SL-T | Subnet | VLAN | Assets |",
        "|---|---|---|---|---|---|",
    ]
    for z in zones(data):
        d = z["data"]
        count = sum(1 for t in membership.values() if t == d.get("title"))
        lines.append(f"| {_md(d.get('title'))} | {_md(d.get('zoneType'))} | {_md(d.get('securityLevelTarget'))} | {_md(d.get('subnet'))} | {_md(d.get('vlan'))} | {count} |")
    lines += ["", "## Asset inventory", "", "| Asset | Type | Zone | IP | VLAN | Purdue | Criticality | Protocols |", "|---|---|---|---|---|---|---|---|"]
    for a in assets(data):
        d = a["data"]
        level = d.get("purdueLevel")
        lines.append(
            f"| {_md(d.get('title'))} | {_md(d.get('assetType'))} | {_md(membership.get(a['id']) or 'Unzoned')} | {_md(d.get('ip'))} | "
            f"{_md(d.get('vlan'))} | {'L' + str(level) if level is not None else '—'} | {_md(d.get('criticality'))} | {_md(', '.join(d.get('protocols', [])))} |"
        )
    lines += ["", "> Modelled architecture metadata only. Not a security assessment, safety case or compliance determination.", ""]
    return "\n".join(lines)


def inventory_csv(data: dict[str, Any]) -> str:
    membership = zone_membership(data)
    buf = io.StringIO()
    writer = csv.writer(buf, lineterminator="\r\n")
    writer.writerow(["Name", "Type", "Category", "Zone", "IP", "VLAN", "Purdue", "Criticality", "Protocols"])
    for a in assets(data):
        d = a["data"]
        row = [d.get("title"), d.get("assetType"), d.get("category"), membership.get(a["id"]) or "Unzoned", d.get("ip"), d.get("vlan"),
               d.get("purdueLevel"), d.get("criticality"), "; ".join(d.get("protocols", []))]
        writer.writerow(["'" + str(v) if isinstance(v, str) and v[:1] in "=+-@" else ("" if v is None else v) for v in row])
    return buf.getvalue()


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="OT Network Studio project utility (stdlib only)")
    sub = parser.add_subparsers(dest="command", required=True)
    for name, help_text in [("validate", "Validate a project file"), ("summary", "Print a project summary"),
                            ("report", "Markdown zone and inventory report"), ("inventory", "Asset inventory as CSV")]:
        p = sub.add_parser(name, help=help_text)
        p.add_argument("project", type=Path)
        if name in ("report", "inventory"):
            p.add_argument("--output", "-o", type=Path)
    args = parser.parse_args(argv)

    try:
        data = load_project(args.project)
    except ValueError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 2

    errors = validate_project(data)
    if args.command == "validate":
        if errors:
            print("Project validation failed:")
            for error in errors:
                print(f"  - {error}")
            return 1
        print(f"Project is valid (schema v{data.get('schemaVersion')}).")
        return 0

    if errors:
        print("warning: project has validation issues:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)

    if args.command == "summary":
        print(project_summary(data))
        return 0

    text = markdown_report(data) if args.command == "report" else inventory_csv(data)
    if args.output:
        args.output.write_text(text, encoding="utf-8", newline="")
        print(f"Wrote {args.output}")
    else:
        sys.stdout.write(text)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
