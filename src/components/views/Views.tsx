import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import type { Analysis } from "../../engine/exporters";
import type { ResolvedAsset } from "../../engine/model";
import { zonePath } from "../../engine/model";
import type { ConduitEntry, RuleRow, ZoneEntry } from "../../engine/matrix";
import { RULES, SEVERITY_ORDER, countBySeverity, type Finding, type RuleCategory, type Severity } from "../../engine/rules";
import { CATEGORY_ORDER } from "../../data/catalog";
import DataTable, { type Column } from "./DataTable";

function Heading({ title, subtitle, onExport, exportLabel = "Export CSV", children }: { title: string; subtitle: string; onExport?: () => void; exportLabel?: string; children?: React.ReactNode }) {
  return (
    <div className="view__heading">
      <div><h1>{title}</h1><p>{subtitle}</p></div>
      <div className="view__actions">
        {children}
        {onExport && <button className="ghost-button" onClick={onExport}><Download size={14} /> {exportLabel}</button>}
      </div>
    </div>
  );
}

// ---------------- Inventory ----------------
export function InventoryView({ analysis, onSelect, onExport }: { analysis: Analysis; onSelect: (id: string) => void; onExport: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [zone, setZone] = useState("");
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of analysis.findings) for (const id of f.nodeIds) m.set(id, (m.get(id) ?? 0) + 1);
    return m;
  }, [analysis.findings]);
  const model = analysis.model;
  const rows = [...model.assets.values()].filter((a) => {
    const q = query.trim().toLowerCase();
    const text = `${a.data.title} ${a.data.assetType} ${a.data.ip ?? ""} ${a.data.vendor ?? ""} ${a.data.model ?? ""} ${a.data.protocols.join(" ")}`.toLowerCase();
    return (!q || text.includes(q)) && (!category || a.data.category === category) && (!zone || (zone === "__none" ? !a.zoneId : a.zoneId === zone));
  });
  const columns: Column<ResolvedAsset>[] = [
    { key: "name", header: "Name", value: (a) => a.data.title, render: (a) => <strong>{a.data.title}</strong> },
    { key: "type", header: "Type", value: (a) => a.data.assetType },
    { key: "zone", header: "Zone", value: (a) => zonePath(model, a.zoneId) },
    { key: "ip", header: "IP / CIDR", value: (a) => a.data.ip, render: (a) => <span className="mono">{a.data.ip ?? "—"}</span> },
    { key: "vlan", header: "VLAN", value: (a) => a.data.vlan },
    { key: "purdue", header: "Purdue", value: (a) => a.data.purdueLevel, render: (a) => (a.data.purdueLevel !== undefined ? `L${a.data.purdueLevel}` : "—") },
    { key: "crit", header: "Criticality", value: (a) => ["low", "medium", "high", "critical"].indexOf(a.data.criticality), render: (a) => <span className={`criticality-pill ${a.data.criticality}`}>{a.data.criticality}</span> },
    { key: "slc", header: "SL-C", value: (a) => a.data.slCapability },
    { key: "vendor", header: "Vendor / model", value: (a) => [a.data.vendor, a.data.model].filter(Boolean).join(" ") || undefined },
    { key: "protocols", header: "Protocols", value: (a) => a.data.protocols.join(", ") || undefined },
    { key: "findings", header: "Findings", value: (a) => counts.get(a.id) ?? 0, render: (a) => (counts.get(a.id) ? <span className="count-badge">{counts.get(a.id)}</span> : "—") }
  ];
  return (
    <main className="view">
      <Heading title="Asset inventory" subtitle={`${rows.length} of ${model.assets.size} assets · click a row to show it on the canvas`} onExport={onExport}>
        <input className="filter-input" placeholder="Filter name, IP, vendor, protocol…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <select className="filter-input" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {CATEGORY_ORDER.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="filter-input" value={zone} onChange={(e) => setZone(e.target.value)}>
          <option value="">All zones</option>
          {[...model.zones.values()].map((z) => <option key={z.id} value={z.id}>{z.data.title}</option>)}
          <option value="__none">Unzoned</option>
        </select>
      </Heading>
      <DataTable rows={rows} columns={columns} rowKey={(a) => a.id} onRowClick={(a) => onSelect(a.id)} empty="No assets match." />
    </main>
  );
}

