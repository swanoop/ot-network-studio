import { useRef } from "react";
import {
  Box, Download, FileJson, FolderOpen, ImageDown, Keyboard, Layers3, LayoutTemplate, ListChecks, Moon, Redo2, Route, ShieldAlert, Sun, Table2, Undo2, Upload
} from "lucide-react";
import Menu from "./Menu";

export type View = "canvas" | "inventory" | "zones" | "matrix" | "findings";

interface Props {
  projectName: string;
  onProjectNameChange: (v: string) => void;
  saveState: "saved" | "saving" | "error";
  view: View;
  onViewChange: (v: View) => void;
  findingCount: number;
  worstSeverity?: string;
  score: number;
  theme: "dark" | "light";
  onThemeToggle: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenProjects: () => void;
  onOpenTemplates: () => void;
  onOpenHelp: () => void;
  onImport: (file: File) => void;
  exports: {
    json: () => void; png: () => void; svg: () => void; report: () => void;
    inventoryCsv: () => void; matrixCsv: () => void; conduitsCsv: () => void; zonesCsv: () => void; findingsCsv: () => void;
  };
}

const VIEWS: Array<{ id: View; label: string; icon: typeof Box }> = [
  { id: "canvas", label: "Canvas", icon: Box },
  { id: "inventory", label: "Inventory", icon: Table2 },
  { id: "zones", label: "Zones & Conduits", icon: Layers3 },
  { id: "matrix", label: "Rule Matrix", icon: Route },
  { id: "findings", label: "Findings", icon: ShieldAlert }
];

export default function Toolbar(p: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand__mark"><Layers3 size={18} /></span>
        <div><strong>OT Network Studio</strong><small>Industrial architecture designer</small></div>
      </div>
      <div className="toolbar__divider" />
      <button className="tool-button" onClick={p.onOpenProjects} title="Projects"><FolderOpen size={16} /></button>
      <input className="project-name" value={p.projectName} onChange={(e) => p.onProjectNameChange(e.target.value)} aria-label="Project name" />
      <span className={`save-state ${p.saveState}`}>{p.saveState === "saved" ? "Saved" : p.saveState === "saving" ? "Saving…" : "Not saved: storage full or blocked"}</span>
      <div className="toolbar__spacer" />
      <nav className="segmented" aria-label="Views">
        {VIEWS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={p.view === id ? "active" : ""} onClick={() => p.onViewChange(id)} title={label}>
            <Icon size={14} /><span>{label}</span>
            {id === "findings" && p.findingCount > 0 && <em className={`count sev-${p.worstSeverity}`}>{p.findingCount}</em>}
          </button>
        ))}
      </nav>
      <span className={`score-pill ${p.score >= 80 ? "good" : p.score >= 50 ? "fair" : "poor"}`} title="Design posture score (indicative): drops with each finding, weighted by severity">
        <ListChecks size={13} /> {p.score}
      </span>
      <div className="toolbar__divider" />
      <button className="tool-button" onClick={p.onUndo} disabled={!p.canUndo} title="Undo (Ctrl+Z)"><Undo2 size={16} /></button>
      <button className="tool-button" onClick={p.onRedo} disabled={!p.canRedo} title="Redo (Ctrl+Shift+Z)"><Redo2 size={16} /></button>
      <button className="tool-button" onClick={p.onOpenTemplates} title="Reference architectures"><LayoutTemplate size={16} /><span>Templates</span></button>
      <Menu title="Export" trigger={<><Download size={16} /><span>Export</span></>} items={[
        { label: "Project (JSON)", hint: ".otns.json", icon: <FileJson size={14} />, onSelect: p.exports.json },
        { label: "Diagram (PNG)", hint: "whole design", icon: <ImageDown size={14} />, onSelect: p.exports.png },
        { label: "Diagram (SVG)", hint: "vector", icon: <ImageDown size={14} />, onSelect: p.exports.svg },
        { label: "Design report (Markdown)", hint: "findings, registers, matrix", onSelect: p.exports.report, separatorBefore: true },
        { label: "Firewall rule matrix (CSV)", onSelect: p.exports.matrixCsv },
        { label: "Conduit register (CSV)", onSelect: p.exports.conduitsCsv },
        { label: "Zone register (CSV)", onSelect: p.exports.zonesCsv },
        { label: "Asset inventory (CSV)", onSelect: p.exports.inventoryCsv },
        { label: "Findings (CSV)", onSelect: p.exports.findingsCsv }
      ]} />
      <button className="tool-button" onClick={() => fileRef.current?.click()} title="Import project (JSON, v1 or v2)"><Upload size={16} /></button>
      <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) p.onImport(f); e.currentTarget.value = ""; }} />
      <button className="tool-button" onClick={p.onOpenHelp} title="Keyboard shortcuts (?)"><Keyboard size={16} /></button>
      <button className="tool-button" onClick={p.onThemeToggle} title="Toggle theme">{p.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}</button>
    </header>
  );
}
