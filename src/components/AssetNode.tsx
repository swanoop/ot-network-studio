import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import { Activity, Cpu, Factory, Network, Server, ShieldCheck, Siren, TrainFront, Zap } from "lucide-react";
import type { AssetCategory, AssetData } from "../types";
import { getAssetDefinition } from "../data/catalog";
import { useDesign } from "../state/DesignContext";

const ICONS: Record<AssetCategory, typeof Network> = {
  Network,
  "OT Control": Factory,
  "Safety / SIS": Siren,
  "Field / Process": Activity,
  Rail: TrainFront,
  "Energy / Utilities": Zap,
  Security: ShieldCheck,
  Compute: Cpu,
  Enterprise: Server
};

function AssetNode({ id, data, selected }: NodeProps<AssetData>) {
  const design = useDesign();
  const Icon = ICONS[data.category] ?? Network;
  const def = getAssetDefinition(data.assetType);
  const deco = design.decorations.get(id);
  const sim = design.simulation;
  const hop = sim.active ? sim.hops.get(id) : undefined;
  const isOrigin = sim.active && sim.origins.has(id);
  const reached = hop !== undefined && hop <= sim.step;

  const classes = [
    "asset-node",
    `criticality-${data.criticality}`,
    selected ? "selected" : "",
    design.highlighted.has(id) ? "highlighted" : "",
    sim.active ? (isOrigin ? "sim-origin" : reached ? "sim-reached" : "sim-safe") : "",
    def?.roles?.boundary ? "is-boundary" : "",
    def?.roles?.safety ? "is-safety" : ""
  ].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <Handle type="source" position={Position.Left} id="l" />
      <Handle type="source" position={Position.Right} id="r" />
      <div className="asset-node__head">
        <span className="asset-node__icon"><Icon size={15} /></span>
        <div className="asset-node__title">
          <strong title={data.title}>{data.title}</strong>
          <span>{def?.short ?? data.assetType} · {data.category}</span>
        </div>
        <span className={`status-dot status-${data.status}`} title={`Status: ${data.status}`} />
      </div>
      <div className="asset-node__meta">
        {data.ip && <span>{data.ip}</span>}
        {data.vlan && <span>VLAN {data.vlan}</span>}
        {data.purdueLevel !== undefined && <span>L{data.purdueLevel}</span>}
        {data.slCapability && <span>{data.slCapability.replace(" ", "-")}C</span>}
      </div>
      {data.protocols.length > 0 && (
        <div className="asset-node__protocols">
          {data.protocols.slice(0, 3).map((p) => <span key={p}>{p}</span>)}
          {data.protocols.length > 3 && <span>+{data.protocols.length - 3}</span>}
        </div>
      )}
      {design.showFindingBadges && deco && deco.findings > 0 && !sim.active && (
        <span className={`finding-badge sev-${deco.worst}`} title={`${deco.findings} finding(s)`}>{deco.findings}</span>
      )}
      {sim.active && (isOrigin || reached) && (
        <span className="sim-badge">{isOrigin ? "☠ origin" : `hop ${hop}`}</span>
      )}
    </div>
  );
}

export default memo(AssetNode);
