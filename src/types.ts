/*
 * Core data model for OT Network Studio (project schema v2).
 *
 * The model is deliberately independent of React Flow so the analysis engine
 * (src/engine) can run in the browser, in tests and in the Node CLI.
 * React Flow's Node/Edge types are structurally compatible with these.
 */

export type AssetCategory =
  | "Network"
  | "OT Control"
  | "Safety / SIS"
  | "Field / Process"
  | "Rail"
  | "Energy / Utilities"
  | "Security"
  | "Compute"
  | "Enterprise";

export type AssetStatus = "online" | "warning" | "offline" | "unknown";
export type Criticality = "low" | "medium" | "high" | "critical";
export type SecurityLevel = "SL 1" | "SL 2" | "SL 3" | "SL 4";

/** Role flags drive the analysis engine. They come from the catalogue. */
export interface AssetRoles {
  /** Enforces policy between zones (firewall, diode, VPN gateway). */
  boundary?: boolean;
  /** Only allows traffic in one direction (data diode). */
  unidirectional?: boolean;
  /** Part of a safety function (SIS, safety PLC, ESD, brake/ATP). */
  safety?: boolean;
  /** Entry point for remote / vendor / external access. */
  remoteEntry?: boolean;
  /** Intermediary for administrative access (jump host, DMZ broker). */
  intermediary?: boolean;
  /** Passive network monitoring (IDS sensor). */
  monitoring?: boolean;
  /** Layer-2/3 infrastructure (switches, routers, APs). */
  infrastructure?: boolean;
}

export interface AssetDefinition {
  type: string;
  label: string;
  short: string;
  category: AssetCategory;
  description: string;
  defaultProtocols?: string[];
  defaultPurdueLevel?: number;
  roles?: AssetRoles;
}

export interface AssetData {
  kind: "asset";
  title: string;
  assetType: string;
  category: AssetCategory;
  status: AssetStatus;
  /** IPv4 address, optionally with prefix: 10.10.20.5 or 10.10.20.5/24 */
  ip?: string;
  vlan?: string;
  mac?: string;
  purdueLevel?: number;
  protocols: string[];
  vendor?: string;
  model?: string;
  firmware?: string;
  /** IEC 62443 SL-C: the security level the component is capable of. */
  slCapability?: SecurityLevel;
  criticality: Criticality;
  owner?: string;
  notes?: string;
}

export type ZoneType = "zone" | "dmz" | "safety" | "external";

export interface ZoneData {
  kind: "zone";
  title: string;
  zoneType: ZoneType;
  securityLevelTarget?: SecurityLevel;
  subnet?: string;
  vlan?: string;
  owner?: string;
  notes?: string;
}

export type DesignerData = AssetData | ZoneData;

/**
 * Flow  = logical communication (who talks to whom, which protocol).
 * Link  = physical / layer-2 connection (cable, fibre, radio, ring).
 */
export type EdgeKind = "flow" | "link";
export type FlowDirection = "forward" | "bidirectional";
export type LinkMedia = "copper" | "fibre" | "wireless" | "serial" | "backplane" | "cellular";
export type Redundancy = "none" | "PRP" | "HSR" | "MRP" | "RSTP" | "DLR" | "LAG";

export interface EdgeData {
  kind: EdgeKind;
  /** Flow: application protocols carried. */
  protocols: string[];
  /** Flow: forward = source initiates to target. */
  direction: FlowDirection;
  /** Flow: explicit port override, e.g. "tcp/5020". */
  ports?: string;
  /** Flow: boundary devices this flow is routed through. */
  via?: string[];
  /** Free-text conduit identifier, e.g. "C-03". */
  conduit?: string;
  encrypted?: boolean;
  authenticated?: boolean;
  /** Link: physical medium and redundancy scheme. */
  media?: LinkMedia;
  redundancy?: Redundancy;
  /** What-if switch: disabled edges are ignored by every analysis. */
  enabled: boolean;
  notes?: string;
}

export interface XY { x: number; y: number }

export interface ProjectNode<T extends DesignerData = DesignerData> {
  id: string;
  type?: string;
  position: XY;
  data: T;
  style?: { width?: number | string; height?: number | string };
  zIndex?: number;
  width?: number | null;
  height?: number | null;
  selected?: boolean;
}

export interface ProjectEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  data?: EdgeData;
  selected?: boolean;
}

export interface ProjectFile {
  schemaVersion: 2;
  name: string;
  description?: string;
  nodes: ProjectNode[];
  edges: ProjectEdge[];
  updatedAt: string;
}

export interface ArchitectureTemplate {
  id: string;
  name: string;
  sector: string;
  description: string;
  nodes: ProjectNode[];
  edges: ProjectEdge[];
}

export function isAsset(node: ProjectNode): node is ProjectNode<AssetData> {
  return node.data?.kind === "asset";
}

export function isZone(node: ProjectNode): node is ProjectNode<ZoneData> {
  return node.data?.kind === "zone";
}
