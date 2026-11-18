/*
 * Compromise / reachability simulation.
 *
 * Starting from one or more compromised assets, a breadth-first search
 * follows every path an attacker could use:
 *  - logical:  flows the compromised asset can initiate (respects direction,
 *              so data diodes and one-way flows block the reverse path)
 *  - physical: links, both ways (layer-2 adjacency, someone on the wire)
 *  - combined: both
 * Disabled edges (what-if switch) are ignored.
 */
import type { Model } from "./model";
import { initiators } from "./rules";

export type SimulationMode = "logical" | "physical" | "combined";

export interface SimulationOptions {
  mode: SimulationMode;
  /** Boundary devices are reached but not pivoted through. */
  boundaryHolds: boolean;
}

export interface SimulationStep { from: string; edgeId: string }

export interface SimulationResult {
  origins: string[];
  hops: Map<string, number>;
  parent: Map<string, SimulationStep>;
  edgesUsed: Set<string>;
  maxHop: number;
  reached: string[];
  criticalReached: string[];
  safetyReached: string[];
  zonesReached: string[];
}

export const DEFAULT_SIMULATION: SimulationOptions = { mode: "logical", boundaryHolds: false };

export function simulate(model: Model, origins: string[], options: SimulationOptions = DEFAULT_SIMULATION): SimulationResult {
  const adj = new Map<string, Array<{ to: string; edgeId: string }>>();
  const push = (from: string, to: string, edgeId: string) => {
    if (!adj.has(from)) adj.set(from, []);
    adj.get(from)!.push({ to, edgeId });
  };
  if (options.mode !== "physical") {
    for (const f of model.flows) for (const [from, to] of initiators(f)) push(from, to, f.id);
  }
  if (options.mode !== "logical") {
    for (const l of model.links) { push(l.source, l.target, l.id); push(l.target, l.source, l.id); }
  }

  const valid = origins.filter((id) => model.assets.has(id));
  const hops = new Map<string, number>(valid.map((id) => [id, 0]));
  const parent = new Map<string, SimulationStep>();
  const edgesUsed = new Set<string>();
  const queue = [...valid];
  while (queue.length) {
    const current = queue.shift()!;
    const asset = model.assets.get(current)!;
    if (options.boundaryHolds && asset.roles.boundary && !valid.includes(current)) continue;
    for (const { to, edgeId } of adj.get(current) ?? []) {
      if (hops.has(to)) continue;
      hops.set(to, hops.get(current)! + 1);
      parent.set(to, { from: current, edgeId });
      edgesUsed.add(edgeId);
      queue.push(to);
    }
  }

  const reached = [...hops.keys()].filter((id) => !valid.includes(id)).sort((a, b) => hops.get(a)! - hops.get(b)!);
  const zones = new Set<string>();
  for (const id of hops.keys()) { const z = model.assets.get(id)?.zoneId; if (z) zones.add(z); }
  return {
    origins: valid,
    hops,
    parent,
    edgesUsed,
    maxHop: Math.max(0, ...hops.values()),
    reached,
    criticalReached: reached.filter((id) => model.assets.get(id)!.data.criticality === "critical"),
    safetyReached: reached.filter((id) => model.assets.get(id)!.roles.safety),
    zonesReached: [...zones]
  };
}

/** Node ids from an origin to the target, following the BFS tree. */
export function attackPath(result: SimulationResult, target: string): string[] {
  const path: string[] = [];
  const guard = new Set<string>();
  let cur: string | undefined = target;
  while (cur !== undefined && !guard.has(cur)) {
    guard.add(cur);
    path.unshift(cur);
    cur = result.parent.get(cur)?.from;
  }
  return result.hops.has(target) ? path : [];
}

/** Edge ids on the attack path to the target. */
export function attackPathEdges(result: SimulationResult, target: string): string[] {
  const edges: string[] = [];
  let cur: string | undefined = target;
  const guard = new Set<string>();
  while (cur !== undefined && !guard.has(cur)) {
    guard.add(cur);
    const step = result.parent.get(cur);
    if (!step) break;
    edges.unshift(step.edgeId);
    cur = step.from;
  }
  return edges;
}
