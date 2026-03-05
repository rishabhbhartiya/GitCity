/**
 * useContributionData.js
 *
 * Processes raw contribution data into cells, stats, and labels.
 * Screen positions (sx/sy) are now computed inside each grid component
 * since ISO and bird's-eye use completely different projection math.
 */

import { useMemo } from "react";
import {
  generateDemoData,
  computeStats,
  buildMonthLabels,
  normaliseContributions,
} from "../utils/dataUtils";
import { BIRDS_CELL, BIRDS_GAP } from "../constants/graph";

export function useContributionData(rawContributions) {
  // 1. Normalise or generate
  const cells = useMemo(() => {
    if (!rawContributions) return generateDemoData(53);
    return normaliseContributions(rawContributions);
  }, [rawContributions]);

  // 2. Stats
  const stats = useMemo(() => computeStats(cells), [cells]);

  // 3. Month labels
  const monthLabels = useMemo(() => buildMonthLabels(cells), [cells]);

  // 4. Attach bird's-eye positions (simple grid — iso positions done in IsometricGrid)
  const positionedCells = useMemo(
    () =>
      cells.map((c) => ({
        ...c,
        bx: c.week * (BIRDS_CELL + BIRDS_GAP),
        by: c.day  * (BIRDS_CELL + BIRDS_GAP),
      })),
    [cells]
  );

  // 5. Painter-order sort (used by both grids as starting point)
  const sortedCells = useMemo(
    () => [...positionedCells].sort((a, b) => a.week * 7 + a.day - (b.week * 7 + b.day)),
    [positionedCells]
  );

  return { cells: positionedCells, sortedCells, stats, monthLabels };
}
