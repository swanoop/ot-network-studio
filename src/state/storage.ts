/*
 * Multi-project persistence in localStorage. Every access is guarded:
 * storage can be full, disabled or unavailable (private mode, sandboxed frames).
 */
import type { ProjectFile } from "../types";
import { normaliseProject } from "../engine/migrate";

export interface ProjectMeta {
  id: string;
  name: string;
  updatedAt: string;
  assets: number;
}

const INDEX_KEY = "otns.projects.v2";
const PROJECT_PREFIX = "otns.project.v2.";
const CURRENT_KEY = "otns.current.v2";
const LEGACY_KEY = "ot-network-studio.project.v1";
const CLIPBOARD_KEY = "otns.clipboard.v2";

function read(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
function write(key: string, value: string): boolean {
  try { window.localStorage.setItem(key, value); return true; } catch { return false; }
}
function remove(key: string) {
  try { window.localStorage.removeItem(key); } catch { /* ignore */ }
}

export function newId(prefix = "p"): string {
  const rand = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${rand}`;
}

export function listProjects(): ProjectMeta[] {
  try {
    const parsed = JSON.parse(read(INDEX_KEY) ?? "[]");
    return Array.isArray(parsed) ? (parsed as ProjectMeta[]).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)) : [];
  } catch { return []; }
}

function writeIndex(list: ProjectMeta[]) {
  write(INDEX_KEY, JSON.stringify(list));
}

export function loadProject(id: string): ProjectFile | null {
  const raw = read(PROJECT_PREFIX + id);
  if (!raw) return null;
  try { return normaliseProject(JSON.parse(raw)).project; } catch { return null; }
}

/** Returns false if the browser refused to store it (quota, disabled). */
export function saveProject(id: string, project: ProjectFile): boolean {
  const ok = write(PROJECT_PREFIX + id, JSON.stringify(project));
  if (!ok) return false;
  const meta: ProjectMeta = { id, name: project.name, updatedAt: project.updatedAt, assets: project.nodes.filter((n) => n.data.kind === "asset").length };
  writeIndex([meta, ...listProjects().filter((p) => p.id !== id)]);
  return true;
}

export function deleteProject(id: string) {
  remove(PROJECT_PREFIX + id);
  writeIndex(listProjects().filter((p) => p.id !== id));
}

export function getCurrentId(): string | null { return read(CURRENT_KEY); }
export function setCurrentId(id: string) { write(CURRENT_KEY, id); }

/** One-off import of the single v1 autosave slot into the project list. */
export function migrateLegacy(): string | null {
  const raw = read(LEGACY_KEY);
  if (!raw) return null;
  try {
    const { project } = normaliseProject(JSON.parse(raw));
    const id = newId();
    if (saveProject(id, project)) { remove(LEGACY_KEY); return id; }
  } catch { remove(LEGACY_KEY); }
  return null;
}

export function readClipboard<T>(): T | null {
  try { return JSON.parse(read(CLIPBOARD_KEY) ?? "null") as T | null; } catch { return null; }
}
export function writeClipboard(value: unknown) { write(CLIPBOARD_KEY, JSON.stringify(value)); }

export function readPref<T extends string>(key: string, fallback: T): T {
  return (read(`otns.pref.${key}`) as T | null) ?? fallback;
}
export function writePref(key: string, value: string) { write(`otns.pref.${key}`, value); }
