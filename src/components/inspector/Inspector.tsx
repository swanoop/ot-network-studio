import { ArrowRightLeft, Copy, Crosshair, Trash2, X } from "lucide-react";
import type { AssetData, AssetStatus, Criticality, EdgeData, LinkMedia, ProjectEdge, ProjectNode, Redundancy, ZoneData, ZoneType } from "../../types";
import { ASSET_CATALOG, CATEGORY_ORDER, getAssetDefinition } from "../../data/catalog";
import type { Finding } from "../../engine/rules";
import { zonePath, type Model } from "../../engine/model";
import { FindingList, ProtocolPicker, SelectField, SL_OPTIONS, TextArea, TextField, Toggle } from "./fields";

export interface InspectorProps {
  selectedNodes: ProjectNode[];
  selectedEdges: ProjectEdge[];
  model: Model;
  findings: Finding[];
  onNodeChange: (id: string, patch: Partial<AssetData> | Partial<ZoneData>) => void;
  onEdgeChange: (id: string, patch: Partial<EdgeData>) => void;
  onReverseEdge: (id: string) => void;
  onDelete: (nodeIds: string[], edgeIds: string[]) => void;
  onDuplicate: () => void;
  onSimulate: (origins: string[]) => void;
  onFocusFinding: (f: Finding) => void;
  onBulkAssetChange: (ids: string[], patch: Partial<AssetData>) => void;
  onClose: () => void;
}

const CRITICALITY: Array<{ value: Criticality; label: string }> = [
  { value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "critical", label: "Critical" }
];
const STATUS: Array<{ value: AssetStatus; label: string }> = [
  { value: "online", label: "Online" }, { value: "warning", label: "Warning" }, { value: "offline", label: "Offline" }, { value: "unknown", label: "Unknown" }
];
const ZONE_TYPES: Array<{ value: ZoneType; label: string }> = [
  { value: "zone", label: "Security zone" }, { value: "dmz", label: "DMZ / intermediary" }, { value: "safety", label: "Safety zone" }, { value: "external", label: "External / untrusted" }
];
const MEDIA: Array<{ value: LinkMedia; label: string }> = [
  { value: "copper", label: "Copper" }, { value: "fibre", label: "Fibre" }, { value: "wireless", label: "Wireless" },
  { value: "cellular", label: "Cellular" }, { value: "serial", label: "Serial" }, { value: "backplane", label: "Backplane" }
];
const REDUNDANCY: Array<{ value: Redundancy; label: string }> = [
  { value: "none", label: "None" }, { value: "PRP", label: "PRP (IEC 62439-3)" }, { value: "HSR", label: "HSR (IEC 62439-3)" },
  { value: "MRP", label: "MRP (IEC 62439-2)" }, { value: "RSTP", label: "RSTP" }, { value: "DLR", label: "DLR" }, { value: "LAG", label: "LAG / bonding" }
];

const forElement = (findings: Finding[], id: string) => findings.filter((f) => f.nodeIds.includes(id) || f.edgeIds.includes(id));

export default function Inspector(props: InspectorProps) {
  const { selectedNodes, selectedEdges } = props;
  const total = selectedNodes.length + selectedEdges.length;

  if (total === 0) {
    return (
      <aside className="inspector inspector--empty">
        <div>
          <h2>Inspector</h2>
          <p>Select an asset, zone or connection to edit its engineering data.</p>
          <ul className="tips">
            <li>Drag from a node's edge handle to connect.</li>
            <li>Press <kbd>L</kbd> to switch between drawing <b>flows</b> and <b>links</b>.</li>
            <li>Drop assets inside a zone to put them in it.</li>
            <li><kbd>Shift</kbd>-drag to box-select; <kbd>Alt</kbd>-drag a zone to move it without its contents.</li>
          </ul>
        </div>
      </aside>
    );
  }

  if (total > 1) return <MultiInspector {...props} />;
  if (selectedEdges.length === 1) return <EdgeInspector {...props} edge={selectedEdges[0]} />;
  const node = selectedNodes[0];
  return node.data.kind === "zone"
    ? <ZoneInspector {...props} node={node as ProjectNode<ZoneData>} />
    : <AssetInspector {...props} node={node as ProjectNode<AssetData>} />;
}

function Header({ title, subtitle, onClose }: { title: string; subtitle: string; onClose: () => void }) {
  return (
    <div className="panel-title">
      <div><h2>{title}</h2><span>{subtitle}</span></div>
      <button className="icon-button" onClick={onClose} title="Close (Esc)"><X size={16} /></button>
    </div>
  );
}

