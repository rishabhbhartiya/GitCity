/**
 * ContributionGraph3D.jsx
 *
 * Features:
 *  ✓ Time range filters: This Year / Last 12 Mo / 6 Mo / 3 Mo / Month / Week
 *  ✓ 3D Skyline ↔ Bird's Eye toggle
 *  ✓ 5 themes
 *  ✓ No overflow:hidden on outer wrapper — graph never clips
 *  ✓ Stats recompute for selected time range
 *  ✓ Month labels deduped in filtered view
 */

import { useState, useMemo } from "react";
import { THEMES, DEFAULT_THEME } from "../../constants/themes";
import { useContributionData }   from "../../hooks/useContributionData";
import { useMousePosition }      from "../../hooks/useMousePosition";
import { useMountAnimation }     from "../../hooks/useMountAnimation";

import { IsometricGrid } from "./IsometricGrid";
import { BirdsEyeGrid }  from "./BirdsEyeGrid";
import { Tooltip }       from "./Tooltip";
import { StatsBar }      from "./StatsBar";
import { ThemePicker }   from "./ThemePicker";
import { ViewToggle }    from "./ViewToggle";
import { GraphLegend }   from "./GraphLegend";

// ── Time filter helpers ───────────────────────────────────────────────────────
const TIME_FILTERS = [
  { key: "12m",   label: "Last 12 Mo" },
  { key: "year",  label: "This Year"  },
  { key: "6m",    label: "Last 6 Mo"  },
  { key: "3m",    label: "Last 3 Mo"  },
  { key: "month", label: "This Month" },
  { key: "week",  label: "This Week"  },
];

function getCutoff(range) {
  const today = new Date();
  switch (range) {
    case "year":  return new Date(today.getFullYear(), 0, 1);
    case "12m":   { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return d; }
    case "6m":    { const d = new Date(today); d.setMonth(d.getMonth() - 6);       return d; }
    case "3m":    { const d = new Date(today); d.setMonth(d.getMonth() - 3);       return d; }
    case "month": return new Date(today.getFullYear(), today.getMonth(), 1);
    case "week":  { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); return d; }
    default:      { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return d; }
  }
}

function applyFilter(cells, range) {
  const cutoffStr = getCutoff(range).toISOString().slice(0, 10);
  const filtered  = cells.filter((c) => c.date >= cutoffStr);
  if (!filtered.length) return filtered;
  const minWeek = Math.min(...filtered.map((c) => c.week));
  return filtered.map((c) => ({ ...c, week: c.week - minWeek }));
}

function calcStats(cells) {
  if (!cells.length) return { total: 0, maxCount: 0, busiest: null, maxStreak: 0, curStreak: 0, activeDays: 0, avgPerDay: 0 };
  const total    = cells.reduce((s, c) => s + c.count, 0);
  const maxCount = Math.max(...cells.map((c) => c.count));
  const busiest  = cells.find((c) => c.count === maxCount) ?? null;
  let maxStreak = 0, cur = 0;
  cells.forEach((c) => { if (c.count > 0) { cur++; if (cur > maxStreak) maxStreak = cur; } else cur = 0; });
  let curStreak = 0;
  for (let i = cells.length - 1; i >= 0; i--) { if (cells[i].count > 0) curStreak++; else break; }
  const activeDays = cells.filter((c) => c.count > 0).length;
  const avgPerDay  = activeDays ? Math.round(total / activeDays) : 0;
  return { total, maxCount, busiest, maxStreak, curStreak, activeDays, avgPerDay };
}

