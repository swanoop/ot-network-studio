/*
 * Read-only analysis state shared with canvas nodes. Decorations (findings,
 * simulation hops, highlights) come from here instead of node.data, so they
 * never pollute the saved project or the undo history.
 */
import { createContext, useContext } from "react";
import type { Severity } from "../engine/rules";

export interface NodeDecoration {
  findings: number;
  worst?: Severity;
}

export interface DesignContextValue {
  decorations: Map<string, NodeDecoration>;
  zoneAssetCounts: Map<string, number>;
  zoneOfAsset: Map<string, string>;
  highlighted: Set<string>;
  simulation: {
    active: boolean;
    origins: Set<string>;
    hops: Map<string, number>;
    step: number;
  };
  showFindingBadges: boolean;
}

export const emptyDesignContext: DesignContextValue = {
  decorations: new Map(),
  zoneAssetCounts: new Map(),
  zoneOfAsset: new Map(),
  highlighted: new Set(),
  simulation: { active: false, origins: new Set(), hops: new Map(), step: Infinity },
  showFindingBadges: true
};

export const DesignContext = createContext<DesignContextValue>(emptyDesignContext);

export const useDesign = () => useContext(DesignContext);
