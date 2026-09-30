import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { ASSET_CATALOG, CATEGORY_ORDER } from "../data/catalog";
import type { AssetDefinition } from "../types";

export default function Sidebar() {
  const [query, setQuery] = useState("");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return CATEGORY_ORDER.map((category) => ({
      category,
      items: ASSET_CATALOG.filter((item) =>
        item.category === category &&
        (!q || (item.label + " " + item.description).toLowerCase().includes(q))
      )
    })).filter((group) => group.items.length > 0);
  }, [query]);

  const onDragStart = (event: React.DragEvent, item: AssetDefinition) => {
    event.dataTransfer.setData("application/ot-network-asset", JSON.stringify(item));
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <aside className="sidebar">
      <div className="sidebar__heading">
        <h2>Asset Library</h2>
        <span>{ASSET_CATALOG.length} components</span>
      </div>
      <label className="search">
        <Search size={15} />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search assets..." />
      </label>
      <div className="asset-library">
        {grouped.map((group) => (
          <section key={group.category}>
            <h3>{group.category}</h3>
            <div className="asset-library__grid">
              {group.items.map((item) => (
                <div
                  key={item.type}
                  className="palette-item"
                  draggable
                  onDragStart={(e) => onDragStart(e, item)}
                  title={item.description}
                >
                  <b>{item.short}</b>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
