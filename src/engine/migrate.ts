/*
 * Import, validation and schema migration (v1 → v2).
 * Everything that enters the app (localStorage, file import, templates)
 * goes through normaliseProject so the rest of the code can trust the shape.
 */
import type {
  AssetData, DesignerData, EdgeData, ProjectEdge, ProjectFile, ProjectNode, ZoneData, ZoneType
} from "../types";
import { PROTOCOL_ALIASES } from "../data/protocols";
import { getAssetDefinition } from "../data/catalog";

export const CURRENT_SCHEMA = 2 as const;

export interface ImportResult {
  project: ProjectFile;
  warnings: string[];
}

type Json = Record<string, unknown>;

const isObj = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string | undefined => (typeof v === "string" && v.trim() !== "" ? v : undefined);
const num = (v: unknown): number | undefined => (typeof v === "number" && Number.isFinite(v) ? v : undefined);

export function normaliseProtocol(name: string): string {
  return PROTOCOL_ALIASES[name] ?? name;
}

function normaliseProtocols(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  for (const p of value) {
    if (typeof p === "string" && p.trim()) {
      const n = normaliseProtocol(p.trim());
      if (!out.includes(n)) out.push(n);
    }
  }
  return out;
}

const SL = ["SL 1", "SL 2", "SL 3", "SL 4"] as const;
const pickSL = (v: unknown) => (SL as readonly unknown[]).includes(v) ? (v as ZoneData["securityLevelTarget"]) : undefined;

function normaliseAsset(d: Json, warnings: string[], id: string): AssetData {
  const assetType = str(d.assetType) ?? "server";
  const def = getAssetDefinition(assetType);
  if (!def) warnings.push(`Asset ${id}: unknown type "${assetType}". Kept as-is.`);
  if (str(d.zone)) warnings.push(`Asset ${id}: the old text "zone" field ("${d.zone}") was removed. Zone membership now comes from where the asset sits on the canvas.`);
  const crit = ["low", "medium", "high", "critical"].includes(d.criticality as string) ? (d.criticality as AssetData["criticality"]) : "medium";
  const status = ["online", "warning", "offline", "unknown"].includes(d.status as string) ? (d.status as AssetData["status"]) : "unknown";
  const level = num(d.purdueLevel);
  return {
    kind: "asset",
    title: str(d.title) ?? def?.label ?? assetType,
    assetType,
    category: (def?.category ?? str(d.category) ?? "Compute") as AssetData["category"],
    status,
    ip: str(d.ip),
    vlan: d.vlan !== undefined && d.vlan !== null && String(d.vlan).trim() !== "" ? String(d.vlan) : undefined,
    mac: str(d.mac),
    purdueLevel: level !== undefined && level >= 0 && level <= 5 ? level : undefined,
    protocols: normaliseProtocols(d.protocols),
    vendor: str(d.vendor),
    model: str(d.model),
    firmware: str(d.firmware),
    slCapability: pickSL(d.slCapability),
    criticality: crit,
    owner: str(d.owner),
    notes: str(d.notes)
  };
}

function normaliseZone(d: Json): ZoneData {
  const raw = str(d.zoneType);
  const zoneType: ZoneType =
    raw === "dmz" ? "dmz" : raw === "safety" ? "safety" : raw === "external" ? "external" : "zone";
  return {
    kind: "zone",
    title: str(d.title) ?? "Zone",
    zoneType,
    securityLevelTarget: pickSL(d.securityLevelTarget),
    subnet: str(d.subnet),
    vlan: d.vlan !== undefined && d.vlan !== null && String(d.vlan).trim() !== "" ? String(d.vlan) : undefined,
    owner: str(d.owner),
    notes: str(d.notes)
  };
}

export function defaultEdgeData(kind: EdgeData["kind"] = "flow"): EdgeData {
  return kind === "flow"
    ? { kind: "flow", protocols: ["TCP/IP"], direction: "forward", enabled: true }
    : { kind: "link", protocols: [], direction: "bidirectional", media: "copper", redundancy: "none", enabled: true };
}

export function normaliseEdgeData(d: unknown): EdgeData {
  const o = isObj(d) ? d : {};
  const kind = o.kind === "link" ? "link" : "flow";
  const base = defaultEdgeData(kind);
  const media = ["copper", "fibre", "wireless", "serial", "backplane", "cellular"].includes(o.media as string) ? (o.media as EdgeData["media"]) : base.media;
  const redundancy = ["none", "PRP", "HSR", "MRP", "RSTP", "DLR", "LAG"].includes(o.redundancy as string) ? (o.redundancy as EdgeData["redundancy"]) : base.redundancy;
  return {
    kind,
    protocols: Array.isArray(o.protocols) ? normaliseProtocols(o.protocols) : base.protocols,
    direction: o.direction === "bidirectional" ? "bidirectional" : o.direction === "forward" ? "forward" : base.direction,
    ports: str(o.ports),
    via: Array.isArray(o.via) ? o.via.filter((v): v is string => typeof v === "string") : undefined,
    conduit: str(o.conduit),
    encrypted: o.encrypted === true ? true : undefined,
    authenticated: o.authenticated === true ? true : undefined,
    media: kind === "link" ? media : undefined,
    redundancy: kind === "link" ? redundancy : undefined,
    enabled: o.enabled !== false,
    notes: str(o.notes)
  };
}

function normaliseStyle(style: unknown, fallback?: { width: number; height: number }) {
  const s = isObj(style) ? style : {};
  const width = num(s.width) ?? (typeof s.width === "string" ? parseFloat(s.width) : undefined);
  const height = num(s.height) ?? (typeof s.height === "string" ? parseFloat(s.height) : undefined);
  if (width === undefined && height === undefined && !fallback) return undefined;
  return {
    width: width !== undefined && Number.isFinite(width) ? width : fallback?.width,
    height: height !== undefined && Number.isFinite(height) ? height : fallback?.height
  };
}

