import { useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import { ASSET_CATALOG, CATEGORY_ORDER } from "../data/catalog";
import type { ZoneType } from "../types";

export type PaletteItem = { kind: "asset"; type: string } | { kind: "zone"; zoneType: ZoneType };
export const DRAG_MIME = "application/otns-item";

const ZONE_PRESETS: Array<{ zoneType: ZoneType; label: string; hint: string }> = [
  { zoneType: "zone", label: "Zone", hint: "IEC 62443 security zone" },
  { zoneType: "dmz", label: "DMZ", hint: "Industrial DMZ / intermediary zone" },
  { zoneType: "safety", label: "Safety zone", hint: "SIS / SIL-rated systems" },
  { zoneType: "external", label: "External", hint: "Untrusted / third-party networks" }
];

export default function Sidebar({ onAdd }: { onAdd: (item: PaletteItem) => void }) {
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: ASSET_CATALOG.filter((item) =>
        item.category === category &&
        (!q || `${item.label} ${item.short} ${item.type} ${item.description}`.toLowerCase().includes(q))
      )
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const onDragStart = (event: React.DragEvent, item: PaletteItem) => {
    event.dataTransfer.setData(DRAG_MIME, JSON.stringify(item));
    event.dataTransfer.effectAllowed = "move";
  };

  const toggle = (category: string) => setCollapsed((prev) => {
    const next = new Set(prev);
    if (next.has(category)) next.delete(category); else next.add(category);
    return next;
  });

  return (
    <aside className="sidebar">
      <div className="sidebar__heading">
        <h2>Library</h2>
        <span>{ASSET_CATALOG.length} components</span>
      </div>
      <label className="search">
        <Search size={15} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assets…" aria-label="Search the component library" />
      </label>
      <div className="asset-library">
        {!query && (
          <section>
            <h3>Zones</h3>
            <div className="asset-library__grid">
              {ZONE_PRESETS.map((z) => (
                <div key={z.zoneType} className={`palette-item palette-zone zone-${z.zoneType}`} draggable title={`${z.hint}. Drag onto the canvas or double-click.`}
                  onDragStart={(e) => onDragStart(e, { kind: "zone", zoneType: z.zoneType })}
                  onDoubleClick={() => onAdd({ kind: "zone", zoneType: z.zoneType })}>
                  <b>{z.zoneType.toUpperCase()}</b>
                  <span>{z.label}</span>
                </div>
              ))}
            </div>
          </section>
        )}
        {grouped.map((group) => (
          <section key={group.category}>
            <h3 className="collapsible" onClick={() => toggle(group.category)}>
              <ChevronDown size={11} className={collapsed.has(group.category) && !query ? "rot" : ""} />
              {group.category} <small>{group.items.length}</small>
            </h3>
            {(!collapsed.has(group.category) || query) && (
              <div className="asset-library__grid">
                {group.items.map((item) => (
                  <div key={item.type} className="palette-item" draggable
                    onDragStart={(e) => onDragStart(e, { kind: "asset", type: item.type })}
                    onDoubleClick={() => onAdd({ kind: "asset", type: item.type })}
                    title={`${item.description}. Drag onto the canvas or double-click.`}>
                    <b>{item.short}</b>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
        {grouped.length === 0 && <p className="muted small pad">No components match "{query}".</p>}
      </div>
    </aside>
  );
}
