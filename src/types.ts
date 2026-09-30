import type { Edge, Node } from "reactflow";

export type AssetCategory =
  | "Network"
  | "OT Control"
  | "Safety / SIS"
  | "Field / Process"
  | "Security"
  | "Compute"
  | "Enterprise";

export type AssetStatus = "online" | "warning" | "offline" | "unknown";
export type Criticality = "low" | "medium" | "high" | "critical";

export interface AssetDefinition {
  type: string;
  label: string;
  short: string;
  category: AssetCategory;
  description: string;
  defaultProtocols?: string[];
  defaultPurdueLevel?: number;
}

export interface AssetData {
  kind: "asset";
  title: string;
  assetType: string;
  category: AssetCategory;
  status: AssetStatus;
  ip?: string;
  subnet?: string;
  vlan?: string;
  zone?: string;
  purdueLevel?: number;
  protocols: string[];
  vendor?: string;
  model?: string;
  criticality: Criticality;
  notes?: string;
}

export interface ZoneData {
  kind: "zone";
  title: string;
  zoneType: "iec62443" | "dmz" | "purdue";
  securityLevelTarget?: "SL 1" | "SL 2" | "SL 3" | "SL 4";
  notes?: string;
}

export type DesignerData = AssetData | ZoneData;
export type DesignerNode = Node<DesignerData>;
export type DesignerEdge = Edge<{ protocols?: string[]; conduit?: string }>;

export interface ProjectFile {
  schemaVersion: 1;
  name: string;
  nodes: DesignerNode[];
  edges: DesignerEdge[];
  updatedAt: string;
}

export interface ArchitectureTemplate {
  id: string;
  name: string;
  description: string;
  nodes: DesignerNode[];
  edges: DesignerEdge[];
}
