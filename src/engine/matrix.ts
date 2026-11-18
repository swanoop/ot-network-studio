/*
 * Engineering deliverables derived from the model:
 *  - firewall / ACL rule matrix (one row per initiator, protocol and service)
 *  - zone register and conduit register (IEC 62443-3-2 style)
 */
import { getProtocol, protocolProtection } from "../data/protocols";
import type { SecurityLevel } from "../types";
import { initiators, physicalPath, unguardedPhysicalPath } from "./rules";
import { assetName, parseIPv4, zoneName, zonePath, type Model } from "./model";

export interface RuleRow {
  no: number;
  edgeId: string;
  sourceId: string;
  source: string;
  sourceZone: string;
  sourceIp: string;
  destinationId: string;
  destination: string;
  destinationZone: string;
  destinationIp: string;
  protocol: string;
  service: string;
  routedVia: string;
  conduit: string;
  secured: boolean;
  crossZone: boolean;
  comment: string;
}

const bareIp = (ip?: string) => {
  if (!ip) return "—";
  return parseIPv4(ip) ? ip.split("/")[0] : ip;
};

function boundaryDevicesFor(model: Model, edgeId: string, adj?: Map<string, string[]>): string[] {
  const edge = model.allEdges.find((e) => e.id === edgeId);
  if (!edge) return [];
  const ids = new Set<string>();
  for (const id of [edge.source, edge.target]) if (model.assets.get(id)?.roles.boundary) ids.add(id);
  for (const id of edge.data.via ?? []) if (model.assets.get(id)?.roles.boundary) ids.add(id);
  if (adj) {
    const path = physicalPath(adj, edge.source, edge.target);
    path?.slice(1, -1).forEach((id) => { if (model.assets.get(id)?.roles.boundary) ids.add(id); });
  }
  return [...ids];
}

function adjacency(model: Model) {
  const adj = new Map<string, string[]>();
  for (const l of model.links) {
    adj.set(l.source, [...(adj.get(l.source) ?? []), l.target]);
    adj.set(l.target, [...(adj.get(l.target) ?? []), l.source]);
  }
  return adj;
}

export function buildRuleMatrix(model: Model, options: { crossZoneOnly?: boolean } = {}): RuleRow[] {
  const rows: RuleRow[] = [];
  const adj = adjacency(model);
  for (const flow of model.flows) {
    if (options.crossZoneOnly && !flow.crossZone) continue;
    const bypass = flow.crossZone ? unguardedPhysicalPath(model, flow.source, flow.target, adj) : null;
    const via = bypass ? "UNVERIFIED (physical bypass)" : boundaryDevicesFor(model, flow.id, adj).map((id) => assetName(model, id)).join(", ") || "—";
    const protocols = flow.data.protocols.length ? flow.data.protocols : ["TCP/IP"];
    for (const [from, to] of initiators(flow)) {
      const fa = model.assets.get(from)!;
      const ta = model.assets.get(to)!;
      for (const protocol of protocols) {
        const def = getProtocol(protocol);
        let service: string;
        let comment = "";
        if (flow.data.ports) service = flow.data.ports;
        else if (def && def.ports.length) service = def.ports.join(", ");
        else if (def && !def.routable) { service = "L2 / non-IP"; comment = "Not routable: confirm this stays inside one broadcast domain."; }
        else { service = "any"; comment = "Unspecified service: tighten before deployment."; }
        if (def?.insecure && !protocolProtection(protocol, flow.data).secured && flow.crossZone && def.routable) {
          comment = [comment, `Insecure protocol across zones: consider ${def.secureAlternative ?? "DPI / tunnelling"}.`].filter(Boolean).join(" ");
        }
        if (flow.data.direction === "bidirectional") comment = [comment, "Both sides initiate."].filter(Boolean).join(" ");
        if (bypass) comment = [comment, "Physical bypass path detected: boundary enforcement not established."].filter(Boolean).join(" ");
        rows.push({
          no: rows.length + 1,
          edgeId: flow.id,
          sourceId: from,
          source: fa.data.title,
          sourceZone: zoneName(model, fa.zoneId),
          sourceIp: bareIp(fa.data.ip),
          destinationId: to,
          destination: ta.data.title,
          destinationZone: zoneName(model, ta.zoneId),
          destinationIp: bareIp(ta.data.ip),
          protocol,
          service,
          routedVia: via,
          conduit: flow.data.conduit ?? "",
          secured: protocolProtection(protocol, flow.data).secured,
          crossZone: flow.crossZone,
          comment
        });
      }
    }
  }
  return rows;
}

