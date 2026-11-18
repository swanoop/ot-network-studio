import { useEffect, useRef, useState, type ReactNode } from "react";

export interface MenuItem {
  label: string;
  hint?: string;
  icon?: ReactNode;
  onSelect: () => void;
  disabled?: boolean;
  separatorBefore?: boolean;
}

export default function Menu({ trigger, items, title, align = "right" }: { trigger: ReactNode; items: MenuItem[]; title?: string; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button className="tool-button" onClick={() => setOpen((v) => !v)} title={title} aria-haspopup="menu" aria-expanded={open}>{trigger}</button>
      {open && (
        <div className={`menu__popover align-${align}`} role="menu">
          {items.map((item) => (
            <div key={item.label}>
              {item.separatorBefore && <div className="menu__sep" />}
              <button role="menuitem" disabled={item.disabled} onClick={() => { setOpen(false); item.onSelect(); }}>
                {item.icon}<span>{item.label}</span>{item.hint && <small>{item.hint}</small>}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
