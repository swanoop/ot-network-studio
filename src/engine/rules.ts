/*
 * Design rule engine.
 *
 * Every rule is a pure function of the resolved model. Findings point to
 * nodes/edges so the UI can highlight them. References are indicative
 * pointers to the relevant clauses, not a compliance determination.
 */
import { getProtocol, protocolProtection } from "../data/protocols";
import type { SecurityLevel } from "../types";
import { assetName, ipInSubnet, parseIPv4, rectsOverlap, zoneName, type Model, type ResolvedAsset, type ResolvedEdge } from "./model";

export type Severity = "critical" | "high" | "medium" | "low" | "info";
export const SEVERITY_ORDER: Severity[] = ["critical", "high", "medium", "low", "info"];

export type RuleCategory =
  | "Segmentation" | "Safety" | "Remote access" | "Protocols" | "Addressing" | "Monitoring" | "Resilience" | "Model hygiene";

export interface RuleDefinition {
  id: string;
  title: string;
  category: RuleCategory;
  severity: Severity;
  description: string;
  recommendation: string;
  references: string[];
}

export interface Finding {
  id: string;
  ruleId: string;
  severity: Severity;
  category: RuleCategory;
  title: string;
  message: string;
  recommendation: string;
  references: string[];
  nodeIds: string[];
  edgeIds: string[];
}

