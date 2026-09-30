import type { DesignerNode, AssetData } from "../types";

export default function Inventory({ nodes, onSelect }:{nodes:DesignerNode[];onSelect:(id:string)=>void}) {
  const assets = nodes.filter((n) => n.data.kind === "asset");
  return (
    <main className="inventory">
      <div className="inventory__heading">
        <div><h1>Asset Inventory</h1><p>{assets.length} modelled assets</p></div>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Category</th><th>IP / CIDR</th><th>VLAN</th><th>Zone</th><th>Purdue</th><th>Criticality</th><th>Protocols</th></tr></thead>
          <tbody>
            {assets.map((node) => {
              const a=node.data as AssetData;
              return (
                <tr key={node.id} onClick={()=>onSelect(node.id)}>
                  <td><strong>{a.title}</strong></td><td>{a.assetType}</td><td>{a.category}</td>
                  <td>{a.ip||"—"}</td><td>{a.vlan||"—"}</td><td>{a.zone||"—"}</td>
                  <td>{a.purdueLevel!==undefined?"L"+a.purdueLevel:"—"}</td>
                  <td><span className={"criticality-pill "+a.criticality}>{a.criticality}</span></td>
                  <td>{a.protocols.join(", ")||"—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
