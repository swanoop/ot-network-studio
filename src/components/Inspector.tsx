import { X } from "lucide-react";
import type { DesignerData, DesignerNode, AssetData, ZoneData } from "../types";
import { PROTOCOLS } from "../data/catalog";

interface Props {
  node: DesignerNode | null;
  onChange: (id: string, patch: Partial<DesignerData>) => void;
  onClose: () => void;
  onDelete: (id: string) => void;
}

export default function Inspector({ node, onChange, onClose, onDelete }: Props) {
  if (!node) {
    return (
      <aside className="inspector inspector--empty">
        <div>
          <h2>Inspector</h2>
          <p>Select an asset or zone to edit its engineering metadata.</p>
        </div>
      </aside>
    );
  }

  const data = node.data;
  const field = (label:string,value:string|number|undefined,key:string,type="text") => (
    <label className="field">
      <span>{label}</span>
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(node.id, {
          [key]: type === "number" && e.target.value !== "" ? Number(e.target.value) : e.target.value
        } as Partial<DesignerData>)}
      />
    </label>
  );

  if (data.kind === "zone") {
    const z = data as ZoneData;
    return (
      <aside className="inspector">
        <div className="panel-title">
          <div><h2>Zone</h2><span>IEC 62443-style grouping</span></div>
          <button onClick={onClose}><X size={16} /></button>
        </div>
        {field("Zone name", z.title, "title")}
        <label className="field">
          <span>Security Level Target</span>
          <select value={z.securityLevelTarget || ""} onChange={(e) => onChange(node.id, { securityLevelTarget: e.target.value || undefined } as Partial<ZoneData>)}>
            <option value="">Not set</option>
            <option value="SL 1">SL 1</option>
            <option value="SL 2">SL 2</option>
            <option value="SL 3">SL 3</option>
            <option value="SL 4">SL 4</option>
          </select>
        </label>
        <label className="field">
          <span>Notes</span>
          <textarea value={z.notes || ""} onChange={(e) => onChange(node.id, { notes: e.target.value } as Partial<ZoneData>)} />
        </label>
        <button className="danger-button" onClick={() => onDelete(node.id)}>Delete zone</button>
      </aside>
    );
  }

  const a = data as AssetData;
  const toggleProtocol = (protocol:string) => onChange(node.id, {
    protocols: a.protocols.includes(protocol) ? a.protocols.filter((p) => p !== protocol) : [...a.protocols, protocol]
  } as Partial<AssetData>);

  return (
    <aside className="inspector">
      <div className="panel-title">
        <div><h2>Asset Inspector</h2><span>{a.category}</span></div>
        <button onClick={onClose}><X size={16} /></button>
      </div>
      {field("Name", a.title, "title")}
      <div className="two-col">
        {field("IP / CIDR", a.ip, "ip")}
        {field("VLAN", a.vlan, "vlan")}
      </div>
      {field("Zone", a.zone, "zone")}
      <div className="two-col">
        {field("Vendor", a.vendor, "vendor")}
        {field("Model", a.model, "model")}
      </div>
      <div className="two-col">
        <label className="field">
          <span>Purdue level</span>
          <select value={a.purdueLevel ?? ""} onChange={(e) => onChange(node.id, { purdueLevel: e.target.value === "" ? undefined : Number(e.target.value) } as Partial<AssetData>)}>
            <option value="">Unset</option>
            {[0,1,2,3,4,5].map((level) => <option key={level} value={level}>Level {level}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Criticality</span>
          <select value={a.criticality} onChange={(e) => onChange(node.id, { criticality: e.target.value } as Partial<AssetData>)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </label>
      </div>
      <div className="field">
        <span>Protocols</span>
        <div className="protocol-picker">
          {PROTOCOLS.map((protocol) => (
            <button key={protocol} className={a.protocols.includes(protocol) ? "active" : ""} onClick={() => toggleProtocol(protocol)}>
              {protocol}
            </button>
          ))}
        </div>
      </div>
      <label className="field">
        <span>Notes</span>
        <textarea value={a.notes || ""} onChange={(e) => onChange(node.id, { notes: e.target.value } as Partial<AssetData>)} />
      </label>
      <button className="danger-button" onClick={() => onDelete(node.id)}>Delete asset</button>
    </aside>
  );
}
