import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Background, BackgroundVariant, ConnectionMode, Controls, MarkerType, MiniMap, Panel,
  getRectOfNodes, useEdgesState, useNodesState,
  type Connection, type Edge, type Node, type NodeMouseHandler, type ReactFlowInstance
} from "reactflow";
import { toPng, toSvg } from "html-to-image";

import AssetNode from "./components/AssetNode";
import ZoneNode from "./components/ZoneNode";
import Sidebar, { DRAG_MIME, type PaletteItem } from "./components/Sidebar";
import Inspector from "./components/inspector/Inspector";
import Toolbar, { type View } from "./components/Toolbar";
import { CanvasControls, FindingsDrawer, SimulationBar, type LayerState } from "./components/CanvasPanels";
import { HelpDialog, ProjectsDialog, TemplatesDialog, Toasts, type Toast } from "./components/Dialogs";
import { FindingsView, InventoryView, MatrixView, ZonesView } from "./components/views/Views";

import { TEMPLATES } from "./data/templates";
import { protocolProtection } from "./data/protocols";
import { getAssetDefinition } from "./data/catalog";
import type { AssetData, DesignerData, EdgeData, EdgeKind, ProjectEdge, ProjectFile, ProjectNode, XY, ZoneData, ZoneType } from "./types";
import { analyse, conduitsCsv, findingsCsv, inventoryCsv, markdownReport, matrixCsv, zonesCsv } from "./engine/exporters";
import { defaultEdgeData, normaliseProject, toPersisted } from "./engine/migrate";
import { nodeRect } from "./engine/model";
import { SEVERITY_ORDER, type Finding, type Severity } from "./engine/rules";
import { DEFAULT_SIMULATION, attackPathEdges, simulate, type SimulationOptions } from "./engine/simulate";
import { DesignContext, type DesignContextValue, type NodeDecoration } from "./state/DesignContext";
import { useHistory } from "./state/useHistory";
import {
  deleteProject, getCurrentId, listProjects, loadProject, migrateLegacy, newId, readClipboard, readPref,
  saveProject, setCurrentId, writeClipboard, writePref, type ProjectMeta
} from "./state/storage";
import { downloadText, downloadUrl, isTypingTarget, slugify } from "./utils/download";

const nodeTypes = { asset: AssetNode, zone: ZoneNode };

type RFNode = Node<DesignerData>;
type RFEdge = Edge<EdgeData>;

const PALETTE = {
  dark: { flow: "#5fb3f6", link: "#8fa1b8", danger: "#ff6b7a", warn: "#f3a74a", sim: "#ff4d6d", highlight: "#ffd166", disabled: "#4b5b70", bg: "#0b1220" },
  light: { flow: "#1f6fd1", link: "#64748b", danger: "#c43b4d", warn: "#c9771a", sim: "#d61f45", highlight: "#b7791f", disabled: "#b0bccb", bg: "#f5f7fb" }
};

const asProject = (nodes: RFNode[]) => nodes as unknown as ProjectNode[];
const asProjectEdges = (edges: RFEdge[]) => edges as unknown as ProjectEdge[];
const worse = (a: Severity | undefined, b: Severity) => (!a || SEVERITY_ORDER.indexOf(b) < SEVERITY_ORDER.indexOf(a) ? b : a);

function blankProject(name = "Untitled OT Architecture"): ProjectFile {
  return { schemaVersion: 2, name, nodes: [], edges: [], updatedAt: new Date().toISOString() };
}

function makeAsset(type: string, position: XY): RFNode | null {
  const def = getAssetDefinition(type);
  if (!def) return null;
  const data: AssetData = {
    kind: "asset", title: def.label, assetType: def.type, category: def.category, status: "unknown",
    protocols: [...(def.defaultProtocols ?? [])], purdueLevel: def.defaultPurdueLevel, criticality: "medium"
  };
  return { id: newId("a"), type: "asset", position, data };
}

function makeZone(zoneType: ZoneType, position: XY): RFNode {
  const titles: Record<ZoneType, string> = { zone: "New Zone", dmz: "New DMZ", safety: "New Safety Zone", external: "External Network" };
  const data: ZoneData = { kind: "zone", title: titles[zoneType], zoneType, securityLevelTarget: zoneType === "external" ? undefined : zoneType === "safety" ? "SL 3" : "SL 2" };
  return { id: newId("z"), type: "zone", position, zIndex: -1, style: { width: 520, height: 280 }, data };
}

