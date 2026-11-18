/*
 * Undo/redo for the canvas. Takes a debounced snapshot of the persisted
 * fields (no selection, measured sizes or drag state) whenever they change,
 * so drags, resizes and inspector edits each become one undo step.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProjectEdge, ProjectNode } from "../types";

interface Snapshot { nodes: ProjectNode[]; edges: ProjectEdge[]; key: string }

const LIMIT = 150;

function snapshot(nodes: ProjectNode[], edges: ProjectEdge[]): Snapshot {
  const n = nodes.map(({ id, type, position, data, style, zIndex }) => ({ id, type, position, data, style, zIndex }));
  const e = edges.map(({ id, source, target, sourceHandle, targetHandle, type, data }) => ({ id, source, target, sourceHandle, targetHandle, type, data }));
  return { nodes: n, edges: e, key: JSON.stringify([n, e]) };
}

export function useHistory(
  nodes: ProjectNode[],
  edges: ProjectEdge[],
  restore: (nodes: ProjectNode[], edges: ProjectEdge[]) => void,
  dragging: boolean
) {
  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);
  const current = useRef<Snapshot | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (dragging) return;
    const timer = window.setTimeout(() => {
      const snap = snapshot(nodes, edges);
      if (!current.current) { current.current = snap; return; }
      if (snap.key === current.current.key) return;
      past.current.push(current.current);
      if (past.current.length > LIMIT) past.current.shift();
      future.current = [];
      current.current = snap;
      setVersion((v) => v + 1);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [nodes, edges, dragging]);

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev || !current.current) return;
    future.current.push(current.current);
    current.current = prev;
    restore(prev.nodes, prev.edges);
    setVersion((v) => v + 1);
  }, [restore]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next || !current.current) return;
    past.current.push(current.current);
    current.current = next;
    restore(next.nodes, next.edges);
    setVersion((v) => v + 1);
  }, [restore]);

  /** Forget history, e.g. after opening another project. */
  const reset = useCallback((nodesNow: ProjectNode[], edgesNow: ProjectEdge[]) => {
    past.current = [];
    future.current = [];
    current.current = snapshot(nodesNow, edgesNow);
    setVersion((v) => v + 1);
  }, []);

  return { undo, redo, reset, canUndo: past.current.length > 0, canRedo: future.current.length > 0, version };
}
