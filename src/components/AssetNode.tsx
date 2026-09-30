import { Handle, Position, type NodeProps } from "reactflow";
import { Activity, Cpu, Factory, Network, Server, ShieldCheck, Siren } from "lucide-react";
import type { AssetData } from "../types";

const icons = {
  Network,
  "OT Control": Factory,
  "Safety / SIS": Siren,
  "Field / Process": Activity,
  Security: ShieldCheck,
  Compute: Cpu,
  Enterprise: Server
};

export default function AssetNode({ data, selected }: NodeProps<AssetData>) {
  const Icon = icons[data.category] || Network;
  return (
    <div className={"asset-node " + (selected ? "selected " : "") + "criticality-" + data.criticality}>
      <Handle type="target" position={Position.Top} />
      <div className="asset-node__head">
        <span className="asset-node__icon"><Icon size={15} /></span>
        <div>
          <strong>{data.title}</strong>
          <span>{data.category}</span>
        </div>
      </div>
      <div className="asset-node__meta">
        {data.ip && <span>{data.ip}</span>}
        {data.vlan && <span>VLAN {data.vlan}</span>}
        {data.purdueLevel !== undefined && <span>L{data.purdueLevel}</span>}
      </div>
      {data.protocols.length > 0 && (
        <div className="asset-node__protocols">
          {data.protocols.slice(0, 3).map((p) => <span key={p}>{p}</span>)}
        </div>
      )}
      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}
