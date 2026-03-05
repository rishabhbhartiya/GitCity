/**
 * index.js
 * Public API for the ContributionGraph3D component.
 * Import from this file, not from the sub-modules directly.
 *
 * Usage:
 *   import { ContributionGraph3D } from "./components/ContributionGraph3D";
 *
 *   // With demo data:
 *   <ContributionGraph3D />
 *
 *   // With your own data:
 *   <ContributionGraph3D
 *     contributions={[{ date: "2024-03-01", count: 5 }, ...]}
 *     themeName="noir"
 *     title="My GitHub Activity"
 *   />
 */

export { ContributionGraph3D } from "./ContributionGraph3D";

// Also export sub-components for advanced custom layouts
export { Building }      from "./Building";
export { IsometricGrid } from "./IsometricGrid";
export { Tooltip }       from "./Tooltip";
export { StatsBar }      from "./StatsBar";
export { ThemePicker }   from "./ThemePicker";
export { GraphLegend }   from "./GraphLegend";