function calcMonthLabels(cells) {
  const seenKey = new Set(), labels = [];
  const byWeek  = {};
  cells.forEach((c) => { if (!byWeek[c.week]) byWeek[c.week] = []; byWeek[c.week].push(c); });
  Object.keys(byWeek).map(Number).sort((a, b) => a - b).forEach((week) => {
    const sun = byWeek[week].find((c) => c.day === 0) || byWeek[week][0];
    const d   = new Date(sun.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seenKey.has(key)) {
      seenKey.add(key);
      labels.push({ week, label: d.toLocaleString("default", { month: "short" }) });
    }
  });
  return labels;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ContributionGraph3D({
  contributions: rawContributions = null,
  themeName = DEFAULT_THEME,
  title = "Code Skyline",
}) {
  const [activeTheme, setActiveTheme] = useState(themeName);
  const [view,        setView]        = useState("iso");
  const [timeRange,   setTimeRange]   = useState("12m");
  const [hoveredCell, setHoveredCell] = useState(null);

  const theme   = THEMES[activeTheme] ?? THEMES[DEFAULT_THEME];
  const mouse   = useMousePosition();
  const mounted = useMountAnimation(`${activeTheme}-${view}-${timeRange}`);

  // Raw full-year data
  const { cells: allCells } = useContributionData(rawContributions);

  // Apply time filter + re-index weeks
  const filteredCells = useMemo(() => applyFilter(allCells, timeRange), [allCells, timeRange]);

  // Painter-order sort
  const sortedCells = useMemo(
    () => [...filteredCells].sort((a, b) => {
      const s = (a.week + a.day) - (b.week + b.day);
      return s !== 0 ? s : a.day - b.day;
    }),
    [filteredCells]
  );

  const stats       = useMemo(() => calcStats(filteredCells),      [filteredCells]);
  const monthLabels = useMemo(() => calcMonthLabels(filteredCells), [filteredCells]);
  const allStats    = useMemo(() => calcStats(allCells),            [allCells]);

  const GridComponent = view === "iso" ? IsometricGrid : BirdsEyeGrid;

  return (
    <div style={{
      fontFamily: "'Courier New', monospace",
      background: `radial-gradient(ellipse 80% 60% at 30% 10%, ${theme.surface} 0%, ${theme.bg} 65%)`,
      height: "100vh",
      overflow: "hidden",
      padding: "0.75rem 1rem",
      color: theme.text,
      transition: "background 0.5s",
      position: "relative",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      boxSizing: "border-box",
    }}>

      {/* BG grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `linear-gradient(${theme.border}10 1px, transparent 1px),
                          linear-gradient(90deg, ${theme.border}10 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
      }} />
      {/* BG vignette */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse at 50% 25%, transparent 45%, ${theme.bg}a0 100%)`,
      }} />

      {/* ── HEADER ── */}
      <div style={{ position: "relative", zIndex: 1, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <div style={{ fontSize: "0.55rem", letterSpacing: "0.2em", color: theme.muted, textTransform: "uppercase", marginBottom: "0.2rem" }}>
              ◈ 3D Contribution Skyline
            </div>
            <h1 style={{
              margin: 0, fontSize: "1.75rem", fontWeight: 900, letterSpacing: "-0.03em",
              color: theme.accent,
              textShadow: `0 0 25px ${theme.glow}55, 0 0 50px ${theme.glow}20`,
            }}>{title}</h1>
            <p style={{ margin: "0.2rem 0 0", color: theme.muted, fontSize: "0.73rem" }}>
              {allStats.total.toLocaleString()} contributions · all time
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem", alignItems: "flex-end" }}>
            <ThemePicker themes={THEMES} activeTheme={activeTheme} onSelect={setActiveTheme} currentTheme={theme} />
            <ViewToggle view={view} onToggle={setView} theme={theme} />
          </div>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div style={{ position: "relative", zIndex: 1, flexShrink: 0 }}>
        <StatsBar stats={stats} theme={theme} />
      </div>

      {/* ── GRAPH PANEL ── takes remaining viewport height */}
      <div style={{
        position: "relative", zIndex: 1,
        background: `${theme.surface}88`,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        backdropFilter: "blur(14px)",
        boxShadow: `0 0 40px ${theme.glow}05, inset 0 1px 0 ${theme.border}60`,
        flex: 1,             // grow to fill remaining height
        minHeight: 0,        // allow shrinking
        display: "flex",
        flexDirection: "column",
      }}>

        {/* Panel toolbar — fixed height */}
        <div style={{
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.5rem 0.85rem", flexWrap: "wrap", gap: "0.4rem",
          borderBottom: `1px solid ${theme.border}40`,
        }}>
          <div style={{
            fontSize: "0.56rem", color: theme.muted, letterSpacing: "0.13em",
            textTransform: "uppercase",
            background: `${theme.border}45`, padding: "0.16rem 0.45rem", borderRadius: "4px",
          }}>
            {view === "iso" ? "⬡ Isometric 3D" : "⊞ Bird's Eye"}
          </div>

          <div style={{ display: "flex", gap: "0.25rem", flexWrap: "wrap" }}>
            {TIME_FILTERS.map(({ key, label }) => {
              const active = timeRange === key;
              return (
                <button key={key} onClick={() => setTimeRange(key)} style={{
                  padding: "0.18rem 0.45rem",
                  fontSize: "0.6rem",
                  fontFamily: "inherit",
                  cursor: "pointer",
                  borderRadius: "4px",
                  border: `1px solid ${active ? theme.accent : theme.border}`,
                  background: active ? `${theme.accent}1e` : "transparent",
                  color: active ? theme.accent : theme.muted,
                  transition: "all 0.15s",
                  fontWeight: active ? 700 : 400,
                  boxShadow: active ? `0 0 6px ${theme.glow}30` : "none",
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* SVG area — flex-grows to fill remaining panel height */}
        <div style={{
          flex: 1,
          minHeight: 0,        // critical: lets flex child shrink below content size
          padding: "0.4rem 0.75rem 0.25rem",
          overflow: "hidden",  // no scroll — SVG scales to fit
        }}>
          <GridComponent
            sortedCells={sortedCells}
            stats={stats}
            monthLabels={monthLabels}
            theme={theme}
            mounted={mounted}
            hoveredDate={hoveredCell?.date ?? null}
            onHover={setHoveredCell}
          />
        </div>

        {/* Legend — fixed height */}
        <div style={{ flexShrink: 0, padding: "0 0.85rem 0.5rem" }}>
          <GraphLegend theme={theme} />
        </div>
      </div>

      {/* ── TOOLTIP ── */}
      <Tooltip cell={hoveredCell} x={mouse.x} y={mouse.y} theme={theme} />
    </div>
  );
}