export interface ZoneEntry {
  id: string;
  title: string;
  path: string;
  zoneType: string;
  slt?: SecurityLevel;
  subnet?: string;
  vlan?: string;
  owner?: string;
  assetCount: number;
  criticalCount: number;
  safetyCount: number;
  conduitCount: number;
  assets: string[];
}

export interface ConduitEntry {
  id: string;
  zoneAId?: string;
  zoneBId?: string;
  zoneA: string;
  zoneB: string;
  slt?: SecurityLevel;
  labels: string[];
  flowIds: string[];
  flowCount: number;
  protocols: string[];
  boundaryDevices: string[];
  allProtected: boolean;
  hasInsecure: boolean;
}

const SL_RANK: Record<SecurityLevel, number> = { "SL 1": 1, "SL 2": 2, "SL 3": 3, "SL 4": 4 };

export function buildConduits(model: Model): ConduitEntry[] {
  const adj = adjacency(model);
  const groups = new Map<string, ConduitEntry>();
  for (const flow of model.flows) {
    if (!flow.crossZone) continue;
    const pair = [flow.sourceZoneId ?? "", flow.targetZoneId ?? ""].sort();
    // Explicit conduit identifiers are independent even for the same zone pair.
    // Unlabelled flows are grouped by their endpoints only.
    const explicit = flow.data.conduit?.trim();
    const key = JSON.stringify([pair, explicit ?? null]);
    let entry = groups.get(key);
    if (!entry) {
      const [a, b] = pair.map((z) => (z === "" ? undefined : z));
      const sls = [a, b].map((z) => (z ? model.zones.get(z)?.data.securityLevelTarget : undefined)).filter(Boolean) as SecurityLevel[];
      entry = {
        id: explicit ?? "",
        zoneAId: a, zoneBId: b,
        zoneA: zoneName(model, a), zoneB: zoneName(model, b),
        slt: sls.sort((x, y) => SL_RANK[y] - SL_RANK[x])[0],
        labels: [], flowIds: [], flowCount: 0, protocols: [], boundaryDevices: [], allProtected: true, hasInsecure: false
      };
      groups.set(key, entry);
    }
    entry.flowIds.push(flow.id);
    entry.flowCount++;
    if (flow.data.conduit && !entry.labels.includes(flow.data.conduit)) entry.labels.push(flow.data.conduit);
    for (const p of flow.data.protocols) {
      if (!entry.protocols.includes(p)) entry.protocols.push(p);
      const def = getProtocol(p);
      if (def?.insecure && !protocolProtection(p, flow.data).secured) entry.hasInsecure = true;
    }
    const bypass = unguardedPhysicalPath(model, flow.source, flow.target, adj);
    if (bypass) {
      if (!entry.boundaryDevices.includes("UNVERIFIED (physical bypass)")) entry.boundaryDevices.push("UNVERIFIED (physical bypass)");
    } else {
      for (const id of boundaryDevicesFor(model, flow.id, adj)) {
        const name = assetName(model, id);
        if (!entry.boundaryDevices.includes(name)) entry.boundaryDevices.push(name);
      }
    }
    if (bypass || !flow.data.protocols.length || flow.data.protocols.some((p) => !protocolProtection(p, flow.data).secured)) entry.allProtected = false;
  }
  const list = [...groups.values()].sort((a, b) => a.zoneA.localeCompare(b.zoneA) || a.zoneB.localeCompare(b.zoneB) || a.id.localeCompare(b.id));
  const used = new Set(list.filter((c) => c.id).map((c) => c.id));
  let serial = 1;
  for (const entry of list) {
    if (entry.id) continue;
    let candidate: string;
    do { candidate = `C-${String(serial++).padStart(2, "0")}`; } while (used.has(candidate));
    entry.id = candidate;
    used.add(candidate);
  }
  return list;
}

export function buildZoneRegister(model: Model, conduits = buildConduits(model)): ZoneEntry[] {
  return [...model.zones.values()]
    .map((zone) => {
      const members = zone.assetIds.map((id) => model.assets.get(id)!);
      return {
        id: zone.id,
        title: zone.data.title,
        path: zonePath(model, zone.id),
        zoneType: zone.data.zoneType,
        slt: zone.data.securityLevelTarget,
        subnet: zone.data.subnet,
        vlan: zone.data.vlan,
        owner: zone.data.owner,
        assetCount: members.length,
        criticalCount: members.filter((m) => m.data.criticality === "critical" || m.data.criticality === "high").length,
        safetyCount: members.filter((m) => m.roles.safety).length,
        conduitCount: conduits.filter((c) => c.zoneAId === zone.id || c.zoneBId === zone.id).length,
        assets: members.map((m) => m.data.title)
      };
    })
    .sort((a, b) => a.path.localeCompare(b.path));
}