// ---------------- Zones & conduits ----------------
export function ZonesView({ analysis, onSelect, onSelectEdges, onExportZones, onExportConduits }: {
  analysis: Analysis; onSelect: (id: string) => void; onSelectEdges: (ids: string[]) => void; onExportZones: () => void; onExportConduits: () => void;
}) {
  const zoneCols: Column<ZoneEntry>[] = [
    { key: "zone", header: "Zone", value: (z) => z.path, render: (z) => <strong>{z.path}</strong> },
    { key: "type", header: "Type", value: (z) => z.zoneType, render: (z) => <span className={`zone-tag zone-${z.zoneType}`}>{z.zoneType}</span> },
    { key: "slt", header: "SL-T", value: (z) => z.slt },
    { key: "subnet", header: "Subnet", value: (z) => z.subnet, render: (z) => <span className="mono">{z.subnet ?? "—"}</span> },
    { key: "vlan", header: "VLAN", value: (z) => z.vlan },
    { key: "assets", header: "Assets", value: (z) => z.assetCount },
    { key: "crit", header: "High/critical", value: (z) => z.criticalCount },
    { key: "safety", header: "Safety", value: (z) => z.safetyCount },
    { key: "conduits", header: "Conduits", value: (z) => z.conduitCount },
    { key: "owner", header: "Owner", value: (z) => z.owner }
  ];
  const conduitCols: Column<ConduitEntry>[] = [
    { key: "id", header: "Conduit", value: (c) => c.id, render: (c) => <strong>{c.id}</strong> },
    { key: "between", header: "Between", value: (c) => `${c.zoneA} ↔ ${c.zoneB}` },
    { key: "slt", header: "SL-T (max)", value: (c) => c.slt },
    { key: "flows", header: "Flows", value: (c) => c.flowCount },
    { key: "protocols", header: "Protocols", value: (c) => c.protocols.join(", ") },
    { key: "boundary", header: "Boundary devices", value: (c) => c.boundaryDevices.join(", ") || undefined, render: (c) => c.boundaryDevices.length ? c.boundaryDevices.join(", ") : <span className="danger-text">none</span> },
    { key: "prot", header: "Protection", value: (c) => (c.allProtected ? 2 : c.hasInsecure ? 0 : 1), render: (c) => c.allProtected ? <span className="ok-text">all encrypted/authenticated</span> : c.hasInsecure ? <span className="warn-text">insecure protocols</span> : "partial" },
    { key: "labels", header: "Labels", value: (c) => c.labels.join(", ") || undefined }
  ];
  return (
    <main className="view">
      <Heading title="Zone register" subtitle="IEC 62443-3-2 style zone list, derived from the canvas" onExport={onExportZones} />
      <DataTable rows={analysis.zones} columns={zoneCols} rowKey={(z) => z.id} onRowClick={(z) => onSelect(z.id)} empty="No zones yet. Drag a zone onto the canvas." />
      <div className="spacer-24" />
      <Heading title="Conduit register" subtitle="Cross-zone flows grouped by zone pair · click a row to highlight its flows" onExport={onExportConduits} />
      <DataTable rows={analysis.conduits} columns={conduitCols} rowKey={(c) => c.id} onRowClick={(c) => onSelectEdges(c.flowIds)} empty="No cross-zone flows yet." />
    </main>
  );
}