/** Validate and upgrade arbitrary JSON into a v2 project. Throws on fatal errors. */
export function normaliseProject(input: unknown): ImportResult {
  const warnings: string[] = [];
  if (!isObj(input)) throw new Error("Project file must be a JSON object.");
  const version = input.schemaVersion;
  if (version !== 1 && version !== 2) throw new Error(`Unsupported schemaVersion: ${String(version)} (expected 1 or 2).`);
  if (!Array.isArray(input.nodes)) throw new Error("Project is missing a nodes array.");
  if (!Array.isArray(input.edges)) throw new Error("Project is missing an edges array.");
  if (version === 1) warnings.push("Upgraded project from schema v1 to v2.");

  const nodes: ProjectNode[] = [];
  const ids = new Set<string>();
  input.nodes.forEach((raw, index) => {
    if (!isObj(raw) || !isObj(raw.data)) { warnings.push(`nodes[${index}] skipped: not a valid node.`); return; }
    let id = str(raw.id) ?? `node-${index}`;
    if (ids.has(id)) throw new Error(`Duplicate node id "${id}" at nodes[${index}]. Import rejected because edges would be ambiguous.`);
    ids.add(id);
    const pos = isObj(raw.position) ? raw.position : {};
    const position = { x: num(pos.x) ?? 0, y: num(pos.y) ?? 0 };
    const kind = raw.data.kind;
    let data: DesignerData;
    if (kind === "zone") data = normaliseZone(raw.data);
    else if (kind === "asset") data = normaliseAsset(raw.data, warnings, id);
    else { warnings.push(`nodes[${index}] skipped: data.kind must be "asset" or "zone".`); ids.delete(id); return; }
    const node: ProjectNode = { id, type: data.kind, position, data };
    if (data.kind === "zone") {
      node.zIndex = -1;
      node.style = normaliseStyle(raw.style, { width: num(raw.width) ?? 520, height: num(raw.height) ?? 280 });
    }
    nodes.push(node);
  });

  // Warn on ambiguous zone geometry; the design checker also reports it.
  const zones = nodes.filter((n) => n.data.kind === "zone");
  const rect = (n: ProjectNode) => ({ x: n.position.x, y: n.position.y, w: Number(n.style?.width) || 520, h: Number(n.style?.height) || 280 });
  for (let i = 0; i < zones.length; i++) for (let j = i + 1; j < zones.length; j++) {
    const a = rect(zones[i]), b = rect(zones[j]);
    const overlap = a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
    const contains = (x: typeof a, y: typeof a) => x.x <= y.x && x.y <= y.y && x.x + x.w >= y.x + y.w && x.y + x.h >= y.y + y.h;
    if (overlap && (!contains(a,b) && !contains(b,a) || contains(a,b) && contains(b,a))) {
      warnings.push(`Zones "${zones[i].id}" and "${zones[j].id}" overlap without strict nesting.`);
    }
  }

  const nodeKinds = new Map(nodes.map((n) => [n.id, n.data.kind]));
  const edges: ProjectEdge[] = [];
  const edgeIds = new Set<string>();
  input.edges.forEach((raw, index) => {
    if (!isObj(raw)) { warnings.push(`edges[${index}] skipped: not an object.`); return; }
    const source = str(raw.source); const target = str(raw.target);
    if (!source || !target || !ids.has(source) || !ids.has(target)) {
      warnings.push(`edges[${index}] skipped: unknown source/target (${String(raw.source)} → ${String(raw.target)}).`);
      return;
    }
    if (nodeKinds.get(source) !== "asset" || nodeKinds.get(target) !== "asset") {
      warnings.push(`edges[${index}] skipped: edges must connect asset nodes, not zones (${source} → ${target}).`);
      return;
    }
    let id = str(raw.id) ?? `edge-${index}`;
    if (edgeIds.has(id)) throw new Error(`Duplicate edge id "${id}" at edges[${index}]. Import rejected.`);
    edgeIds.add(id);
    edges.push({
      id, source, target,
      sourceHandle: str(raw.sourceHandle) ?? null,
      targetHandle: str(raw.targetHandle) ?? null,
      type: "smoothstep",
      data: normaliseEdgeData(raw.data)
    });
  });

  return {
    project: {
      schemaVersion: CURRENT_SCHEMA,
      name: str(input.name) ?? "Imported OT Architecture",
      description: str(input.description),
      nodes,
      edges,
      updatedAt: str(input.updatedAt) ?? new Date().toISOString()
    },
    warnings
  };
}

/** Strip React Flow runtime fields (selection, measured size, drag state). */
export function toPersisted(name: string, nodes: ProjectNode[], edges: ProjectEdge[], description?: string): ProjectFile {
  return {
    schemaVersion: CURRENT_SCHEMA,
    name,
    description,
    nodes: nodes.map((n) => {
      const out: ProjectNode = { id: n.id, type: n.type, position: { x: Math.round(n.position.x), y: Math.round(n.position.y) }, data: n.data };
      if (n.data.kind === "zone") {
        out.zIndex = -1;
        out.style = {
          width: typeof n.style?.width === "number" ? Math.round(n.style.width) : (n.width ?? 520),
          height: typeof n.style?.height === "number" ? Math.round(n.style.height) : (n.height ?? 280)
        };
      }
      return out;
    }),
    edges: edges.map((e) => ({
      id: e.id, source: e.source, target: e.target,
      sourceHandle: e.sourceHandle ?? null, targetHandle: e.targetHandle ?? null,
      type: "smoothstep",
      data: e.data ?? defaultEdgeData()
    })),
    updatedAt: new Date().toISOString()
  };
}
