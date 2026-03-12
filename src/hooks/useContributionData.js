/**
 * useContributionData.js
 *
 * Processes raw contribution data into cells.
 * Handles single-year and multi-year data from the API.
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
  const cells = useMemo(() => {
    if (!rawContributions) return generateDemoData(53);
    return normaliseContributions(rawContributions);
  }, [rawContributions]);

  const stats = useMemo(() => computeStats(cells), [cells]);
  const monthLabels = useMemo(() => buildMonthLabels(cells), [cells]);

  // Available years derived from data
  const availableYears = useMemo(() => {
    const years = new Set(cells.map(c => new Date(c.date).getFullYear()));
    return Array.from(years).sort((a, b) => a - b);
  }, [cells]);

  const positionedCells = useMemo(
    () => cells.map((c) => ({
      ...c,
      bx: c.week * (BIRDS_CELL + BIRDS_GAP),
      by: c.day * (BIRDS_CELL + BIRDS_GAP),
    })),
    [cells]
  );

  const sortedCells = useMemo(
    () => [...positionedCells].sort((a, b) => a.week * 7 + a.day - (b.week * 7 + b.day)),
    [positionedCells]
  );

  return { cells: positionedCells, sortedCells, stats, monthLabels, availableYears };
}