export const RULES: RuleDefinition[] = [
  { id: "SEG-001", title: "Cross-zone flow bypasses a conduit", category: "Segmentation", severity: "high",
    description: "A flow connects assets in different zones but does not terminate on, or route via, a boundary device (firewall, data diode, VPN gateway).",
    recommendation: "Route the flow through a boundary device: connect it to the firewall, add the firewall under 'Routed via', or model the physical links through it.",
    references: ["IEC 62443-3-3 SR 5.1, SR 5.2", "IEC 62443-3-2 ZCR 3", "NIST SP 800-82r3 §5.2"] },
  { id: "SEG-002", title: "Enterprise talks directly to control level", category: "Segmentation", severity: "high",
    description: "A flow connects Purdue level 4/5 directly with level 0–2 without a boundary device at either end.",
    recommendation: "Break the path at the industrial DMZ (level 3.5) using a broker, replica or jump host.",
    references: ["IEC 62443-3-3 SR 5.1", "NIST SP 800-82r3 §5.2.2 (DMZ)"] },
  { id: "SEG-003", title: "Enterprise ↔ operations without a DMZ", category: "Segmentation", severity: "medium",
    description: "A flow connects level 4/5 with level 3 directly, with no DMZ intermediary or boundary device.",
    recommendation: "Terminate enterprise connections in the industrial DMZ (historian replica, broker, jump host).",
    references: ["NIST SP 800-82r3 §5.2.2", "IEC 62443-3-2 ZCR 3.4"] },
  { id: "SEG-004", title: "Asset outside any zone", category: "Segmentation", severity: "medium",
    description: "The asset is not placed inside a zone on the canvas, so no security requirements apply to it.",
    recommendation: "Drag the asset into the zone it belongs to, or create a zone for it.",
    references: ["IEC 62443-3-2 ZCR 3.1"] },
  { id: "SEG-005", title: "Zone has no Security Level Target", category: "Segmentation", severity: "low",
    description: "The zone has no SL-T, so countermeasures can't be sized.",
    recommendation: "Set an SL-T from the zone risk assessment.",
    references: ["IEC 62443-3-2 ZCR 5"] },
  { id: "SEG-006", title: "Overlapping zones", category: "Model hygiene", severity: "low",
    description: "Two zones overlap without one fully containing the other, so membership is ambiguous.",
    recommendation: "Resize the zones so they either nest cleanly or don't overlap.",
    references: ["IEC 62443-3-2 ZCR 3.2"] },
  { id: "SEG-007", title: "Flow from lower-SL zone into higher-SL zone", category: "Segmentation", severity: "low",
    description: "A zone with a lower SL-T initiates communication into a zone with a higher SL-T.",
    recommendation: "Make sure the conduit enforces the higher zone's requirements (whitelisting, authentication, DPI).",
    references: ["IEC 62443-3-2 ZCR 3.3", "IEC 62443-3-3 SR 5.2"] },
  { id: "SAF-001", title: "Safety system shares a zone with non-safety assets", category: "Safety", severity: "medium",
    description: "A safety-related asset is in the same zone as basic control or IT assets.",
    recommendation: "Put safety systems (SIS, safety PLCs, SIL-rated rail systems) in a dedicated safety zone.",
    references: ["IEC 62443-3-2 ZCR 3.3 (safety-related assets)", "IEC 61511-1 §11.2.4", "CLC/TS 50701 §6"] },
  { id: "SAF-002", title: "Safety system reachable from enterprise or external", category: "Safety", severity: "critical",
    description: "A safety-related asset has a direct flow to level 4/5 or an external/remote entry point.",
    recommendation: "Remove the flow. Safety data leaving the safety zone should go through a data diode or read-only gateway.",
    references: ["IEC 61511-1 §11.2.4", "IEC 62443-3-3 SR 5.1"] },
  { id: "SAF-003", title: "Non-safety system initiates communication to a safety system", category: "Safety", severity: "medium",
    description: "A non-safety asset can start a session with a safety-related asset.",
    recommendation: "Make the flow read-only or one-way from the safety system, or enforce write protection (key switch, CIP Safety, SIL-rated gateway).",
    references: ["IEC 61511-1 §11.2.4", "IEC 62443-3-3 SR 3.1"] },
  { id: "SAF-004", title: "Wireless link to safety system or SL 3+ zone", category: "Safety", severity: "medium",
    description: "A wireless link touches a safety-related asset or a zone with SL-T 3 or higher.",
    recommendation: "Use wired links for safety functions, or justify the wireless link with a dedicated risk assessment and strong link-layer security.",
    references: ["IEC 62443-3-3 SR 1.6, SR 5.1", "IEC 61511-1 §11.2.4"] },
  { id: "RA-001", title: "Remote entry point reaches OT directly", category: "Remote access", severity: "high",
    description: "An external or remote-entry asset (VPN, cloud, vendor, internet, cellular router) initiates a flow straight to an OT asset, without a jump host or DMZ.",
    recommendation: "Terminate remote sessions on a jump host or managed remote-access broker in the DMZ, with MFA, session recording and time-bound approval.",
    references: ["IEC 62443-3-3 SR 1.13", "NCSC CAF B2.c", "NIST SP 800-82r3 §6.2"] },
  { id: "RA-002", title: "Control-level asset connects out to an external service", category: "Remote access", severity: "medium",
    description: "A level 0–2 asset initiates a connection directly to an external or remote-entry asset.",
    recommendation: "Publish data outward through a DMZ broker, or use a data diode for one-way telemetry.",
    references: ["IEC 62443-3-3 SR 5.1", "NIST SP 800-82r3 §5.2"] },
  { id: "PRO-001", title: "Insecure protocol crosses a zone boundary", category: "Protocols", severity: "medium",
    description: "A protocol with no built-in authentication or encryption is carried between zones and the flow isn't marked as protected.",
    recommendation: "Use the secure variant, wrap it in a tunnel (IPsec/TLS), or enforce DPI with read-only function codes at the conduit.",
    references: ["IEC 62443-3-3 SR 3.1, SR 4.1", "IEC 62351"] },
  { id: "PRO-002", title: "Non-routable protocol across zones", category: "Protocols", severity: "medium",
    description: "A layer-2 or fieldbus protocol (GOOSE, SV, PROFINET RT, MVB, CAN…) is modelled between different zones without a gateway.",
    recommendation: "Either the zone boundary is drawn in the wrong place, or a gateway is missing. Fix the model so the protocol stays within its broadcast domain.",
    references: ["IEC 61850-90-4", "IEC 61375", "IEC 62443-3-2 ZCR 3"] },
  { id: "PRO-003", title: "Clear-text management protocol", category: "Protocols", severity: "medium",
    description: "Telnet, HTTP, FTP or SNMPv1/v2c is used, so credentials travel in clear text.",
    recommendation: "Switch to SSH, HTTPS, SFTP or SNMPv3 (authPriv) and disable the insecure service on the device.",
    references: ["IEC 62443-3-3 SR 1.5, SR 4.1", "IEC 62443-4-2 CR 4.1"] },
  { id: "PRO-004", title: "Bidirectional flow through a data diode", category: "Protocols", severity: "high",
    description: "A flow through a unidirectional gateway is modelled as bidirectional, which a diode can't carry.",
    recommendation: "Make the flow one-way, from the higher-trust side outward.",
    references: ["IEC 62443-3-3 SR 5.1 RE 3"] },
  { id: "PRO-005", title: "Cross-zone flow with unspecified protocol", category: "Model hygiene", severity: "low",
    description: "A cross-zone flow is generic TCP/IP or has no protocol, so no firewall rule can be derived.",
    recommendation: "Pick the actual application protocol(s), or set explicit ports.",
    references: ["IEC 62443-3-2 ZCR 3.4"] },
  { id: "PRO-006", title: "Unknown protocol", category: "Model hygiene", severity: "info",
    description: "A protocol isn't in the knowledge base, so ports and security properties are unknown.",
    recommendation: "Set explicit ports on the flow, or add the protocol to src/data/protocols.ts.",
    references: [] },
  { id: "ADR-001", title: "Duplicate IP address", category: "Addressing", severity: "high",
    description: "Two or more assets share the same IPv4 address.",
    recommendation: "Give each interface a unique address.",
    references: [] },
  { id: "ADR-002", title: "Invalid IP address", category: "Addressing", severity: "medium",
    description: "The IP / CIDR field isn't a valid IPv4 address.",
    recommendation: "Use the form 10.10.20.5 or 10.10.20.5/24.",
    references: [] },
  { id: "ADR-003", title: "IP outside the zone subnet", category: "Addressing", severity: "medium",
    description: "The asset's address isn't inside the subnet assigned to its zone.",
    recommendation: "Re-address the asset, or move it to the correct zone.",
    references: ["IEC 62443-3-3 SR 5.1"] },
  { id: "ADR-004", title: "VLAN differs from zone VLAN", category: "Addressing", severity: "low",
    description: "The asset's VLAN differs from the VLAN assigned to its zone.",
    recommendation: "Check whether the asset is in the right zone, or document why it uses another VLAN.",
    references: [] },
  { id: "MON-001", title: "Critical zone without network monitoring", category: "Monitoring", severity: "medium",
    description: "A zone with high or critical assets has no IDS sensor inside it or connected to it.",
    recommendation: "Add a passive OT IDS sensor fed from a SPAN or TAP in this zone.",
    references: ["IEC 62443-3-3 SR 6.2", "NCSC CAF C1"] },
  { id: "CAP-001", title: "Component SL-C below zone SL-T", category: "Segmentation", severity: "medium",
    description: "The asset's security level capability is lower than the target of its zone.",
    recommendation: "Add compensating countermeasures at zone level, or select a component certified to the required SL-C (IEC 62443-4-2).",
    references: ["IEC 62443-3-3 §4", "IEC 62443-4-2"] },
  { id: "RES-001", title: "Critical asset lacks distinct physical connections", category: "Resilience", severity: "medium",
    description: "A critical asset has fewer than two independent adjacent connections; protocol labels do not create extra physical paths.",
    recommendation: "Document two distinct physical links and independent upstream paths, or a valid link aggregation arrangement.",
    references: ["IEC 62443-3-3 SR 7.6", "IEC 62439"] },
  { id: "RES-002", title: "Redundancy topology does not match selected protocol", category: "Resilience", severity: "medium",
    description: "A redundancy protocol is declared without its minimum physical topology (ring, separate PRP attachments, or parallel LAG links).",
    recommendation: "Model the required independent links or ring and confirm domain independence and failover behaviour during engineering verification.",
    references: ["IEC 62439", "IEC 62443-3-3 SR 7.6"] },
  { id: "HYG-001", title: "Unconnected asset", category: "Model hygiene", severity: "info",
    description: "The asset has no flows or links.",
    recommendation: "Model its communications, or remove it if it's out of scope.",
    references: [] },
  { id: "HYG-002", title: "Empty zone", category: "Model hygiene", severity: "info",
    description: "The zone contains no assets.",
    recommendation: "Add assets or delete the zone.",
    references: [] },
  { id: "HYG-003", title: "'Routed via' references a non-boundary device", category: "Model hygiene", severity: "low",
    description: "A flow lists a device under 'Routed via' that doesn't exist or isn't a boundary device.",
    recommendation: "Pick a firewall, data diode or VPN gateway.",
    references: [] }
];

