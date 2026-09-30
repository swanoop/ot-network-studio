import { useRef } from "react";
import { Box, FileJson, ImageDown, Layers3, Moon, RotateCcw, Sun, Table2, Upload } from "lucide-react";
import { TEMPLATES } from "../data/templates";

interface Props {
  projectName:string;
  onProjectNameChange:(v:string)=>void;
  saved:boolean;
  view:"canvas"|"inventory";
  onViewChange:(v:"canvas"|"inventory")=>void;
  theme:"dark"|"light";
  onThemeToggle:()=>void;
  onAddZone:()=>void;
  onTemplate:(id:string)=>void;
  onExportJson:()=>void;
  onExportPng:()=>void;
  onImport:(f:File)=>void;
  onReset:()=>void;
}

export default function Toolbar(p:Props) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <header className="toolbar">
      <div className="brand">
        <span className="brand__mark"><Layers3 size={18}/></span>
        <div><strong>OT Network Studio</strong><small>Industrial architecture designer</small></div>
      </div>
      <div className="toolbar__divider"/>
      <input className="project-name" value={p.projectName} onChange={e=>p.onProjectNameChange(e.target.value)}/>
      <span className={"save-state "+(p.saved?"saved":"")}>{p.saved?"Saved":"Saving..."}</span>
      <div className="toolbar__spacer"/>
      <div className="segmented">
        <button className={p.view==="canvas"?"active":""} onClick={()=>p.onViewChange("canvas")}><Box size={14}/>Canvas</button>
        <button className={p.view==="inventory"?"active":""} onClick={()=>p.onViewChange("inventory")}><Table2 size={14}/>Inventory</button>
      </div>
      <select className="toolbar-select" defaultValue="" onChange={e=>{if(e.target.value)p.onTemplate(e.target.value);e.currentTarget.value=""}}>
        <option value="">Load template…</option>
        {TEMPLATES.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}
      </select>
      <button className="tool-button" onClick={p.onAddZone} title="Add zone"><Layers3 size={16}/><span>Zone</span></button>
      <button className="tool-button" onClick={p.onExportJson} title="Export project JSON"><FileJson size={16}/></button>
      <button className="tool-button" onClick={p.onExportPng} title="Export PNG"><ImageDown size={16}/></button>
      <button className="tool-button" onClick={()=>ref.current?.click()} title="Import project"><Upload size={16}/></button>
      <input ref={ref} type="file" accept=".json,application/json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)p.onImport(f);e.currentTarget.value=""}}/>
      <button className="tool-button" onClick={p.onReset} title="New blank project"><RotateCcw size={16}/></button>
      <button className="tool-button" onClick={p.onThemeToggle} title="Toggle theme">{p.theme==="dark"?<Sun size={16}/>:<Moon size={16}/>}</button>
    </header>
  );
}
