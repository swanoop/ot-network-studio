import type { NodeProps } from "reactflow";
import type { ZoneData } from "../types";

export default function ZoneNode({ data, selected }: NodeProps<ZoneData>) {
  return (
    <div className={"zone-node " + (selected ? "selected" : "")}>
      <div className="zone-node__title">
        <strong>{data.title}</strong>
        {data.securityLevelTarget && <span>{data.securityLevelTarget}</span>}
      </div>
      {data.notes && <small>{data.notes}</small>}
    </div>
  );
}
