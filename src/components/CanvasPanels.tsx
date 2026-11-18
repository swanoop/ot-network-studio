import { useState } from "react";
import { Cable, ChevronDown, ChevronUp, Crosshair, Eye, EyeOff, Route, Square } from "lucide-react";
import type { EdgeKind } from "../types";
import type { Finding, Severity } from "../engine/rules";
import { SEVERITY_ORDER } from "../engine/rules";
import type { SimulationOptions, SimulationResult } from "../engine/simulate";
import { attackPath } from "../engine/simulate";
import type { Model } from "../engine/model";

export interface LayerState { flows: boolean; links: boolean; badges: boolean }

export function CanvasControls({ connectKind, onConnectKind, layers, onLayers }: {
  connectKind: EdgeKind; onConnectKind: (k: EdgeKind) => void; layers: LayerState; onLayers: (l: LayerState) => void;
}) {
  return (
    <div className="canvas-controls">
      <div className="canvas-controls__group" title="What a new connection creates (press L to toggle)">
        <span>Draw</span>
        <div className="segmented small">
          <button className={connectKind === "flow" ? "active" : ""} onClick={() => onConnectKind("flow")}><Route size={12} />Flow</button>
          <button className={connectKind === "link" ? "active" : ""} onClick={() => onConnectKind("link")}><Cable size={12} />Link</button>
        </div>
      </div>
      <div className="canvas-controls__group">
        <span>Show</span>
        <button className={`toggle-chip ${layers.flows ? "on" : ""}`} onClick={() => onLayers({ ...layers, flows: !layers.flows })}>{layers.flows ? <Eye size={12} /> : <EyeOff size={12} />}Flows</button>
        <button className={`toggle-chip ${layers.links ? "on" : ""}`} onClick={() => onLayers({ ...layers, links: !layers.links })}>{layers.links ? <Eye size={12} /> : <EyeOff size={12} />}Links</button>
        <button className={`toggle-chip ${layers.badges ? "on" : ""}`} onClick={() => onLayers({ ...layers, badges: !layers.badges })}>{layers.badges ? <Eye size={12} /> : <EyeOff size={12} />}Findings</button>
      </div>
    </div>
  );
}

export function FindingsDrawer({ findings, focusedId, onFocus }: { findings: Finding[]; focusedId: string | null; onFocus: (f: Finding) => void }) {
  const [open, setOpen] = useState(false);
  const [min, setMin] = useState<Severity>("low");
  const visible = findings.filter((f) => SEVERITY_ORDER.indexOf(f.severity) <= SEVERITY_ORDER.indexOf(min));
  const counts = SEVERITY_ORDER.map((s) => [s, findings.filter((f) => f.severity === s).length] as const);
  return (
    <div className={`findings-drawer ${open ? "open" : ""}`}>
      <button className="findings-drawer__bar" onClick={() => setOpen((v) => !v)}>
        <strong>Design checks</strong>
        {counts.map(([s, c]) => c > 0 && <span key={s} className={`sev-pill sev-${s}`}>{c} {s}</span>)}
        {findings.length === 0 && <span className="ok-line">✓ No findings</span>}
        <span className="spacer" />
        {open ? <ChevronDown size={14} /> : <ChevronUp size={14} />}
      </button>
      {open && (
        <div className="findings-drawer__body">
          <div className="filter-row">
            <span className="muted small">Show</span>
            {(["critical", "high", "medium", "low", "info"] as Severity[]).map((s) => (
              <button key={s} className={`toggle-chip ${min === s ? "on" : ""}`} onClick={() => setMin(s)}>{s}+</button>
            ))}
          </div>
          <ul className="finding-list">
            {visible.map((f) => (
              <li key={f.id} className={`sev-border-${f.severity} ${focusedId === f.id ? "focused" : ""}`} onClick={() => onFocus(f)}>
                <span className={`sev-pill sev-${f.severity}`}>{f.severity}</span>
                <div><strong>{f.ruleId} · {f.title}</strong><p>{f.message}</p></div>
              </li>
            ))}
            {visible.length === 0 && <li className="muted">Nothing at this level.</li>}
          </ul>
        </div>
      )}
    </div>
  );
}

export function SimulationBar({ model, result, options, step, focusId, onOptions, onStep, onStop }: {
  model: Model; result: SimulationResult; options: SimulationOptions; step: number; focusId: string | null;
  onOptions: (o: SimulationOptions) => void; onStep: (s: number) => void; onStop: () => void;
}) {
  const name = (id: string) => model.assets.get(id)?.data.title ?? id;
  const shownStep = Math.min(step, result.maxHop);
  const reachedNow = result.reached.filter((id) => result.hops.get(id)! <= shownStep);
  const path = focusId && result.hops.has(focusId) ? attackPath(result, focusId) : [];
  return (
    <div className="sim-bar">
      <div className="sim-bar__row">
        <Crosshair size={14} className="danger-text" />
        <strong>Compromise of {result.origins.map(name).join(", ")}</strong>
        <div className="segmented small">
          {(["logical", "physical", "combined"] as const).map((m) => (
            <button key={m} className={options.mode === m ? "active" : ""} onClick={() => onOptions({ ...options, mode: m })}>{m}</button>
          ))}
        </div>
        <label className="toggle small" title="Treat firewalls, diodes and VPN gateways as holding: they are reached but not pivoted through">
          <input type="checkbox" checked={options.boundaryHolds} onChange={(e) => onOptions({ ...options, boundaryHolds: e.target.checked })} />
          <span>Boundaries hold</span>
        </label>
        <button className="ghost-button" onClick={onStop}><Square size={12} /> Stop</button>
      </div>
      <div className="sim-bar__row">
        <span className="muted small">Hop</span>
        <input type="range" min={0} max={Math.max(result.maxHop, 0)} value={shownStep} onChange={(e) => onStep(Number(e.target.value))} />
        <span className="mono small">{shownStep}/{result.maxHop}</span>
        <span className="stat"><b>{reachedNow.length}</b> reached</span>
        <span className="stat danger-text"><b>{reachedNow.filter((id) => result.criticalReached.includes(id)).length}</b> critical</span>
        <span className="stat danger-text"><b>{reachedNow.filter((id) => result.safetyReached.includes(id)).length}</b> safety</span>
        <span className="stat"><b>{result.zonesReached.length}</b> zones touched</span>
      </div>
      {path.length > 1 ? (
        <div className="sim-bar__path"><span className="muted small">Attack path:</span> {path.map(name).join("  →  ")}</div>
      ) : (
        <div className="sim-bar__path muted small">Click a highlighted asset to see how it's reached.</div>
      )}
    </div>
  );
}
