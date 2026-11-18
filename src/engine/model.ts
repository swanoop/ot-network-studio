/*
 * Resolved model: turns raw canvas nodes/edges into an engineering model
 * with zone membership (derived from geometry), zone nesting and
 * cross-zone classification of every connection.
 */
import type { AssetData, AssetRoles, EdgeData, ProjectEdge, ProjectNode, ZoneData } from "../types";
import { rolesOf } from "../data/catalog";
import { normaliseEdgeData } from "./migrate";

export const ASSET_SIZE = { width: 180, height: 96 };
export const DEFAULT_ZONE_SIZE = { width: 520, height: 280 };

export interface Rect { x: number; y: number; width: number; height: number }

export interface ResolvedZone {
  id: string;
  data: ZoneData;
  rect: Rect;
  parentId?: string;
  assetIds: string[];
}

export interface ResolvedAsset {
  id: string;
  data: AssetData;
  roles: AssetRoles;
  rect: Rect;
  zoneId?: string;
}

export interface ResolvedEdge {
  id: string;
  source: string;
  target: string;
  data: EdgeData;
  sourceZoneId?: string;
  targetZoneId?: string;
  crossZone: boolean;
}

export interface Model {
  assets: Map<string, ResolvedAsset>;
  zones: Map<string, ResolvedZone>;
  /** Enabled logical flows between assets. */
  flows: ResolvedEdge[];
  /** Enabled physical links between assets. */
  links: ResolvedEdge[];
  /** Every asset-to-asset edge, including disabled ones. */
  allEdges: ResolvedEdge[];
}

const toNum = (v: unknown): number | undefined => {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") { const n = parseFloat(v); return Number.isFinite(n) ? n : undefined; }
  return undefined;
};

export function nodeRect(node: ProjectNode): Rect {
  const isZone = node.data.kind === "zone";
  const fallback = isZone ? DEFAULT_ZONE_SIZE : ASSET_SIZE;
  const width = (isZone ? toNum(node.style?.width) : undefined) ?? toNum(node.width) ?? fallback.width;
  const height = (isZone ? toNum(node.style?.height) : undefined) ?? toNum(node.height) ?? fallback.height;
  return { x: node.position.x, y: node.position.y, width, height };
}

const area = (r: Rect) => r.width * r.height;
const containsPoint = (r: Rect, x: number, y: number) => x >= r.x && x <= r.x + r.width && y >= r.y && y <= r.y + r.height;
const containsRect = (outer: Rect, inner: Rect) =>
  inner.x >= outer.x && inner.y >= outer.y && inner.x + inner.width <= outer.x + outer.width && inner.y + inner.height <= outer.y + outer.height;
export const rectsOverlap = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

export function buildModel(nodes: ProjectNode[], edges: ProjectEdge[]): Model {
  const zoneList: ResolvedZone[] = [];
  const assets = new Map<string, ResolvedAsset>();

  for (const node of nodes) {
    if (node.data.kind === "zone") {
      zoneList.push({ id: node.id, data: node.data, rect: nodeRect(node), assetIds: [] });
    }
  }
  // Smallest zones first so nested zones win membership.
  zoneList.sort((a, b) => area(a.rect) - area(b.rect));

  for (const zone of zoneList) {
    const parent = zoneList.find((other) => other.id !== zone.id && area(other.rect) > area(zone.rect) && containsRect(other.rect, zone.rect));
    if (parent) zone.parentId = parent.id;
  }

  for (const node of nodes) {
    if (node.data.kind !== "asset") continue;
    const rect = nodeRect(node);
    const cx = rect.x + rect.width / 2;
    const cy = rect.y + rect.height / 2;
    const zone = zoneList.find((z) => containsPoint(z.rect, cx, cy));
    const resolved: ResolvedAsset = { id: node.id, data: node.data, roles: rolesOf(node.data.assetType), rect, zoneId: zone?.id };
    assets.set(node.id, resolved);
    zone?.assetIds.push(node.id);
  }

  const zones = new Map(zoneList.map((z) => [z.id, z]));
  const allEdges: ResolvedEdge[] = [];
  for (const edge of edges) {
    const s = assets.get(edge.source);
    const t = assets.get(edge.target);
    if (!s || !t) continue;
    const data = edge.data ?? normaliseEdgeData(undefined);
    allEdges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      data,
      sourceZoneId: s.zoneId,
      targetZoneId: t.zoneId,
      crossZone: s.zoneId !== t.zoneId
    });
  }

  return {
    assets,
    zones,
    allEdges,
    flows: allEdges.filter((e) => e.data.enabled && e.data.kind === "flow"),
    links: allEdges.filter((e) => e.data.enabled && e.data.kind === "link")
  };
}

export function zoneName(model: Model, zoneId?: string): string {
  return zoneId ? model.zones.get(zoneId)?.data.title ?? "Unknown zone" : "Unzoned";
}

export function assetName(model: Model, id: string): string {
  return model.assets.get(id)?.data.title ?? id;
}

/** Zone path from the outermost parent to this zone, e.g. "Plant › Control › Safety". */
export function zonePath(model: Model, zoneId?: string): string {
  const parts: string[] = [];
  let current = zoneId ? model.zones.get(zoneId) : undefined;
  const guard = new Set<string>();
  while (current && !guard.has(current.id)) {
    guard.add(current.id);
    parts.unshift(current.data.title);
    current = current.parentId ? model.zones.get(current.parentId) : undefined;
  }
  return parts.length ? parts.join(" › ") : "Unzoned";
}

// ---------- IPv4 helpers ----------

export interface IPv4 { address: number; prefix?: number }

export function parseIPv4(text?: string): IPv4 | null {
  if (!text) return null;
  const m = text.trim().match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})(?:\/(\d{1,2}))?$/);
  if (!m) return null;
  const octets = m.slice(1, 5).map(Number);
  if (octets.some((o) => o > 255)) return null;
  const prefix = m[5] !== undefined ? Number(m[5]) : undefined;
  if (prefix !== undefined && prefix > 32) return null;
  const address = ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
  return { address, prefix };
}

export function ipInSubnet(ip: IPv4, subnet: IPv4): boolean {
  const prefix = subnet.prefix ?? 32;
  if (prefix === 0) return true;
  const mask = prefix === 32 ? 0xffffffff : (~((1 << (32 - prefix)) - 1)) >>> 0;
  return ((ip.address & mask) >>> 0) === ((subnet.address & mask) >>> 0);
}