const RULE_BY_ID = new Map(RULES.map((r) => [r.id, r]));
const SL_RANK: Record<SecurityLevel, number> = { "SL 1": 1, "SL 2": 2, "SL 3": 3, "SL 4": 4 };
const GATEWAY_TYPES = new Set(["protocol-gateway", "serial-gateway", "mvb-gateway", "iiot-gateway", "redbox", "etbn", "train-gateway"]);

/** Who can initiate on this flow: [initiator, responder] pairs. */
export function initiators(edge: ResolvedEdge): Array<[string, string]> {
  return edge.data.direction === "bidirectional"
    ? [[edge.source, edge.target], [edge.target, edge.source]]
    : [[edge.source, edge.target]];
}

function linkAdjacency(model: Model): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  for (const l of model.links) {
    if (!adj.has(l.source)) adj.set(l.source, []);
    if (!adj.has(l.target)) adj.set(l.target, []);
    adj.get(l.source)!.push(l.target);
    adj.get(l.target)!.push(l.source);
  }
  return adj;
}

/** Shortest physical path between two assets (inclusive), or null. */
export function physicalPath(adj: Map<string, string[]>, from: string, to: string): string[] | null {
  if (!adj.has(from) || !adj.has(to)) return null;
  const prev = new Map<string, string | null>([[from, null]]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift()!;
    if (cur === to) break;
    for (const next of adj.get(cur) ?? []) {
      if (!prev.has(next)) { prev.set(next, cur); queue.push(next); }
    }
  }
  if (!prev.has(to)) return null;
  const path: string[] = [];
  for (let c: string | null = to; c !== null; c = prev.get(c) ?? null) path.unshift(c);
  return path;
}

