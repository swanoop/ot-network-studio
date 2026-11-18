import { useMemo, useState } from "react";
import { PROTOCOL_CATALOG, PROTOCOL_FAMILIES, getProtocol } from "../../data/protocols";
import type { Finding } from "../../engine/rules";

export function TextField({ label, value, onChange, placeholder, mono }: {
  label: string; value?: string; onChange: (v: string | undefined) => void; placeholder?: string; mono?: boolean;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input className={mono ? "mono" : ""} value={value ?? ""} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)} />
    </label>
  );
}

export function SelectField<T extends string>({ label, value, options, onChange, allowEmpty }: {
  label: string; value?: T; options: Array<{ value: T; label: string }>; onChange: (v: T | undefined) => void; allowEmpty?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : (e.target.value as T))}>
        {allowEmpty !== undefined && <option value="">{allowEmpty}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export function TextArea({ label, value, onChange }: { label: string; value?: string; onChange: (v: string | undefined) => void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <textarea value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)} />
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="toggle" title={hint}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}

export const SL_OPTIONS = [
  { value: "SL 1" as const, label: "SL 1 – casual / coincidental" },
  { value: "SL 2" as const, label: "SL 2 – intentional, low resources" },
  { value: "SL 3" as const, label: "SL 3 – sophisticated, moderate resources" },
  { value: "SL 4" as const, label: "SL 4 – sophisticated, extended resources" }
];

export function ProtocolPicker({ value, onChange, label = "Protocols" }: { value: string[]; onChange: (v: string[]) => void; label?: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const toggle = (p: string) => onChange(value.includes(p) ? value.filter((x) => x !== p) : [...value, p]);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PROTOCOL_FAMILIES.map((family) => ({
      family,
      items: PROTOCOL_CATALOG.filter((p) => p.family === family && (!q || `${p.name} ${p.ports.join(" ")}`.toLowerCase().includes(q)))
    })).filter((g) => g.items.length);
  }, [query]);
  const custom = value.filter((p) => !getProtocol(p));

  return (
    <div className="field">
      <span>{label}</span>
      <div className="protocol-selected">
        {value.length === 0 && <em className="muted small">None</em>}
        {value.map((p) => {
          const def = getProtocol(p);
          return (
            <button key={p} className={`chip ${def?.insecure ? "chip-warn" : "chip-ok"}`} onClick={() => toggle(p)} title={def ? `${def.description} ${def.ports.join(", ")}` : "Custom protocol"}>
              {p} ×
            </button>
          );
        })}
        <button className="chip chip-add" onClick={() => setOpen((v) => !v)}>{open ? "Done" : "+ Add"}</button>
      </div>
      {open && (
        <div className="protocol-picker">
          <input className="picker-search" placeholder="Search protocols or ports, or type a custom name and press Enter" value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && query.trim()) {
                const exact = PROTOCOL_CATALOG.find((p) => p.name.toLowerCase() === query.trim().toLowerCase());
                const name = exact?.name ?? query.trim();
                if (!value.includes(name)) onChange([...value, name]);
                setQuery("");
              }
            }} />
          {groups.map((g) => (
            <div key={g.family} className="picker-group">
              <h4>{g.family}</h4>
              <div className="picker-items">
                {g.items.map((p) => (
                  <button key={p.name} className={value.includes(p.name) ? "active" : ""} onClick={() => toggle(p.name)}
                    title={`${p.description}${p.ports.length ? ` (${p.ports.join(", ")})` : " (non-IP)"}`}>
                    {p.name}{p.insecure ? <i className="dot-warn" /> : null}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {custom.length > 0 && <p className="muted small">Custom: {custom.join(", ")}</p>}
        </div>
      )}
    </div>
  );
}

export function FindingList({ findings, onFocus }: { findings: Finding[]; onFocus: (f: Finding) => void }) {
  if (!findings.length) return <p className="muted small ok-line">✓ No findings for this element.</p>;
  return (
    <ul className="finding-list compact">
      {findings.map((f) => (
        <li key={f.id} onClick={() => onFocus(f)} className={`sev-border-${f.severity}`}>
          <span className={`sev-pill sev-${f.severity}`}>{f.severity}</span>
          <div>
            <strong>{f.title}</strong>
            <p>{f.message}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}