export default function App() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<DesignerData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<EdgeData>([]);
  const [flow, setFlow] = useState<ReactFlowInstance | null>(null);

  const [projectId, setProjectId] = useState("");
  const [projectName, setProjectName] = useState("Untitled OT Architecture");
  const [description, setDescription] = useState<string | undefined>();
  const [projects, setProjects] = useState<ProjectMeta[]>([]);
  const [saveState, setSaveState] = useState<"saved" | "saving" | "error">("saved");
  const [view, setView] = useState<View>("canvas");
  const [theme, setTheme] = useState<"dark" | "light">(() => readPref<"dark" | "light">("theme", "dark"));
  const [connectKind, setConnectKind] = useState<EdgeKind>("flow");
  const [layers, setLayers] = useState<LayerState>({ flows: true, links: true, badges: true });
  const [dialog, setDialog] = useState<null | "projects" | "templates" | "help">(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [highlight, setHighlight] = useState<Set<string>>(new Set());
  const [focusedFinding, setFocusedFinding] = useState<string | null>(null);
  const [sim, setSim] = useState<{ origins: string[]; options: SimulationOptions } | null>(null);
  const [simStep, setSimStep] = useState(Number.POSITIVE_INFINITY);
  const [dragging, setDragging] = useState(false);
  const loaded = useRef(false);
  const dragGroup = useRef<{ zoneId: string; start: XY; members: Map<string, XY> } | null>(null);

  const palette = PALETTE[theme];

  // ---------- toasts ----------
  const toast = useCallback((text: string, tone: Toast["tone"] = "info", details?: string[]) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-3), { id, text, tone, details }]);
    if (!details?.length) window.setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), tone === "error" ? 8000 : 4000);
  }, []);

  // ---------- theme ----------
  useEffect(() => { document.documentElement.dataset.theme = theme; writePref("theme", theme); }, [theme]);

  // ---------- history ----------
  const restore = useCallback((n: ProjectNode[], e: ProjectEdge[]) => {
    setNodes(n as unknown as RFNode[]);
    setEdges(e as unknown as RFEdge[]);
  }, [setNodes, setEdges]);
  const history = useHistory(asProject(nodes), asProjectEdges(edges), restore, dragging);

  // ---------- projects ----------
  const openProject = useCallback((id: string) => {
    const project = loadProject(id);
    if (!project) { toast("Couldn't open that project. It may be corrupted.", "error"); return; }
    setNodes(project.nodes as unknown as RFNode[]);
    setEdges(project.edges as unknown as RFEdge[]);
    setProjectName(project.name);
    setDescription(project.description);
    setProjectId(id);
    setCurrentId(id);
    history.reset(project.nodes, project.edges);
    setSim(null); setHighlight(new Set()); setFocusedFinding(null);
    setProjects(listProjects());
    loaded.current = true;
    window.setTimeout(() => flow?.fitView({ padding: 0.1, duration: 300 }), 50);
  }, [flow, history, setEdges, setNodes, toast]);

  const createProject = useCallback((project: ProjectFile) => {
    const id = newId();
    if (!saveProject(id, { ...project, updatedAt: new Date().toISOString() })) {
      toast("Browser storage is full or blocked. Export your projects as JSON.", "error");
      return;
    }
    openProject(id);
  }, [openProject, toast]);

  useEffect(() => {
    if (loaded.current) return;
    const legacy = migrateLegacy();
    if (legacy) toast("Your previous project was upgraded to the new format.");
    const list = listProjects();
    const current = getCurrentId();
    const target = list.find((p) => p.id === current)?.id ?? list[0]?.id;
    if (target) openProject(target);
    else createProject(blankProject());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit once the instance is ready after the first load.
  useEffect(() => { if (flow && nodes.length) flow.fitView({ padding: 0.1 }); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [flow]);

  // ---------- autosave ----------
  useEffect(() => {
    if (!loaded.current || !projectId || dragging) return;
    setSaveState("saving");
    const timer = window.setTimeout(() => {
      const ok = saveProject(projectId, toPersisted(projectName, asProject(nodes), asProjectEdges(edges), description));
      setSaveState(ok ? "saved" : "error");
      setProjects(listProjects());
    }, 600);
    return () => window.clearTimeout(timer);
  }, [nodes, edges, projectName, description, projectId, dragging]);

  // ---------- analysis ----------
  const deferredNodes = useDeferredValue(nodes);
  const deferredEdges = useDeferredValue(edges);
  const analysis = useMemo(() => analyse({ nodes: asProject(deferredNodes), edges: asProjectEdges(deferredEdges) }), [deferredNodes, deferredEdges]);
  const { model, findings } = analysis;

  const simResult = useMemo(() => (sim ? simulate(model, sim.origins, sim.options) : null), [sim, model]);
  const selectedNodes = nodes.filter((n) => n.selected);
  const selectedEdges = edges.filter((e) => e.selected);
  const simFocus = simResult && selectedNodes.length === 1 && simResult.hops.has(selectedNodes[0].id) ? selectedNodes[0].id : null;
  const simPathEdges = useMemo(() => new Set(simResult && simFocus ? attackPathEdges(simResult, simFocus) : []), [simResult, simFocus]);
  const simEdgeHop = useMemo(() => {
    const m = new Map<string, number>();
    if (simResult) for (const [nodeId, step] of simResult.parent) m.set(step.edgeId, Math.min(m.get(step.edgeId) ?? Infinity, simResult.hops.get(nodeId)!));
    return m;
  }, [simResult]);

  const { decorations, edgeWorst } = useMemo(() => {
    const deco = new Map<string, NodeDecoration>();
    const ew = new Map<string, Severity>();
    for (const f of findings) {
      if (f.severity === "info") continue;
      for (const id of new Set(f.nodeIds)) {
        const d = deco.get(id) ?? { findings: 0 };
        d.findings++; d.worst = worse(d.worst, f.severity);
        deco.set(id, d);
      }
      for (const id of f.edgeIds) ew.set(id, worse(ew.get(id), f.severity));
    }
    return { decorations: deco, edgeWorst: ew };
  }, [findings]);

  const designValue = useMemo<DesignContextValue>(() => {
    const zoneAssetCounts = new Map<string, number>();
    const zoneOfAsset = new Map<string, string>();
    for (const z of model.zones.values()) zoneAssetCounts.set(z.id, z.assetIds.length);
    for (const a of model.assets.values()) if (a.zoneId) zoneOfAsset.set(a.id, a.zoneId);
    return {
      decorations, zoneAssetCounts, zoneOfAsset, highlighted: highlight, showFindingBadges: layers.badges,
      simulation: { active: !!simResult, origins: new Set(simResult?.origins ?? []), hops: simResult?.hops ?? new Map(), step: simStep }
    };
  }, [model, decorations, highlight, layers.badges, simResult, simStep]);

  const displayEdges = useMemo(() => edges.map((e): RFEdge => {
    const d = e.data ?? defaultEdgeData();
    const isFlow = d.kind === "flow";
    const worst = edgeWorst.get(e.id);
    const simHop = simEdgeHop.get(e.id);
    const inSim = simResult !== null && simHop !== undefined && simHop <= simStep;
    const onPath = simPathEdges.has(e.id);
    const hl = highlight.has(e.id);
    let stroke = isFlow ? palette.flow : palette.link;
    if (layers.badges && (worst === "critical" || worst === "high")) stroke = palette.danger;
    else if (layers.badges && worst === "medium") stroke = palette.warn;
    if (!d.enabled) stroke = palette.disabled;
    if (inSim) stroke = palette.sim;
    if (hl || onPath) stroke = palette.highlight;
    const width = onPath || hl ? 3.5 : inSim ? 2.6 : isFlow ? 1.6 : 2.6;
    const marker = { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 };
    const label = isFlow
      ? `${d.protocols.join(" / ") || "unspecified"}${d.direction === "bidirectional" ? " ⇄" : ""}${d.protocols.length > 0 && d.protocols.every((p) => protocolProtection(p, d).secured) ? " 🔒" : ""}${d.enabled ? "" : " (off)"}`
      : [d.media, d.redundancy && d.redundancy !== "none" ? d.redundancy : ""].filter(Boolean).join(" · ") + (d.enabled ? "" : " (off)");
    return {
      ...e,
      type: "smoothstep",
      hidden: isFlow ? !layers.flows : !layers.links,
      label,
      animated: inSim,
      style: { stroke, strokeWidth: width, strokeDasharray: isFlow ? "6 4" : undefined, opacity: simResult && !inSim && !onPath ? 0.25 : d.enabled ? 1 : 0.6 },
      markerEnd: isFlow ? marker : undefined,
      markerStart: isFlow && d.direction === "bidirectional" ? marker : undefined,
      className: `edge-${d.kind}${e.selected ? " selected" : ""}`,
      zIndex: hl || onPath ? 10 : 0
    };
  }), [edges, edgeWorst, simEdgeHop, simResult, simStep, simPathEdges, highlight, palette, layers]);

  // ---------- mutations ----------
  const updateNodeData = useCallback((id: string, patch: Partial<AssetData> | Partial<ZoneData>) => {
    setNodes((cur) => cur.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } as DesignerData } : n)));
  }, [setNodes]);

  const bulkAssetChange = useCallback((ids: string[], patch: Partial<AssetData>) => {
    setNodes((cur) => cur.map((n) => (ids.includes(n.id) && n.data.kind === "asset" ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, [setNodes]);

  const updateEdgeData = useCallback((id: string, patch: Partial<EdgeData>) => {
    setEdges((cur) => cur.map((e) => (e.id === id ? { ...e, data: { ...(e.data ?? defaultEdgeData()), ...patch } } : e)));
  }, [setEdges]);

  const reverseEdge = useCallback((id: string) => {
    setEdges((cur) => cur.map((e) => (e.id === id ? { ...e, source: e.target, target: e.source, sourceHandle: null, targetHandle: null } : e)));
  }, [setEdges]);

  const deleteElements = useCallback((nodeIds: string[], edgeIds: string[]) => {
    const ns = new Set(nodeIds);
    setNodes((cur) => cur.filter((n) => !ns.has(n.id)));
    setEdges((cur) => cur
      .filter((e) => !edgeIds.includes(e.id) && !ns.has(e.source) && !ns.has(e.target))
      .map((e) => (e.data?.via?.some((v) => ns.has(v)) ? { ...e, data: { ...e.data, via: e.data.via.filter((v) => !ns.has(v)) } } : e)));
    setSim((s) => (s && s.origins.some((o) => ns.has(o)) ? null : s));
  }, [setEdges, setNodes]);

  const onNodesDelete = useCallback((deleted: RFNode[]) => {
    const ns = new Set(deleted.map((n) => n.id));
    setEdges((cur) => cur.map((e) => (e.data?.via?.some((v) => ns.has(v)) ? { ...e, data: { ...e.data, via: e.data.via.filter((v) => !ns.has(v)) } } : e)));
    setSim((s) => (s && s.origins.some((o) => ns.has(o)) ? null : s));
  }, [setEdges]);

  const selectOnly = useCallback((nodeIds: string[], edgeIds: string[] = []) => {
    setNodes((cur) => cur.map((n) => (n.selected === nodeIds.includes(n.id) ? n : { ...n, selected: nodeIds.includes(n.id) })));
    setEdges((cur) => cur.map((e) => (e.selected === edgeIds.includes(e.id) ? e : { ...e, selected: edgeIds.includes(e.id) })));
  }, [setEdges, setNodes]);

  const centerOn = useCallback((nodeIds: string[], edgeIds: string[] = []) => {
    window.setTimeout(() => {
      if (!flow) return;
      const ids = new Set(nodeIds);
      for (const e of edges) if (edgeIds.includes(e.id)) { ids.add(e.source); ids.add(e.target); }
      const subset = flow.getNodes().filter((n) => ids.has(n.id));
      if (!subset.length) return;
      flow.fitBounds(getRectOfNodes(subset), { padding: 0.35, duration: 400 });
    }, 60);
  }, [edges, flow]);

  const clearTransient = useCallback(() => {
    setHighlight(new Set());
    setFocusedFinding(null);
  }, []);

  // ---------- add / drop ----------
  const viewportCenter = useCallback((): XY => {
    const bounds = canvasRef.current?.getBoundingClientRect();
    if (!flow || !bounds) return { x: 100, y: 100 };
    return flow.project({ x: bounds.width / 2, y: bounds.height / 2 });
  }, [flow]);

  const addItem = useCallback((item: PaletteItem, at?: XY) => {
    const p = at ?? viewportCenter();
    const node = item.kind === "asset" ? makeAsset(item.type, { x: p.x - 90, y: p.y - 48 }) : makeZone(item.zoneType, { x: p.x - 40, y: p.y - 30 });
    if (!node) return;
    setNodes((cur) => [...cur.map((n) => (n.selected ? { ...n, selected: false } : n)), { ...node, selected: true }]);
    setView("canvas");
  }, [setNodes, viewportCenter]);

  const onDragOver = useCallback((event: React.DragEvent) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; }, []);

  const onDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (!flow || !canvasRef.current) return;
    const raw = event.dataTransfer.getData(DRAG_MIME);
    if (!raw) return;
    try {
      const item = JSON.parse(raw) as PaletteItem;
      const bounds = canvasRef.current.getBoundingClientRect();
      addItem(item, flow.project({ x: event.clientX - bounds.left, y: event.clientY - bounds.top }));
    } catch { /* ignore foreign drops */ }
  }, [addItem, flow]);

  const onConnect = useCallback((c: Connection) => {
    if (!c.source || !c.target || c.source === c.target) return;
    const s = nodes.find((n) => n.id === c.source), t = nodes.find((n) => n.id === c.target);
    if (!s || !t || s.data.kind !== "asset" || t.data.kind !== "asset") return;
    const data = defaultEdgeData(connectKind);
    if (connectKind === "flow") {
      const shared = s.data.protocols.filter((p) => p !== "TCP/IP" && (t.data as AssetData).protocols.includes(p));
      if (shared.length) data.protocols = shared;
    }
    const edge: RFEdge = { id: newId("e"), source: c.source, target: c.target, sourceHandle: c.sourceHandle, targetHandle: c.targetHandle, type: "smoothstep", data };
    setEdges((cur) => [...cur.map((e) => (e.selected ? { ...e, selected: false } : e)), { ...edge, selected: true }]);
    setNodes((cur) => cur.map((n) => (n.selected ? { ...n, selected: false } : n)));
  }, [connectKind, nodes, setEdges, setNodes]);

  // ---------- zone drag moves contents ----------
  const onNodeDragStart: NodeMouseHandler = useCallback((event, node) => {
    setDragging(true);
    if (node.data.kind !== "zone" || event.altKey) return;
    const zoneRect = nodeRect(node as unknown as ProjectNode);
    const members = new Map<string, XY>();
    // React Flow already moves the other selected nodes only when the zone itself was part of the selection.
    const zoneWasSelected = !!nodes.find((n) => n.id === node.id)?.selected;
    for (const n of nodes) {
      if (n.id === node.id || (zoneWasSelected && n.selected)) continue;
      const r = nodeRect(n as unknown as ProjectNode);
      const inside = n.data.kind === "asset"
        ? r.x + r.width / 2 >= zoneRect.x && r.x + r.width / 2 <= zoneRect.x + zoneRect.width && r.y + r.height / 2 >= zoneRect.y && r.y + r.height / 2 <= zoneRect.y + zoneRect.height
        : r.x >= zoneRect.x && r.y >= zoneRect.y && r.x + r.width <= zoneRect.x + zoneRect.width && r.y + r.height <= zoneRect.y + zoneRect.height;
      if (inside) members.set(n.id, { ...n.position });
    }
    dragGroup.current = { zoneId: node.id, start: { ...node.position }, members };
  }, [nodes]);

  const onNodeDrag: NodeMouseHandler = useCallback((_event, node) => {
    const g = dragGroup.current;
    if (!g || g.zoneId !== node.id || g.members.size === 0) return;
    const dx = node.position.x - g.start.x, dy = node.position.y - g.start.y;
    setNodes((cur) => cur.map((n) => {
      const start = g.members.get(n.id);
      return start ? { ...n, position: { x: start.x + dx, y: start.y + dy } } : n;
    }));
  }, [setNodes]);

  const onNodeDragStop: NodeMouseHandler = useCallback(() => {
    dragGroup.current = null;
    setDragging(false);
  }, []);

  // ---------- clipboard ----------
  const cloneInto = useCallback((srcNodes: ProjectNode[], srcEdges: ProjectEdge[], offset: number) => {
    if (!srcNodes.length) return 0;
    const { project } = normaliseProject({ schemaVersion: 2, name: "clip", nodes: srcNodes, edges: srcEdges });
    const ids = new Map(project.nodes.map((n) => [n.id, newId(n.data.kind === "zone" ? "z" : "a")]));
    const newNodes = project.nodes.map((n) => ({ ...n, id: ids.get(n.id)!, position: { x: n.position.x + offset, y: n.position.y + offset }, selected: true })) as unknown as RFNode[];
    const newEdges = project.edges.map((e) => ({
      ...e, id: newId("e"), source: ids.get(e.source)!, target: ids.get(e.target)!, selected: false,
      data: e.data ? { ...e.data, via: e.data.via?.map((v) => ids.get(v) ?? v) } : e.data
    })) as unknown as RFEdge[];
    setNodes((cur) => [...cur.map((n) => (n.selected ? { ...n, selected: false } : n)), ...newNodes]);
    setEdges((cur) => [...cur.map((e) => (e.selected ? { ...e, selected: false } : e)), ...newEdges]);
    return newNodes.length;
  }, [setEdges, setNodes]);

  const selectionPayload = useCallback(() => {
    const sel = nodes.filter((n) => n.selected);
    const ids = new Set(sel.map((n) => n.id));
    const es = edges.filter((e) => ids.has(e.source) && ids.has(e.target));
    return toPersisted("clip", asProject(sel), asProjectEdges(es));
  }, [edges, nodes]);

  const copy = useCallback(() => {
    const p = selectionPayload();
    if (!p.nodes.length) return;
    writeClipboard({ nodes: p.nodes, edges: p.edges });
    toast(`Copied ${p.nodes.length} item(s)`);
  }, [selectionPayload, toast]);

  const paste = useCallback(() => {
    const clip = readClipboard<{ nodes: ProjectNode[]; edges: ProjectEdge[] }>();
    if (!clip?.nodes?.length) return;
    cloneInto(clip.nodes, clip.edges ?? [], 40);
  }, [cloneInto]);

  const duplicate = useCallback(() => {
    const p = selectionPayload();
    cloneInto(p.nodes, p.edges, 40);
  }, [cloneInto, selectionPayload]);

  // ---------- simulation ----------
  const startSimulation = useCallback((origins: string[]) => {
    const assets = origins.filter((id) => model.assets.has(id));
    if (!assets.length) { toast("Select one or more assets to simulate a compromise."); return; }
    setSim({ origins: assets, options: sim?.options ?? DEFAULT_SIMULATION });
    setSimStep(Number.POSITIVE_INFINITY);
    setView("canvas");
    clearTransient();
  }, [clearTransient, model, sim, toast]);

  // ---------- findings ----------
  const focusFinding = useCallback((f: Finding) => {
    setFocusedFinding(f.id);
    setHighlight(new Set([...f.nodeIds, ...f.edgeIds]));
    setView("canvas");
    const assetNodes = f.nodeIds.filter((id) => model.assets.has(id));
    if (f.edgeIds.length === 1) selectOnly([], [f.edgeIds[0]]);
    else if (f.nodeIds.length === 1) selectOnly([f.nodeIds[0]]);
    else if (assetNodes.length === 1) selectOnly(assetNodes);
    else selectOnly([]);
    centerOn(f.nodeIds, f.edgeIds);
  }, [centerOn, model, selectOnly]);

  // ---------- exports ----------
  const slug = slugify(projectName);
  const exportImage = useCallback(async (kind: "png" | "svg") => {
    const viewport = canvasRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
    if (!viewport || nodes.length === 0) { toast("Add something to the canvas before exporting a diagram.", "warn"); return; }
    const bounds = getRectOfNodes(nodes);
    const pad = 80;
    const width = Math.ceil(bounds.width + pad * 2);
    const height = Math.ceil(bounds.height + pad * 2);
    const options = {
      backgroundColor: palette.bg, width, height, pixelRatio: kind === "png" ? 2 : 1,
      style: { width: `${width}px`, height: `${height}px`, transform: `translate(${pad - bounds.x}px, ${pad - bounds.y}px) scale(1)` }
    };
    try {
      const url = kind === "png" ? await toPng(viewport, options) : await toSvg(viewport, options);
      downloadUrl(`${slug}.${kind}`, url);
    } catch {
      toast(`${kind.toUpperCase()} export failed. JSON and report exports still work.`, "error");
    }
  }, [nodes, palette.bg, slug, toast]);

  const exports = useMemo(() => ({
    json: () => downloadText(`${slug}.otns.json`, JSON.stringify(toPersisted(projectName, asProject(nodes), asProjectEdges(edges), description), null, 2), "application/json"),
    png: () => void exportImage("png"),
    svg: () => void exportImage("svg"),
    report: () => downloadText(`${slug}-design-report.md`, markdownReport({ name: projectName, description, nodes: asProject(nodes), edges: asProjectEdges(edges) }, analysis), "text/markdown"),
    inventoryCsv: () => downloadText(`${slug}-inventory.csv`, inventoryCsv(model), "text/csv"),
    matrixCsv: () => downloadText(`${slug}-firewall-rules.csv`, matrixCsv(analysis.matrix), "text/csv"),
    conduitsCsv: () => downloadText(`${slug}-conduits.csv`, conduitsCsv(analysis.conduits), "text/csv"),
    zonesCsv: () => downloadText(`${slug}-zones.csv`, zonesCsv(analysis.zones), "text/csv"),
    findingsCsv: () => downloadText(`${slug}-findings.csv`, findingsCsv(findings), "text/csv")
  }), [analysis, description, edges, exportImage, findings, model, nodes, projectName, slug]);

  const importFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const { project, warnings } = normaliseProject(JSON.parse(String(reader.result)));
        createProject(project);
        toast(`Imported "${project.name}" as a new project.`, warnings.length ? "warn" : "info", warnings);
      } catch (error) {
        toast(error instanceof Error ? `Import failed: ${error.message}` : "Import failed.", "error");
      }
    };
    reader.readAsText(file);
  }, [createProject, toast]);

  const pickTemplate = useCallback((id: string) => {
    const t = TEMPLATES.find((x) => x.id === id);
    if (!t) return;
    const { project } = normaliseProject({ schemaVersion: 2, name: t.name, description: t.description, nodes: t.nodes, edges: t.edges });
    createProject(project);
    setDialog(null);
    setView("canvas");
  }, [createProject]);

  // ---------- keyboard ----------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || dialog) return;
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (mod && key === "z" && !e.shiftKey) { e.preventDefault(); history.undo(); }
      else if (mod && ((key === "z" && e.shiftKey) || key === "y")) { e.preventDefault(); history.redo(); }
      else if (mod && key === "c") { copy(); }
      else if (mod && key === "v") { e.preventDefault(); paste(); }
      else if (mod && key === "d") { e.preventDefault(); duplicate(); }
      else if (mod && key === "a" && view === "canvas") { e.preventDefault(); selectOnly(nodes.map((n) => n.id), edges.map((x) => x.id)); }
      else if (mod) return;
      else if (key === "escape") { setSim(null); clearTransient(); selectOnly([]); }
      else if (key === "l") setConnectKind((k) => (k === "flow" ? "link" : "flow"));
      else if (key === "f") flow?.fitView({ padding: 0.1, duration: 300 });
      else if (key === "s") startSimulation(nodes.filter((n) => n.selected && n.data.kind === "asset").map((n) => n.id));
      else if (e.key === "?") setDialog("help");
      else if (["1", "2", "3", "4", "5"].includes(key)) setView((["canvas", "inventory", "zones", "matrix", "findings"] as View[])[Number(key) - 1]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [clearTransient, copy, dialog, duplicate, edges, flow, history, nodes, paste, selectOnly, startSimulation, view]);

  const worstSeverity = findings.find((f) => f.severity !== "info")?.severity;
  const visibleFindingCount = findings.filter((f) => f.severity !== "info").length;

  const showOnCanvas = useCallback((nodeIds: string[], edgeIds: string[] = []) => {
    setView("canvas");
    selectOnly(nodeIds, edgeIds);
    setHighlight(new Set([...nodeIds, ...edgeIds]));
    centerOn(nodeIds, edgeIds);
  }, [centerOn, selectOnly]);

  return (
    <div className="app-shell">
      <Toolbar
        projectName={projectName}
        onProjectNameChange={setProjectName}
        saveState={saveState}
        view={view}
        onViewChange={setView}
        findingCount={visibleFindingCount}
        worstSeverity={worstSeverity}
        score={analysis.score}
        theme={theme}
        onThemeToggle={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={history.undo}
        onRedo={history.redo}
        onOpenProjects={() => setDialog("projects")}
        onOpenTemplates={() => setDialog("templates")}
        onOpenHelp={() => setDialog("help")}
        onImport={importFile}
        exports={exports}
      />

      <div className="main-area">
      {view === "inventory" && <InventoryView analysis={analysis} onSelect={(id) => showOnCanvas([id])} onExport={exports.inventoryCsv} />}
      {view === "zones" && <ZonesView analysis={analysis} onSelect={(id) => showOnCanvas([id])} onSelectEdges={(ids) => showOnCanvas([], ids)} onExportZones={exports.zonesCsv} onExportConduits={exports.conduitsCsv} />}
      {view === "matrix" && <MatrixView analysis={analysis} onSelectEdge={(id) => showOnCanvas([], [id])} onExport={(rows) => downloadText(`${slug}-firewall-rules.csv`, matrixCsv(rows), "text/csv")} />}
      {view === "findings" && <FindingsView analysis={analysis} onFocus={focusFinding} onExport={exports.findingsCsv} />}

      {/* The canvas stays mounted so the viewport, the flow instance and exports survive view switches. */}
        <div className={`workspace ${view === "canvas" ? "" : "is-hidden"}`} aria-hidden={view !== "canvas"}>
          <Sidebar onAdd={(item) => addItem(item)} />
          <div className="canvas" ref={canvasRef}>
            <DesignContext.Provider value={designValue}>
              <ReactFlow
                nodes={nodes}
                edges={displayEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodesDelete={onNodesDelete}
                onNodeDragStart={onNodeDragStart}
                onNodeDrag={onNodeDrag}
                onNodeDragStop={onNodeDragStop}
                onPaneClick={clearTransient}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onInit={setFlow}
                nodeTypes={nodeTypes}
                connectionMode={ConnectionMode.Loose}
                isValidConnection={(c) => c.source !== c.target}
                snapToGrid
                snapGrid={[20, 20]}
                deleteKeyCode={view === "canvas" && !dialog ? ["Backspace", "Delete"] : null}
                selectionKeyCode="Shift"
                multiSelectionKeyCode={["Meta", "Control"]}
                minZoom={0.1}
                maxZoom={2.5}
                elevateEdgesOnSelect
                defaultEdgeOptions={{ type: "smoothstep" }}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} gap={20} size={1.1} />
                <Controls />
                <MiniMap pannable zoomable nodeColor={(n) => (n.data?.kind === "zone" ? "transparent" : palette.flow)} nodeStrokeColor={(n) => (n.data?.kind === "zone" ? palette.link : palette.flow)} />
                <Panel position="top-left">
                  <CanvasControls connectKind={connectKind} onConnectKind={setConnectKind} layers={layers} onLayers={setLayers} />
                </Panel>
                {simResult && sim && (
                  <Panel position="top-center">
                    <SimulationBar model={model} result={simResult} options={sim.options} step={simStep} focusId={simFocus}
                      onOptions={(options) => setSim({ ...sim, options })} onStep={setSimStep} onStop={() => setSim(null)} />
                  </Panel>
                )}
              </ReactFlow>
            </DesignContext.Provider>
            {nodes.length === 0 && (
              <div className="welcome">
                <h2>Start designing</h2>
                <p>Drag zones and components from the library, or start from a reference architecture.</p>
                <div className="button-row center">
                  <button className="primary-button" onClick={() => setDialog("templates")}>Browse templates</button>
                  <button className="ghost-button" onClick={() => pickTemplate("flawed-flat")}>Try the training network</button>
                </div>
              </div>
            )}
            <FindingsDrawer findings={findings} focusedId={focusedFinding} onFocus={focusFinding} />
          </div>
          <Inspector
            selectedNodes={asProject(selectedNodes)}
            selectedEdges={asProjectEdges(selectedEdges)}
            model={model}
            findings={findings}
            onNodeChange={updateNodeData}
            onEdgeChange={updateEdgeData}
            onReverseEdge={reverseEdge}
            onDelete={deleteElements}
            onDuplicate={duplicate}
            onSimulate={startSimulation}
            onFocusFinding={focusFinding}
            onBulkAssetChange={bulkAssetChange}
            onClose={() => selectOnly([])}
          />
        </div>
      </div>

      {dialog === "projects" && (
        <ProjectsDialog
          projects={projects}
          currentId={projectId}
          description={description}
          onDescription={(v) => setDescription(v || undefined)}
          onOpen={(id) => { openProject(id); setDialog(null); }}
          onNew={() => { createProject(blankProject()); setDialog(null); }}
          onDuplicate={() => { createProject(toPersisted(`${projectName} (copy)`, asProject(nodes), asProjectEdges(edges), description)); setDialog(null); }}
          onDelete={(id) => { deleteProject(id); setProjects(listProjects()); }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "templates" && <TemplatesDialog onPick={pickTemplate} onClose={() => setDialog(null)} />}
      {dialog === "help" && <HelpDialog onClose={() => setDialog(null)} />}
      <Toasts toasts={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}