/** Find a bypass path after removing all policy-enforcing boundary nodes.
 * This checks the graph for *any* bypass, rather than trusting its shortest path.
 * If the physical network is modelled, its links take precedence over 'via' text.
 */
export function unguardedPhysicalPath(model: Model, from: string, to: string, adj = linkAdjacency(model)): string[] | null {
  const open = new Map<string, string[]>();
  for (const [id, neighbours] of adj) {
    if (model.assets.get(id)?.roles.boundary) continue;
    open.set(id, neighbours.filter((next) => !model.assets.get(next)?.roles.boundary));
  }
  return physicalPath(open, from, to);
}

export function flowHasConduit(model: Model, edge: ResolvedEdge, adj = linkAdjacency(model)): boolean {
  const s = model.assets.get(edge.source)!;
  const t = model.assets.get(edge.target)!;
  if (s.roles.boundary || t.roles.boundary) return true;
  const physical = physicalPath(adj, edge.source, edge.target);
  if (physical) {
    // A parallel path around a firewall makes this conduit ineffective.
    return unguardedPhysicalPath(model, edge.source, edge.target, adj) === null;
  }
  // Where the physical network is not yet modelled, explicit routing metadata
  // can document an intended conduit. This is an assertion, not proof.
  return (edge.data.via ?? []).some((id) => model.assets.get(id)?.roles.boundary);
}

const level = (a: ResolvedAsset) => a.data.purdueLevel;
const isRemote = (model: Model, a: ResolvedAsset) =>
  (!!a.roles.remoteEntry && !a.roles.intermediary) || (!!a.zoneId && model.zones.get(a.zoneId)?.data.zoneType === "external");
const inDmz = (model: Model, a: ResolvedAsset) => !!a.zoneId && model.zones.get(a.zoneId)?.data.zoneType === "dmz";
const isPassThrough = (a: ResolvedAsset) => !!(a.roles.infrastructure || a.roles.monitoring);

