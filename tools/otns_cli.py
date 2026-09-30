#!/usr/bin/env python3
"""Offline companion CLI for OT Network Studio project files.

Uses only the Python standard library.
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from pathlib import Path
from typing import Any


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

    if data.get("schemaVersion") != 1:
        errors.append("schemaVersion must be 1.")

    if not isinstance(data.get("name"), str) or not data["name"].strip():
        errors.append("name must be a non-empty string.")

    nodes = data.get("nodes")
    edges = data.get("edges")

    if not isinstance(nodes, list):
        errors.append("nodes must be an array.")
        nodes = []

    if not isinstance(edges, list):
        errors.append("edges must be an array.")
        edges = []

    ids: set[str] = set()
    for index, node in enumerate(nodes):
        if not isinstance(node, dict):
            errors.append(f"nodes[{index}] must be an object.")
            continue

        node_id = node.get("id")
        if not isinstance(node_id, str) or not node_id:
            errors.append(f"nodes[{index}].id must be a non-empty string.")
        elif node_id in ids:
            errors.append(f"Duplicate node id: {node_id}")
        else:
            ids.add(node_id)

        node_data = node.get("data")
        if not isinstance(node_data, dict):
            errors.append(f"nodes[{index}].data must be an object.")
            continue

        if node_data.get("kind") not in {"asset", "zone"}:
            errors.append(f"nodes[{index}].data.kind must be 'asset' or 'zone'.")

    for index, edge in enumerate(edges):
        if not isinstance(edge, dict):
            errors.append(f"edges[{index}] must be an object.")
            continue

        source = edge.get("source")
        target = edge.get("target")

        if source not in ids:
            errors.append(f"edges[{index}] references unknown source: {source}")
        if target not in ids:
            errors.append(f"edges[{index}] references unknown target: {target}")

    return errors


def assets(data: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    for node in data.get("nodes", []):
        if isinstance(node, dict):
            node_data = node.get("data")
            if isinstance(node_data, dict) and node_data.get("kind") == "asset":
                result.append(node_data)
    return result


def zones(data: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    for node in data.get("nodes", []):
        if isinstance(node, dict):
            node_data = node.get("data")
            if isinstance(node_data, dict) and node_data.get("kind") == "zone":
                result.append(node_data)
    return result


def project_summary(data: dict[str, Any]) -> str:
    project_assets = assets(data)
    project_zones = zones(data)

    categories = Counter(a.get("category", "Unspecified") for a in project_assets)
    protocols = Counter(
        protocol
        for asset in project_assets
        for protocol in asset.get("protocols", [])
        if isinstance(protocol, str)
    )
    criticality = Counter(a.get("criticality", "unspecified") for a in project_assets)

    lines = [
        f"Project: {data.get('name', 'Unnamed')}",
        f"Schema: {data.get('schemaVersion', 'unknown')}",
        f"Assets: {len(project_assets)}",
        f"Zones: {len(project_zones)}",
        f"Connections: {len(data.get('edges', [])) if isinstance(data.get('edges'), list) else 0}",
        "",
        "Asset categories:",
    ]

    lines.extend(f"  {name}: {count}" for name, count in categories.most_common())

    lines.append("")
    lines.append("Criticality:")
    lines.extend(f"  {name}: {count}" for name, count in criticality.most_common())

    lines.append("")
    lines.append("Protocols:")
    if protocols:
        lines.extend(f"  {name}: {count}" for name, count in protocols.most_common())
    else:
        lines.append("  None recorded")

    return "\n".join(lines)


def markdown_report(data: dict[str, Any]) -> str:
    project_assets = assets(data)
    project_zones = zones(data)

    lines = [
        f"# {data.get('name', 'OT Network Studio Project')}",
        "",
        "Generated from an OT Network Studio project file.",
        "",
        "## Summary",
        "",
        f"- Assets: **{len(project_assets)}**",
        f"- Zones: **{len(project_zones)}**",
        f"- Connections: **{len(data.get('edges', [])) if isinstance(data.get('edges'), list) else 0}**",
        "",
    ]

    if project_zones:
        lines.extend(["## Zones", "", "| Zone | SL-T | Type |", "|---|---|---|"])
        for zone in project_zones:
            lines.append(
                f"| {zone.get('title', 'Unnamed')} | "
                f"{zone.get('securityLevelTarget', '—')} | "
                f"{zone.get('zoneType', '—')} |"
            )
        lines.append("")

    lines.extend([
        "## Asset inventory",
        "",
        "| Asset | Type | Category | Address | VLAN | Zone | Purdue | Criticality | Protocols |",
        "|---|---|---|---|---|---|---|---|---|",
    ])

    for asset in project_assets:
        protocols = ", ".join(asset.get("protocols", [])) or "—"
        purdue = asset.get("purdueLevel")
        lines.append(
            f"| {asset.get('title', 'Unnamed')} | "
            f"{asset.get('assetType', '—')} | "
            f"{asset.get('category', '—')} | "
            f"{asset.get('ip', '—')} | "
            f"{asset.get('vlan', '—')} | "
            f"{asset.get('zone', '—')} | "
            f"{'L' + str(purdue) if purdue is not None else '—'} | "
            f"{asset.get('criticality', '—')} | "
            f"{protocols} |"
        )

    lines.extend([
        "",
        "> This report describes modelled architecture metadata only. It is not a security assessment, safety case, or compliance determination.",
        "",
    ])

    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="OT Network Studio project utility")
    subparsers = parser.add_subparsers(dest="command", required=True)

    validate_parser = subparsers.add_parser("validate", help="Validate a project file")
    validate_parser.add_argument("project", type=Path)

    summary_parser = subparsers.add_parser("summary", help="Print a project summary")
    summary_parser.add_argument("project", type=Path)

    report_parser = subparsers.add_parser("report", help="Generate a Markdown inventory report")
    report_parser.add_argument("project", type=Path)
    report_parser.add_argument("--output", "-o", type=Path)

    args = parser.parse_args()

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
        print("Project is valid.")
        return 0

    if errors:
        print("warning: project has validation issues:", file=sys.stderr)
        for error in errors:
            print(f"  - {error}", file=sys.stderr)

    if args.command == "summary":
        print(project_summary(data))
        return 0

    report = markdown_report(data)
    if args.output:
        args.output.write_text(report, encoding="utf-8")
        print(f"Wrote {args.output}")
    else:
        print(report)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