// ---------------- Rule matrix ----------------
export function MatrixView({ analysis, onSelectEdge, onExport }: { analysis: Analysis; onSelectEdge: (id: string) => void; onExport: (rows: RuleRow[]) => void }) {
  const [crossOnly, setCrossOnly] = useState(true);
  const [query, setQuery] = useState("");
  const rows = analysis.matrix.filter((r) => (!crossOnly || r.crossZone) &&
    (!query || `${r.source} ${r.destination} ${r.protocol} ${r.service} ${r.sourceZone} ${r.destinationZone} ${r.sourceIp} ${r.destinationIp}`.toLowerCase().includes(query.toLowerCase())));
  const cols: Column<RuleRow>[] = [
    { key: "no", header: "#", value: (r) => r.no, width: "40px" },
    { key: "src", header: "Source", value: (r) => r.source, render: (r) => <><strong>{r.source}</strong><small className="sub">{r.sourceZone}</small></> },
    { key: "srcip", header: "Source IP", value: (r) => r.sourceIp, render: (r) => <span className="mono">{r.sourceIp}</span> },
    { key: "dst", header: "Destination", value: (r) => r.destination, render: (r) => <><strong>{r.destination}</strong><small className="sub">{r.destinationZone}</small></> },
    { key: "dstip", header: "Destination IP", value: (r) => r.destinationIp, render: (r) => <span className="mono">{r.destinationIp}</span> },
    { key: "proto", header: "Protocol", value: (r) => r.protocol },
    { key: "svc", header: "Service", value: (r) => r.service, render: (r) => <span className="mono">{r.service}</span> },
    { key: "action", header: "Action", value: () => "ALLOW", render: () => <span className="ok-text">ALLOW</span> },
    { key: "via", header: "Enforced at", value: (r) => r.routedVia },
    { key: "sec", header: "Secured", value: (r) => (r.secured ? 1 : 0), render: (r) => (r.secured ? <span className="ok-text">yes</span> : <span className="warn-text">no</span>) },
    { key: "comment", header: "Comment", value: (r) => r.comment || undefined, render: (r) => <small>{r.comment || "—"}</small> }
  ];
  return (
    <main className="view">
      <Heading title="Firewall rule matrix" subtitle={`${rows.length} allow rule(s) from the modelled flows · implicit DENY ALL for everything else`} onExport={() => onExport(rows)}>
        <input className="filter-input" placeholder="Filter…" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="toggle"><input type="checkbox" checked={crossOnly} onChange={(e) => setCrossOnly(e.target.checked)} /><span>Cross-zone only</span></label>
      </Heading>
      <DataTable rows={rows} columns={cols} rowKey={(r) => `${r.no}`} onRowClick={(r) => onSelectEdge(r.edgeId)} empty="No flows. Draw flows between assets to generate rules." />
    </main>
  );
}

// ---------------- Findings ----------------
export function FindingsView({ analysis, onFocus, onExport }: { analysis: Analysis; onFocus: (f: Finding) => void; onExport: () => void }) {
  const [category, setCategory] = useState<RuleCategory | "">("");
  const [showRules, setShowRules] = useState(false);
  const counts = countBySeverity(analysis.findings);
  const findings = analysis.findings.filter((f) => !category || f.category === category);
  const categories = [...new Set(RULES.map((r) => r.category))];
  return (
    <main className="view">
      <Heading title="Design findings" subtitle={`${analysis.findings.length} finding(s) from ${RULES.length} rules · posture score ${analysis.score}/100 (indicative)`} onExport={onExport}>
        <select className="filter-input" value={category} onChange={(e) => setCategory(e.target.value as RuleCategory | "")}>
          <option value="">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button className="ghost-button" onClick={() => setShowRules((v) => !v)}>{showRules ? "Hide" : "Show"} rule catalogue</button>
      </Heading>
      <div className="severity-cards">
        {SEVERITY_ORDER.map((s: Severity) => (
          <div key={s} className={`severity-card sev-border-${s}`}><span className={`sev-pill sev-${s}`}>{s}</span><b>{counts[s]}</b></div>
        ))}
      </div>
      {showRules && (
        <div className="rule-catalogue">
          {RULES.map((r) => (
            <div key={r.id} className="rule-card">
              <div><span className={`sev-pill sev-${r.severity}`}>{r.severity}</span> <strong>{r.id} · {r.title}</strong> <small className="muted">{r.category}</small></div>
              <p>{r.description}</p>
              <p className="muted small">Fix: {r.recommendation}</p>
              {r.references.length > 0 && <p className="muted small">Refs: {r.references.join(" · ")}</p>}
            </div>
          ))}
        </div>
      )}
      <ul className="finding-list large">
        {findings.map((f) => (
          <li key={f.id} className={`sev-border-${f.severity}`} onClick={() => onFocus(f)}>
            <span className={`sev-pill sev-${f.severity}`}>{f.severity}</span>
            <div>
              <strong>{f.ruleId} · {f.title}</strong> <small className="muted">{f.category}</small>
              <p>{f.message}</p>
              <p className="muted small">Fix: {f.recommendation}</p>
              {f.references.length > 0 && <p className="muted small">Refs: {f.references.join(" · ")}</p>}
            </div>
          </li>
        ))}
        {findings.length === 0 && <li className="muted">✓ No findings{category ? " in this category" : ""}.</li>}
      </ul>
      <p className="muted small disclaimer">Automated design checks against the modelled metadata. They support, but don't replace, an IEC 62443-3-2 risk assessment, a safety case or a compliance determination.</p>
    </main>
  );
}