export function runRules(model: Model): Finding[] {
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const adj = linkAdjacency(model);

  const add = (ruleId: string, key: string, message: string, nodeIds: string[] = [], edgeIds: string[] = [], severity?: Severity) => {
    const rule = RULE_BY_ID.get(ruleId)!;
    const id = `${ruleId}:${key}`;
    if (seen.has(id)) return;
    seen.add(id);
    findings.push({
      id, ruleId, severity: severity ?? rule.severity, category: rule.category, title: rule.title, message,
      recommendation: rule.recommendation, references: rule.references, nodeIds, edgeIds
    });
  };

  const A = (id: string) => assetName(model, id);
  const Z = (id?: string) => zoneName(model, id);
  const assets = [...model.assets.values()];
  const zones = [...model.zones.values()];

  // ---- Zones ----
  if (assets.length > 0 && zones.length === 0) {
    add("SEG-004", "no-zones", "No zones are defined. Every asset is unzoned.", assets.map((a) => a.id));
  }
  for (const zone of zones) {
    if (!zone.data.securityLevelTarget && zone.data.zoneType !== "external") add("SEG-005", zone.id, `Zone "${zone.data.title}" has no SL-T.`, [zone.id]);
    if (zone.assetIds.length === 0) add("HYG-002", zone.id, `Zone "${zone.data.title}" has no assets.`, [zone.id]);
  }
  for (let i = 0; i < zones.length; i++) {
    for (let j = i + 1; j < zones.length; j++) {
      const a = zones[i], b = zones[j];
      const nested = a.parentId === b.id || b.parentId === a.id || isAncestor(model, a.id, b.id) || isAncestor(model, b.id, a.id);
      if (!nested && rectsOverlap(a.rect, b.rect)) {
        add("SEG-006", [a.id, b.id].sort().join("+"), `Zones "${a.data.title}" and "${b.data.title}" partly overlap.`, [a.id, b.id]);
      }
    }
  }

  // ---- Assets ----
  const ipOwners = new Map<number, string[]>();
  for (const a of assets) {
    if (zones.length > 0 && !a.zoneId) add("SEG-004", a.id, `"${a.data.title}" isn't inside any zone.`, [a.id]);

    if (a.data.ip) {
      const ip = parseIPv4(a.data.ip);
      if (!ip) add("ADR-002", a.id, `"${a.data.title}" has an invalid address "${a.data.ip}".`, [a.id]);
      else {
        ipOwners.set(ip.address, [...(ipOwners.get(ip.address) ?? []), a.id]);
        const zone = a.zoneId ? model.zones.get(a.zoneId) : undefined;
        const subnet = parseIPv4(zone?.data.subnet);
        if (zone && subnet && !a.roles.boundary && !a.roles.infrastructure && !ipInSubnet(ip, subnet)) {
          add("ADR-003", a.id, `"${a.data.title}" (${a.data.ip}) is outside ${zone.data.title}'s subnet ${zone.data.subnet}.`, [a.id, zone.id]);
        }
      }
    }

    const zone = a.zoneId ? model.zones.get(a.zoneId) : undefined;
    if (zone?.data.vlan && a.data.vlan && zone.data.vlan !== a.data.vlan && !a.roles.boundary && !a.roles.infrastructure) {
      add("ADR-004", a.id, `"${a.data.title}" is on VLAN ${a.data.vlan} but ${zone.data.title} uses VLAN ${zone.data.vlan}.`, [a.id, zone.id]);
    }

    if (zone?.data.securityLevelTarget && a.data.slCapability) {
      const gap = SL_RANK[zone.data.securityLevelTarget] - SL_RANK[a.data.slCapability];
      if (gap > 0) add("CAP-001", a.id, `"${a.data.title}" is ${a.data.slCapability}-capable in an ${zone.data.securityLevelTarget} zone (${zone.data.title}).`, [a.id], [], gap >= 2 ? "high" : "medium");
    }

    for (const p of a.data.protocols) {
      const def = getProtocol(p);
      if (!def) add("PRO-006", `asset:${a.id}:${p}`, `"${a.data.title}" uses "${p}", which isn't in the protocol knowledge base.`, [a.id]);
      else if (def.cleartextManagement) add("PRO-003", `asset:${a.id}:${p}`, `"${a.data.title}" exposes ${p}.${def.secureAlternative ? ` Use ${def.secureAlternative} instead.` : ""}`, [a.id], [], "low");
    }

    const connected = model.allEdges.some((e) => e.source === a.id || e.target === a.id);
    if (!connected) add("HYG-001", a.id, `"${a.data.title}" has no connections.`, [a.id]);
  }
  for (const [address, owners] of ipOwners) {
    if (owners.length > 1) {
      const ip = [(address >>> 24) & 255, (address >>> 16) & 255, (address >>> 8) & 255, address & 255].join(".");
      add("ADR-001", ip, `${ip} is used by ${owners.map(A).join(", ")}.`, owners);
    }
  }

  // ---- Safety zoning ----
  for (const zone of zones) {
    const members = zone.assetIds.map((id) => model.assets.get(id)!);
    const safety = members.filter((m) => m.roles.safety);
    const others = members.filter((m) => !m.roles.safety && !m.roles.boundary && !isPassThrough(m));
    if (safety.length && others.length) {
      add("SAF-001", zone.id, `${zone.data.title} mixes safety assets (${safety.map((s) => s.data.title).join(", ")}) with ${others.map((o) => o.data.title).join(", ")}.`, [zone.id, ...safety.map((s) => s.id)]);
    }
  }

  // ---- Monitoring ----
  const idsIds = assets.filter((a) => a.roles.monitoring).map((a) => a.id);
  for (const zone of zones) {
    const members = zone.assetIds.map((id) => model.assets.get(id)!);
    const important = members.filter((m) => m.data.criticality === "high" || m.data.criticality === "critical");
    if (!important.length || zone.data.zoneType === "external") continue;
    const memberSet = new Set(zone.assetIds);
    const covered = members.some((m) => m.roles.monitoring) ||
      model.allEdges.some((e) => e.data.enabled && ((idsIds.includes(e.source) && memberSet.has(e.target)) || (idsIds.includes(e.target) && memberSet.has(e.source))));
    if (!covered) add("MON-001", zone.id, `${zone.data.title} holds ${important.length} high/critical asset(s) but has no IDS coverage.`, [zone.id, ...important.map((m) => m.id)]);
  }

  // ---- Resilience ----
  if (model.links.length > 0) {
    for (const a of assets) {
      if (a.data.criticality !== "critical") continue;
      const links = model.links.filter((l) => l.source === a.id || l.target === a.id);
      const peers = new Set(links.map((l) => l.source === a.id ? l.target : l.source));
      const lag = links.length >= 2 && links.every((l) => l.data.redundancy === "LAG") && peers.size === 1;
      if (links.length < 2 || (peers.size < 2 && !lag)) {
        add("RES-001", a.id, `"${a.data.title}" lacks two independent physical attachments (found ${links.length} link(s) to ${peers.size} peer(s)).`, [a.id], links.map((l) => l.id));
      }
      const schemes = new Set(links.map((l) => l.data.redundancy).filter((r): r is NonNullable<ResolvedEdge["data"]["redundancy"]> => !!r && r !== "none"));
      for (const scheme of schemes) {
        const matching = links.filter((l) => l.data.redundancy === scheme);
        let valid = false;
        if (scheme === "PRP") {
          valid = matching.length >= 2 && new Set(matching.map((l) => l.source === a.id ? l.target : l.source)).size >= 2;
        } else if (scheme === "LAG") {
          valid = matching.length >= 2 && new Set(matching.map((l) => l.source === a.id ? l.target : l.source)).size === 1;
        } else {
          // Ring/reconvergence designs need a cycle using links declared with
          // that scheme; removing an attached link must leave another route.
          valid = matching.length >= 2 && matching.every((l) => {
            const others = model.links.filter((other) => other.id !== l.id && other.data.redundancy === scheme);
            const ringAdj = new Map<string, string[]>();
            for (const x of others) {
              ringAdj.set(x.source, [...(ringAdj.get(x.source) ?? []), x.target]);
              ringAdj.set(x.target, [...(ringAdj.get(x.target) ?? []), x.source]);
            }
            return physicalPath(ringAdj, l.source, l.target) !== null;
          });
        }
        if (!valid) add("RES-002", `${a.id}:${scheme}`, `"${a.data.title}" declares ${scheme}, but the model does not show the required independent topology.`, [a.id], matching.map((l) => l.id));
      }
    }
  }

  // ---- Links ----
  for (const l of model.links) {
    if (l.data.media !== "wireless") continue;
    const s = model.assets.get(l.source)!, t = model.assets.get(l.target)!;
    const highZone = [s.zoneId, t.zoneId].some((z) => { const sl = z ? model.zones.get(z)?.data.securityLevelTarget : undefined; return !!sl && SL_RANK[sl] >= 3; });
    if (s.roles.safety || t.roles.safety || highZone) add("SAF-004", l.id, `Wireless link ${A(l.source)} ↔ ${A(l.target)}.`, [l.source, l.target], [l.id]);
  }

  // ---- Flows ----
  for (const f of model.flows) {
    const s = model.assets.get(f.source)!;
    const t = model.assets.get(f.target)!;
    const label = `${A(f.source)} → ${A(f.target)}`;
    const ends = [f.source, f.target];
    const protocols = f.data.protocols;

    for (const viaId of f.data.via ?? []) {
      const via = model.assets.get(viaId);
      if (!via || !via.roles.boundary) add("HYG-003", `${f.id}:${viaId}`, `${label} lists "${via?.data.title ?? viaId}" under 'Routed via', but it isn't a boundary device.`, ends, [f.id]);
    }

    const hasConduit = flowHasConduit(model, f, adj);
    const protectedConduit = protocols.length > 0 && protocols.every((p) => protocolProtection(p, f.data).secured) && hasConduit;

    // Segmentation
    if (f.crossZone && !hasConduit) {
      const bypass = unguardedPhysicalPath(model, f.source, f.target, adj);
      const detail = bypass ? `A physical path bypasses all boundary devices: ${bypass.map(A).join(" → ")}.` : "No verified boundary device is on the route.";
      add("SEG-001", f.id, `${label} crosses ${Z(f.sourceZoneId)} → ${Z(f.targetZoneId)}. ${detail}`, [...new Set([...ends, ...(bypass ?? [])])], [f.id]);
    }
    const ls = level(s), lt = level(t);
    if (ls !== undefined && lt !== undefined && !s.roles.boundary && !t.roles.boundary) {
      const hi = Math.max(ls, lt), lo = Math.min(ls, lt);
      if (hi >= 4 && lo <= 2) {
        const lowAsset = ls <= 2 ? s : t;
        const sev: Severity = protectedConduit ? "low" : hasConduit ? "medium" : lowAsset.roles.safety ? "critical" : "high";
        add("SEG-002", f.id, `${label} links L${ls} and L${lt}${hasConduit ? " through a conduit but without a DMZ break" : " directly"}.`, ends, [f.id], sev);
      } else if (hi >= 4 && lo === 3) {
        const brokered = s.roles.intermediary || t.roles.intermediary || inDmz(model, s) || inDmz(model, t);
        if (!brokered) add("SEG-003", f.id, `${label} links L${ls} and L${lt} without a DMZ intermediary.`, ends, [f.id]);
      }
    }
    if (f.crossZone && f.sourceZoneId && f.targetZoneId) {
      for (const [from, to] of initiators(f)) {
        const fz = model.zones.get(model.assets.get(from)!.zoneId!)?.data.securityLevelTarget;
        const tz = model.zones.get(model.assets.get(to)!.zoneId!)?.data.securityLevelTarget;
        if (fz && tz && SL_RANK[fz] < SL_RANK[tz]) {
          add("SEG-007", `${f.id}:${from}`, `${A(from)} (${fz}) initiates into ${A(to)} (${tz}).`, [from, to], [f.id]);
        }
      }
    }

    // Safety
    for (const [safe, other] of [[s, t], [t, s]] as const) {
      if (!safe.roles.safety) continue;
      // A safety protocol between two safety systems (e.g. EuroRadio) is a designed interface.
      if (other.roles.safety && f.data.authenticated) continue;
      if ((other.data.purdueLevel ?? 0) >= 4 || isRemote(model, other)) {
        add("SAF-002", f.id, `Safety asset "${safe.data.title}" has a flow with "${other.data.title}".`, ends, [f.id]);
      }
    }
    for (const [from, to] of initiators(f)) {
      const fa = model.assets.get(from)!, ta = model.assets.get(to)!;
      if (ta.roles.safety && !fa.roles.safety && !isPassThrough(fa) && !fa.roles.boundary) {
        add("SAF-003", `${f.id}:${from}`, `"${fa.data.title}" can initiate to safety asset "${ta.data.title}".`, [from, to], [f.id]);
      }
    }

    // Remote access
    for (const [from, to] of initiators(f)) {
      const fa = model.assets.get(from)!, ta = model.assets.get(to)!;
      const tl = ta.data.purdueLevel;
      // Authorised ETCS radio safety sessions are not vendor remote access.
      const designedSafetySession = fa.roles.safety && ta.roles.safety && f.data.authenticated === true &&
        f.data.protocols.includes("Subset-037 (EuroRadio)");
      if (isRemote(model, fa) && tl !== undefined && tl <= 3 && !designedSafetySession && !ta.roles.boundary && !ta.roles.intermediary && !ta.roles.remoteEntry && !inDmz(model, ta)) {
        add("RA-001", `${f.id}:${from}`, `"${fa.data.title}" initiates directly to "${ta.data.title}" (L${tl}).`, [from, to], [f.id], protectedConduit ? "low" : tl <= 1 || ta.roles.safety ? "critical" : "high");
      }
      const fl = fa.data.purdueLevel;
      if (fl !== undefined && fl <= 2 && isRemote(model, ta) && !fa.roles.boundary && !isPassThrough(fa) && !protectedConduit) {
        add("RA-002", `${f.id}:${from}`, `"${fa.data.title}" (L${fl}) connects out to "${ta.data.title}".`, [from, to], [f.id]);
      }
    }

    // Protocols
    const defs = protocols.map((p) => ({ name: p, def: getProtocol(p) }));
    for (const { name, def } of defs) {
      if (!def) add("PRO-006", `edge:${f.id}:${name}`, `${label} carries "${name}", which isn't in the protocol knowledge base.`, ends, [f.id]);
      else if (def.cleartextManagement) add("PRO-003", `edge:${f.id}:${name}`, `${label} uses ${name}.${def.secureAlternative ? ` Use ${def.secureAlternative} instead.` : ""}`, ends, [f.id]);
    }
    if (f.crossZone) {
      const insecure = defs.filter((d) => d.def?.insecure && d.def.routable && !protocolProtection(d.name, f.data).secured).map((d) => d.name);
      if (insecure.length) {
        const sls = [f.sourceZoneId, f.targetZoneId].map((z) => (z ? model.zones.get(z)?.data.securityLevelTarget : undefined)).filter(Boolean) as SecurityLevel[];
        const high = sls.some((sl) => SL_RANK[sl] >= 3);
        const oneWay = f.data.direction === "forward" &&
          (s.roles.unidirectional || t.roles.unidirectional || (f.data.via ?? []).some((id) => model.assets.get(id)?.roles.unidirectional));
        const sev: Severity = oneWay ? "low" : high ? "high" : "medium";
        add("PRO-001", f.id, `${label} carries ${insecure.join(", ")} between ${Z(f.sourceZoneId)} and ${Z(f.targetZoneId)}${oneWay ? " (one-way through a diode)" : ""}.`, ends, [f.id], sev);
      }
      const nonRoutable = defs.filter((d) => d.def && !d.def.routable).map((d) => d.name);
      const gateway = GATEWAY_TYPES.has(s.data.assetType) || GATEWAY_TYPES.has(t.data.assetType);
      if (nonRoutable.length && !gateway) {
        add("PRO-002", f.id, `${label} carries ${nonRoutable.join(", ")} between ${Z(f.sourceZoneId)} and ${Z(f.targetZoneId)}.`, ends, [f.id]);
      }
      const generic = protocols.length === 0 || protocols.every((p) => p === "TCP/IP");
      if (generic && !f.data.ports) add("PRO-005", f.id, `${label} has no specific protocol or ports.`, ends, [f.id]);
    }
    const viaDiode = (f.data.via ?? []).some((id) => model.assets.get(id)?.roles.unidirectional);
    if (f.data.direction === "bidirectional" && (s.roles.unidirectional || t.roles.unidirectional || viaDiode)) {
      add("PRO-004", f.id, `${label} is bidirectional through a data diode.`, ends, [f.id]);
    }
  }

  const rank = (s: Severity) => SEVERITY_ORDER.indexOf(s);
  return findings.sort((a, b) => rank(a.severity) - rank(b.severity) || a.ruleId.localeCompare(b.ruleId) || a.message.localeCompare(b.message));
}

function isAncestor(model: Model, ancestorId: string, zoneId: string): boolean {
  let cur = model.zones.get(zoneId)?.parentId;
  const guard = new Set<string>();
  while (cur && !guard.has(cur)) {
    if (cur === ancestorId) return true;
    guard.add(cur);
    cur = model.zones.get(cur)?.parentId;
  }
  return false;
}

export function countBySeverity(findings: Finding[]): Record<Severity, number> {
  const out: Record<Severity, number> = { critical: 0, high: 0, medium: 0, low: 0, info: 0 };
  for (const f of findings) out[f.severity]++;
  return out;
}

/** 0–100 design posture score. Indicative only: weights findings by severity. */
export function postureScore(findings: Finding[]): number {
  const weights: Record<Severity, number> = { critical: 20, high: 10, medium: 4, low: 1, info: 0 };
  const penalty = findings.reduce((sum, f) => sum + weights[f.severity], 0);
  return Math.round(100 * Math.exp(-penalty / 80));
}
