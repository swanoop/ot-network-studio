import { useEffect, type ReactNode } from "react";
import { Copy, FilePlus2, Trash2, X } from "lucide-react";
import { TEMPLATES } from "../data/templates";
import type { ProjectMeta } from "../state/storage";

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal__head">
          <h2>{title}</h2>
          <button className="icon-button" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>
        <div className="modal__body">{children}</div>
      </div>
    </div>
  );
}

export function ProjectsDialog({ projects, currentId, description, onDescription, onOpen, onNew, onDuplicate, onDelete, onClose }: {
  projects: ProjectMeta[]; currentId: string; description?: string; onDescription: (v: string) => void;
  onOpen: (id: string) => void; onNew: () => void; onDuplicate: () => void; onDelete: (id: string) => void; onClose: () => void;
}) {
  return (
    <Modal title="Projects" onClose={onClose}>
      <label className="field">
        <span>Current project description (included in the report)</span>
        <textarea value={description ?? ""} onChange={(e) => onDescription(e.target.value)} placeholder="Scope, assumptions, revision…" />
      </label>
      <div className="button-row">
        <button className="primary-button" onClick={onNew}><FilePlus2 size={14} /> New blank project</button>
        <button className="ghost-button" onClick={onDuplicate}><Copy size={14} /> Duplicate current</button>
      </div>
      <p className="muted small">Projects are stored in this browser only. Export JSON to back up or share.</p>
      <ul className="project-list">
        {projects.map((p) => (
          <li key={p.id} className={p.id === currentId ? "current" : ""}>
            <button className="project-list__open" onClick={() => onOpen(p.id)}>
              <strong>{p.name}</strong>
              <small>{p.assets} assets · updated {new Date(p.updatedAt).toLocaleString()}</small>
            </button>
            {p.id === currentId ? <span className="tag">open</span> : (
              <button className="icon-button danger" title="Delete project" onClick={() => { if (window.confirm(`Delete "${p.name}"? This can't be undone.`)) onDelete(p.id); }}>
                <Trash2 size={14} />
              </button>
            )}
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export function TemplatesDialog({ onPick, onClose }: { onPick: (id: string) => void; onClose: () => void }) {
  return (
    <Modal title="Reference architectures" onClose={onClose} wide>
      <p className="muted small">Each template opens as a new project, so your current work isn't touched. They're realistic starting points, not certified designs. Reference designs keep a few genuine findings to discuss.</p>
      <div className="template-grid">
        {TEMPLATES.map((t) => (
          <button key={t.id} className="template-card" onClick={() => onPick(t.id)}>
            <small>{t.sector}</small>
            <strong>{t.name}</strong>
            <p>{t.description}</p>
            <span className="muted small">{t.nodes.filter((n) => n.data.kind === "asset").length} assets · {t.nodes.filter((n) => n.data.kind === "zone").length} zones · {t.edges.length} connections</span>
          </button>
        ))}
      </div>
    </Modal>
  );
}

const SHORTCUTS: Array<[string, string]> = [
  ["Ctrl/⌘ + Z", "Undo"],
  ["Ctrl/⌘ + Shift + Z, Ctrl + Y", "Redo"],
  ["Ctrl/⌘ + C / V", "Copy / paste (works across projects)"],
  ["Ctrl/⌘ + D", "Duplicate selection"],
  ["Ctrl/⌘ + A", "Select all"],
  ["Delete / Backspace", "Delete selection"],
  ["L", "Switch new connections between Flow and Link"],
  ["F", "Fit the diagram to the screen"],
  ["S", "Simulate compromise from the selection"],
  ["Esc", "Clear selection, highlight and simulation"],
  ["1 – 5", "Switch view (Canvas, Inventory, Zones, Matrix, Findings)"],
  ["Shift + drag", "Box-select"],
  ["Alt + drag zone", "Move a zone without its contents"],
  ["?", "This help"]
];

export function HelpDialog({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Shortcuts & concepts" onClose={onClose} wide>
      <div className="help-grid">
        <table className="shortcut-table">
          <tbody>{SHORTCUTS.map(([k, v]) => <tr key={k}><td><kbd>{k}</kbd></td><td>{v}</td></tr>)}</tbody>
        </table>
        <div className="help-notes">
          <h3>Flows vs links</h3>
          <p><b>Flows</b> (dashed, arrowed) are logical communications: who initiates to whom, with which protocol. They drive the rule matrix, conduits and most checks. <b>Links</b> (solid) are physical cables, fibre or radio, with redundancy. A cross-zone flow counts as protected if it ends on, is routed via, or physically passes through a boundary device.</p>
          <h3>Zones</h3>
          <p>Membership comes from placement: an asset belongs to the smallest zone that contains its centre. Zones can be nested, resized and typed (zone, DMZ, safety, external).</p>
          <h3>What-if</h3>
          <p>Switch any connection off in the inspector to see how findings, the score and the attack paths change without deleting it.</p>
          <h3>Compromise simulation</h3>
          <p>Pick one or more assets and simulate. The tool follows every flow they can initiate (and links, in physical mode), hop by hop. Step through the hops, or click a reached asset to see its attack path.</p>
        </div>
      </div>
    </Modal>
  );
}

export interface Toast { id: number; text: string; tone: "info" | "warn" | "error"; details?: string[] }

export function Toasts({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) {
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.tone}`}>
          <div>
            <strong>{t.text}</strong>
            {t.details && t.details.length > 0 && (
              <details><summary>{t.details.length} detail(s)</summary><ul>{t.details.slice(0, 30).map((d, i) => <li key={i}>{d}</li>)}</ul></details>
            )}
          </div>
          <button className="icon-button" onClick={() => onDismiss(t.id)} aria-label="Dismiss"><X size={14} /></button>
        </div>
      ))}
    </div>
  );
}