function AssetInspector({ node, model, findings, onNodeChange, onDelete, onSimulate, onFocusFinding, onDuplicate, onClose }: InspectorProps & { node: ProjectNode<AssetData> }) {
  const a = node.data;
  const set = (patch: Partial<AssetData>) => onNodeChange(node.id, patch);
  const resolved = model.assets.get(node.id);
  const def = getAssetDefinition(a.assetType);
  const flows = model.allEdges.filter((e) => e.data.kind === "flow" && (e.source === node.id || e.target === node.id)).length;
  const links = model.allEdges.filter((e) => e.data.kind === "link" && (e.source === node.id || e.target === node.id)).length;
  const roles = Object.entries(def?.roles ?? {}).filter(([, v]) => v).map(([k]) => k);

  return (
    <aside className="inspector">
      <Header title="Asset" subtitle={`${def?.label ?? a.assetType} · ${a.category}`} onClose={onClose} />
      <div className="derived">
        <div><span>Zone</span><b>{zonePath(model, resolved?.zoneId)}</b></div>
        <div><span>Connections</span><b>{flows} flow{flows === 1 ? "" : "s"} · {links} link{links === 1 ? "" : "s"}</b></div>
        {roles.length > 0 && <div><span>Roles</span><b>{roles.join(", ")}</b></div>}
      </div>
      <TextField label="Name" value={a.title} onChange={(v) => set({ title: v ?? "" })} />
      <label className="field">
        <span>Asset type</span>
        <select value={a.assetType} onChange={(e) => {
          const d = getAssetDefinition(e.target.value);
          if (d) set({ assetType: d.type, category: d.category });
        }}>
          {CATEGORY_ORDER.map((cat) => (
            <optgroup key={cat} label={cat}>
              {ASSET_CATALOG.filter((x) => x.category === cat).map((x) => <option key={x.type} value={x.type}>{x.label}</option>)}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="two-col">
        <TextField label="IP / CIDR" value={a.ip} onChange={(v) => set({ ip: v })} placeholder="10.10.20.5/24" mono />
        <TextField label="VLAN" value={a.vlan} onChange={(v) => set({ vlan: v })} placeholder="20" mono />
      </div>
      <div className="two-col">
        <label className="field">
          <span>Purdue level</span>
          <select value={a.purdueLevel ?? ""} onChange={(e) => set({ purdueLevel: e.target.value === "" ? undefined : Number(e.target.value) })}>
            <option value="">Unset</option>
            {[0, 1, 2, 3, 4, 5].map((l) => <option key={l} value={l}>Level {l}</option>)}
          </select>
        </label>
        <SelectField label="Criticality" value={a.criticality} options={CRITICALITY} onChange={(v) => set({ criticality: v ?? "medium" })} />
      </div>
      <div className="two-col">
        <SelectField label="SL-C (capability)" value={a.slCapability} options={SL_OPTIONS.map((o) => ({ value: o.value, label: o.value }))} onChange={(v) => set({ slCapability: v })} allowEmpty="Unknown" />
        <SelectField label="Status" value={a.status} options={STATUS} onChange={(v) => set({ status: v ?? "unknown" })} />
      </div>
      <ProtocolPicker value={a.protocols} onChange={(protocols) => set({ protocols })} label="Protocols spoken" />
      <details className="more">
        <summary>Identity & lifecycle</summary>
        <div className="two-col">
          <TextField label="Vendor" value={a.vendor} onChange={(v) => set({ vendor: v })} />
          <TextField label="Model" value={a.model} onChange={(v) => set({ model: v })} />
        </div>
        <div className="two-col">
          <TextField label="Firmware" value={a.firmware} onChange={(v) => set({ firmware: v })} />
          <TextField label="MAC" value={a.mac} onChange={(v) => set({ mac: v })} mono />
        </div>
        <TextField label="Owner" value={a.owner} onChange={(v) => set({ owner: v })} />
      </details>
      <TextArea label="Notes" value={a.notes} onChange={(v) => set({ notes: v })} />
      <h3 className="section-title">Findings</h3>
      <FindingList findings={forElement(findings, node.id)} onFocus={onFocusFinding} />
      <div className="button-row">
        <button className="primary-button" onClick={() => onSimulate([node.id])}><Crosshair size={14} /> Simulate compromise</button>
        <button className="ghost-button" onClick={onDuplicate} title="Duplicate (Ctrl+D)"><Copy size={14} /></button>
        <button className="danger-button" onClick={() => onDelete([node.id], [])} title="Delete"><Trash2 size={14} /></button>
      </div>
    </aside>
  );
}

function ZoneInspector({ node, model, findings, onNodeChange, onDelete, onFocusFinding, onClose }: InspectorProps & { node: ProjectNode<ZoneData> }) {
  const z = node.data;
  const set = (patch: Partial<ZoneData>) => onNodeChange(node.id, patch);
  const resolved = model.zones.get(node.id);
  const members = (resolved?.assetIds ?? []).map((id) => model.assets.get(id)!).filter(Boolean);
  return (
    <aside className="inspector">
      <Header title="Zone" subtitle={zonePath(model, node.id)} onClose={onClose} />
      <TextField label="Zone name" value={z.title} onChange={(v) => set({ title: v ?? "" })} />
      <div className="two-col">
        <SelectField label="Zone type" value={z.zoneType} options={ZONE_TYPES} onChange={(v) => set({ zoneType: v ?? "zone" })} />
        <SelectField label="SL-T (target)" value={z.securityLevelTarget} options={SL_OPTIONS.map((o) => ({ value: o.value, label: o.value }))} onChange={(v) => set({ securityLevelTarget: v })} allowEmpty="Not set" />
      </div>
      {z.securityLevelTarget && <p className="muted small">{SL_OPTIONS.find((o) => o.value === z.securityLevelTarget)?.label}</p>}
      <div className="two-col">
        <TextField label="Subnet" value={z.subnet} onChange={(v) => set({ subnet: v })} placeholder="10.20.0.0/24" mono />
        <TextField label="VLAN" value={z.vlan} onChange={(v) => set({ vlan: v })} mono />
      </div>
      <TextField label="Owner" value={z.owner} onChange={(v) => set({ owner: v })} />
      <TextArea label="Notes / risk assessment summary" value={z.notes} onChange={(v) => set({ notes: v })} />
      <h3 className="section-title">Members ({members.length})</h3>
      <ul className="member-list">
        {members.map((m) => <li key={m.id}><span className={`crit-dot c-${m.data.criticality}`} />{m.data.title}<small>{m.data.ip ?? ""}</small></li>)}
        {members.length === 0 && <li className="muted">Drag assets inside the zone to add them.</li>}
      </ul>
      <h3 className="section-title">Findings</h3>
      <FindingList findings={forElement(findings, node.id)} onFocus={onFocusFinding} />
      <button className="danger-button wide" onClick={() => onDelete([node.id], [])}><Trash2 size={14} /> Delete zone (keeps assets)</button>
    </aside>
  );
}

function EdgeInspector({ edge, model, findings, onEdgeChange, onReverseEdge, onDelete, onFocusFinding, onClose }: InspectorProps & { edge: ProjectEdge }) {
  const d = edge.data!;
  const set = (patch: Partial<EdgeData>) => onEdgeChange(edge.id, patch);
  const resolved = model.allEdges.find((e) => e.id === edge.id);
  const s = model.assets.get(edge.source), t = model.assets.get(edge.target);
  const boundaries = [...model.assets.values()].filter((a) => a.roles.boundary && a.id !== edge.source && a.id !== edge.target);
  const via = d.via ?? [];

  return (
    <aside className="inspector">
      <Header title={d.kind === "flow" ? "Flow" : "Link"} subtitle={`${s?.data.title ?? edge.source} ${d.kind === "flow" ? (d.direction === "bidirectional" ? "⇄" : "→") : "—"} ${t?.data.title ?? edge.target}`} onClose={onClose} />
      <div className="segmented full">
        <button className={d.kind === "flow" ? "active" : ""} onClick={() => set({ kind: "flow", protocols: d.protocols.length ? d.protocols : ["TCP/IP"], media: undefined, redundancy: undefined })}>Logical flow</button>
        <button className={d.kind === "link" ? "active" : ""} onClick={() => set({ kind: "link", direction: "bidirectional", media: d.media ?? "copper", redundancy: d.redundancy ?? "none" })}>Physical link</button>
      </div>
      <div className="derived">
        <div><span>From</span><b>{zonePath(model, s?.zoneId)}</b></div>
        <div><span>To</span><b>{zonePath(model, t?.zoneId)}</b></div>
        {resolved?.crossZone && <div><span>Boundary</span><b className="warn-text">Crosses zones</b></div>}
      </div>
      <Toggle label="Enabled (what-if: switch off to test the design without it)" checked={d.enabled} onChange={(v) => set({ enabled: v })} />

      {d.kind === "flow" ? (
        <>
          <div className="two-col">
            <SelectField label="Direction" value={d.direction} options={[{ value: "forward", label: "Source initiates →" }, { value: "bidirectional", label: "Both initiate ⇄" }]} onChange={(v) => set({ direction: v ?? "forward" })} />
            <label className="field"><span>&nbsp;</span><button className="ghost-button" onClick={() => onReverseEdge(edge.id)}><ArrowRightLeft size={13} /> Reverse</button></label>
          </div>
          <ProtocolPicker value={d.protocols} onChange={(protocols) => set({ protocols })} />
          <div className="two-col">
            <TextField label="Port override" value={d.ports} onChange={(v) => set({ ports: v })} placeholder="tcp/5020" mono />
            <TextField label="Conduit ID" value={d.conduit} onChange={(v) => set({ conduit: v })} placeholder="C-03" />
          </div>
          <div className="field">
            <span>Routed via (boundary devices)</span>
            <div className="chip-row">
              {boundaries.length === 0 && <em className="muted small">No firewalls, diodes or VPN gateways in the design.</em>}
              {boundaries.map((b) => (
                <button key={b.id} className={`chip ${via.includes(b.id) ? "chip-on" : ""}`}
                  onClick={() => set({ via: via.includes(b.id) ? via.filter((x) => x !== b.id) : [...via, b.id] })}>
                  {b.data.title}
                </button>
              ))}
            </div>
          </div>
          <div className="toggles">
            <Toggle label="Encrypted (TLS / IPsec / VPN)" checked={!!d.encrypted} onChange={(v) => set({ encrypted: v || undefined })} />
            <Toggle label="Authenticated (e.g. DNP3-SA, IEC 62351, safety layer)" checked={!!d.authenticated} onChange={(v) => set({ authenticated: v || undefined })} />
          </div>
        </>
      ) : (
        <div className="two-col">
          <SelectField label="Medium" value={d.media} options={MEDIA} onChange={(v) => set({ media: v })} />
          <SelectField label="Redundancy" value={d.redundancy} options={REDUNDANCY} onChange={(v) => set({ redundancy: v })} />
        </div>
      )}
      <TextArea label="Notes" value={d.notes} onChange={(v) => set({ notes: v })} />
      <h3 className="section-title">Findings</h3>
      <FindingList findings={forElement(findings, edge.id)} onFocus={onFocusFinding} />
      <button className="danger-button wide" onClick={() => onDelete([], [edge.id])}><Trash2 size={14} /> Delete {d.kind}</button>
    </aside>
  );
}

function MultiInspector({ selectedNodes, selectedEdges, onDelete, onDuplicate, onSimulate, onBulkAssetChange, onClose }: InspectorProps) {
  const assets = selectedNodes.filter((n) => n.data.kind === "asset");
  const ids = assets.map((a) => a.id);
  return (
    <aside className="inspector">
      <Header title="Selection" subtitle={`${selectedNodes.length} node(s), ${selectedEdges.length} connection(s)`} onClose={onClose} />
      {assets.length > 0 && (
        <>
          <h3 className="section-title">Bulk edit {assets.length} asset(s)</h3>
          <SelectField label="Criticality" options={CRITICALITY} onChange={(v) => v && onBulkAssetChange(ids, { criticality: v })} allowEmpty="— keep —" />
          <SelectField label="Status" options={STATUS} onChange={(v) => v && onBulkAssetChange(ids, { status: v })} allowEmpty="— keep —" />
          <SelectField label="SL-C" options={SL_OPTIONS.map((o) => ({ value: o.value, label: o.value }))} onChange={(v) => v && onBulkAssetChange(ids, { slCapability: v })} allowEmpty="— keep —" />
          <TextField label="Vendor (applies to all)" onChange={(v) => v && onBulkAssetChange(ids, { vendor: v })} />
        </>
      )}
      <div className="button-row">
        {assets.length > 0 && <button className="primary-button" onClick={() => onSimulate(ids)}><Crosshair size={14} /> Simulate from selection</button>}
        <button className="ghost-button" onClick={onDuplicate}><Copy size={14} /> Duplicate</button>
        <button className="danger-button" onClick={() => onDelete(selectedNodes.map((n) => n.id), selectedEdges.map((e) => e.id))}><Trash2 size={14} /></button>
      </div>
    </aside>
  );
}
