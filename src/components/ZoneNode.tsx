import { memo } from "react";
import { NodeResizer, type NodeProps } from "reactflow";
import type { ZoneData } from "../types";
import { useDesign } from "../state/DesignContext";

const TYPE_LABEL: Record<ZoneData["zoneType"], string> = {
  zone: "Zone",
  dmz: "DMZ",
  safety: "Safety",
  external: "External"
};

function ZoneNode({ id, data, selected }: NodeProps<ZoneData>) {
  const design = useDesign();
  const count = design.zoneAssetCounts.get(id) ?? 0;
  const deco = design.decorations.get(id);
  const classes = [
    "zone-node",
    `zone-${data.zoneType}`,
    selected ? "selected" : "",
    design.highlighted.has(id) ? "highlighted" : ""
  ].filter(Boolean).join(" ");

  return (
    <>
      <NodeResizer isVisible={selected} minWidth={200} minHeight={120} lineClassName="zone-resizer-line" handleClassName="zone-resizer-handle" />
      <div className={classes}>
        <div className="zone-node__title">
          <span className="zone-node__type">{TYPE_LABEL[data.zoneType]}</span>
          <strong>{data.title}</strong>
          {data.securityLevelTarget && <span className="zone-node__sl">SL-T {data.securityLevelTarget.replace("SL ", "")}</span>}
          {data.subnet && <span className="zone-node__chip">{data.subnet}</span>}
          {data.vlan && <span className="zone-node__chip">VLAN {data.vlan}</span>}
          <span className="zone-node__count">{count} asset{count === 1 ? "" : "s"}</span>
          {design.showFindingBadges && deco && deco.findings > 0 && (
            <span className={`finding-badge inline sev-${deco.worst}`}>{deco.findings}</span>
          )}
        </div>
        {data.notes && <small>{data.notes}</small>}
      </div>
    </>
  );
}

export default memo(ZoneNode);
