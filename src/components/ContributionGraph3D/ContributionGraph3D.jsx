/**
 * ContributionGraph3D.jsx — GitCity
 * Four views: Isometric 3D | Bird's Eye | City Simulation 
 */

import { useState, useMemo } from "react";
import { THEMES, DEFAULT_THEME } from "../../constants/themes";
import { useContributionData } from "../../hooks/useContributionData";
import { useMousePosition } from "../../hooks/useMousePosition";
import { useMountAnimation } from "../../hooks/useMountAnimation";

import { IsometricGrid } from "./IsometricGrid";
import { BirdsEyeGrid } from "./BirdsEyeGrid";
import { CitySimulation } from "./Citysimulation";
import { Tooltip } from "./Tooltip";
import { StatsBar } from "./StatsBar";
import { ThemePicker } from "./ThemePicker";
import { ViewToggle } from "./ViewToggle";
import { GraphLegend } from "./GraphLegend";

// ── Filter helpers ────────────────────────────────────────────────────────────
function getDateRange(range) {
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  if (/^\d{4}$/.test(range)) {
    const y = parseInt(range);
    return { from: `${y}-01-01`, to: `${y}-12-31` };
  }

  switch (range) {
    case "12m": { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return { from: d.toISOString().slice(0, 10), to: todayStr }; }
    case "6m": { const d = new Date(today); d.setMonth(d.getMonth() - 6); return { from: d.toISOString().slice(0, 10), to: todayStr }; }
    case "3m": { const d = new Date(today); d.setMonth(d.getMonth() - 3); return { from: d.toISOString().slice(0, 10), to: todayStr }; }
    case "month": return { from: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`, to: todayStr };
    case "week": { const d = new Date(today); d.setDate(d.getDate() - d.getDay()); return { from: d.toISOString().slice(0, 10), to: todayStr }; }
    default: { const d = new Date(today); d.setFullYear(d.getFullYear() - 1); return { from: d.toISOString().slice(0, 10), to: todayStr }; }
  }
}

function applyFilter(cells, range) {
  const { from, to } = getDateRange(range);
  let filtered = cells;
  if (from) filtered = filtered.filter(c => c.date >= from);
  if (to) filtered = filtered.filter(c => c.date <= to);
  if (!filtered.length) return filtered;

  if (/^\d{4}$/.test(range)) {
    const y = parseInt(range);
    const jan1 = new Date(`${y}-01-01`);
    const startDow = jan1.getDay();
    return filtered.map(c => {
      const date = new Date(c.date);
      const diffDays = Math.floor((date - jan1) / 86400000) + startDow;
      return { ...c, week: Math.floor(diffDays / 7), day: date.getDay() };
    });
  }
  const minWeek = Math.min(...filtered.map(c => c.week));
  return filtered.map(c => ({ ...c, week: c.week - minWeek }));
}

function calcStats(cells) {
  if (!cells.length) return { total: 0, maxCount: 0, busiest: null, maxStreak: 0, curStreak: 0, activeDays: 0 };
  const total = cells.reduce((s, c) => s + c.count, 0);
  const maxCount = Math.max(...cells.map(c => c.count));
  const busiest = cells.find(c => c.count === maxCount) ?? null;
  let maxStreak = 0, cur = 0;
  cells.forEach(c => { if (c.count > 0) { cur++; if (cur > maxStreak) maxStreak = cur; } else cur = 0; });
  let curStreak = 0;
  for (let i = cells.length - 1; i >= 0; i--) { if (cells[i].count > 0) curStreak++; else break; }
  const activeDays = cells.filter(c => c.count > 0).length;
  return { total, maxCount, busiest, maxStreak, curStreak, activeDays };
}

function calcMonthLabels(cells) {
  const seenKey = new Set(), labels = [];
  const byWeek = {};
  cells.forEach(c => { (byWeek[c.week] ??= []).push(c); });
  Object.keys(byWeek).map(Number).sort((a, b) => a - b).forEach(week => {
    const sun = byWeek[week].find(c => c.day === 0) || byWeek[week][0];
    const d = new Date(sun.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!seenKey.has(key)) { seenKey.add(key); labels.push({ week, label: d.toLocaleString("default", { month: "short" }) }); }
  });
  return labels;
}

// ── URL helpers ───────────────────────────────────────────────────────────────
const VIEW_TO_SLUG = {
  iso: "isometric",
  birds: "heatmap",
  city: "simulation",
};
const SLUG_TO_VIEW = {
  isometric: "iso",
  heatmap: "birds",
  simulation: "city",
};

function getUsername() {
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  return pathParts[0] || "";
}

// ── Toolbar label per view ────────────────────────────────────────────────────
const VIEW_LABELS = {
  iso: "⬡ Isometric 3D",
  birds: "⊞ Bird's Eye",
  city: "⛙ City Simulation",
};

// ── Component ─────────────────────────────────────────────────────────────────
export function ContributionGraph3D({
  contributions: rawContributions = null,
  themeName = DEFAULT_THEME,
  title = "GitCity",
  profile = null,
  defaultView = null,
  username = "",
}) {
  const [activeTheme, setActiveTheme] = useState(themeName);
  const [view, setView] = useState(SLUG_TO_VIEW[defaultView] || "iso");
  const [timeRange, setTimeRange] = useState("12m");
  const [hoveredCell, setHoveredCell] = useState(null);

  const theme = THEMES[activeTheme] ?? THEMES[DEFAULT_THEME];
  const mouse = useMousePosition();
  const mounted = useMountAnimation(`${activeTheme}-${view}-${timeRange}`);

  const { cells: allCells, availableYears } = useContributionData(rawContributions);

  const filteredCells = useMemo(() => applyFilter(allCells, timeRange), [allCells, timeRange]);

  const sortedCells = useMemo(
    () => [...filteredCells].sort((a, b) => {
      const s = (a.week + a.day) - (b.week + b.day);
      return s !== 0 ? s : a.day - b.day;
    }),
    [filteredCells]
  );

  const stats = useMemo(() => calcStats(filteredCells), [filteredCells]);
  const monthLabels = useMemo(() => calcMonthLabels(filteredCells), [filteredCells]);
  const allStats = useMemo(() => calcStats(allCells), [allCells]);

  // Hide stats bar + filters + legend + tooltip for full-canvas views
  const isFullCanvas = view === "city";

  // ── View change — update state + URL ────────────────────────────────────────
  function handleViewChange(newView) {
    setView(newView);
    const user = getUsername() || username;
    if (user) {
      const slug = VIEW_TO_SLUG[newView] || "isometric";
      window.history.pushState({}, "", `/${user}/${slug}`);
    }
  }

  const rollingFilters = [
    { key: "12m", label: "12 Months" },
    { key: "6m", label: "6 Months" },
    { key: "3m", label: "3 Months" },
    { key: "month", label: "Month" },
    { key: "week", label: "Week" },
  ];

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
      gap: "0.4rem",
      boxSizing: "border-box",
    }}>

      {/* BG grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: `linear-gradient(${theme.border}10 1px,transparent 1px),linear-gradient(90deg,${theme.border}10 1px,transparent 1px)`,
        backgroundSize: "48px 48px",
      }} />
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0,
        background: `radial-gradient(ellipse at 50% 25%,transparent 45%,${theme.bg}a0 100%)`,
      }} />

      {/* ── HEADER ── */}
      <div style={{ position: "relative", zIndex: 1, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
          <div>
            <div style={{ fontSize: "0.52rem", letterSpacing: "0.2em", color: theme.muted, textTransform: "uppercase", marginBottom: "0.15rem" }}>
              ◈ GitCity · gitcity.natrajx.in
            </div>
            <h1 style={{
              margin: 0, fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.03em", color: theme.accent,
              textShadow: `0 0 25px ${theme.glow}55, 0 0 50px ${theme.glow}20`,
            }}>{title}</h1>
            <p style={{ margin: "0.15rem 0 0", color: theme.muted, fontSize: "0.68rem" }}>
              {allStats.total.toLocaleString()} contributions · all time
            </p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-end" }}>
            <ThemePicker themes={THEMES} activeTheme={activeTheme} onSelect={setActiveTheme} currentTheme={theme} />
            <ViewToggle view={view} onToggle={handleViewChange} theme={theme} />
          </div>
        </div>
      </div>

      {/* ── STATS BAR — hide for full-canvas views ── */}
      {!isFullCanvas && (
        <div style={{ position: "relative", zIndex: 1, flexShrink: 0 }}>
          <StatsBar stats={stats} theme={theme} />
        </div>
      )}

      {/* ── GRAPH PANEL ── */}
      <div style={{
        position: "relative", zIndex: 1,
        background: `${theme.surface}88`,
        border: `1px solid ${theme.border}`,
        borderRadius: "14px",
        backdropFilter: "blur(14px)",
        boxShadow: `0 0 40px ${theme.glow}05, inset 0 1px 0 ${theme.border}60`,
        flex: 1, minHeight: 0,
        display: "flex", flexDirection: "column",
      }}>

        {/* ── TOOLBAR ── */}
        <div style={{
          flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0.4rem 0.85rem", flexWrap: "wrap", gap: "0.35rem",
          borderBottom: `1px solid ${theme.border}40`,
        }}>
          {/* View label badge */}
          <div style={{
            fontSize: "0.54rem", color: theme.muted, letterSpacing: "0.13em", textTransform: "uppercase",
            background: `${theme.border}45`, padding: "0.14rem 0.4rem", borderRadius: "4px",
          }}>
            {VIEW_LABELS[view] || "⬡ Isometric 3D"}
          </div>

          {/* Time filters — only for iso + birds */}
          {!isFullCanvas && (
            <div style={{ display: "flex", gap: "0.2rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
              {rollingFilters.map(({ key, label }) => {
                const active = timeRange === key;
                return (
                  <button key={key} onClick={() => setTimeRange(key)} style={{
                    padding: "0.16rem 0.4rem", fontSize: "0.58rem", fontFamily: "inherit",
                    cursor: "pointer", borderRadius: "4px",
                    border: `1px solid ${active ? theme.accent : theme.border}`,
                    background: active ? `${theme.accent}1e` : "transparent",
                    color: active ? theme.accent : theme.muted,
                    transition: "all 0.15s", fontWeight: active ? 700 : 400,
                    boxShadow: active ? `0 0 6px ${theme.glow}30` : "none",
                  }}>
                    {label}
                  </button>
                );
              })}

              {availableYears.length > 0 && (
                <div style={{ width: 1, background: theme.border, margin: "0 0.1rem", alignSelf: "stretch" }} />
              )}

              {[...availableYears].reverse().map(year => {
                const active = timeRange === String(year);
                return (
                  <button key={year} onClick={() => setTimeRange(String(year))} style={{
                    padding: "0.16rem 0.4rem", fontSize: "0.58rem", fontFamily: "inherit",
                    cursor: "pointer", borderRadius: "4px",
                    border: `1px solid ${active ? theme.accent : theme.border}`,
                    background: active ? `${theme.accent}1e` : "transparent",
                    color: active ? theme.accent : theme.muted,
                    transition: "all 0.15s", fontWeight: active ? 700 : 400,
                    boxShadow: active ? `0 0 6px ${theme.glow}30` : "none",
                  }}>
                    {year}
                  </button>
                );
              })}
            </div>
          )}

          {/* Simulation hint */}
          {view === "city" && (
            <div style={{ fontSize: "0.55rem", color: theme.muted, opacity: 0.7 }}>
              WASD / Arrow keys to drive · All-time data
            </div>
          )}
        </div>

        {/* ── CONTENT AREA ── */}
        <div style={{
          flex: 1, minHeight: 0,
          padding: isFullCanvas ? 0 : "0.4rem 0.75rem 0.25rem",
          overflow: "hidden",
        }}>
          {view === "iso" && (
            <IsometricGrid
              sortedCells={sortedCells} stats={stats} monthLabels={monthLabels}
              theme={theme} mounted={mounted}
              hoveredDate={hoveredCell?.date ?? null} onHover={setHoveredCell}
            />
          )}

          {view === "birds" && (
            <BirdsEyeGrid
              sortedCells={sortedCells} stats={stats} monthLabels={monthLabels}
              theme={theme} mounted={mounted}
              hoveredDate={hoveredCell?.date ?? null} onHover={setHoveredCell}
            />
          )}

          {view === "city" && (
            <CitySimulation
              cells={allCells}
              stats={allStats}
              theme={theme}
              profile={profile}
            />
          )}

        </div>

        {/* Legend — only for iso + birds */}
        {!isFullCanvas && (
          <div style={{ flexShrink: 0, padding: "0 0.85rem 0.4rem" }}>
            <GraphLegend theme={theme} />
          </div>
        )}
      </div>

      {/* Tooltip — only for iso + birds */}
      {!isFullCanvas && (
        <Tooltip cell={hoveredCell} x={mouse.x} y={mouse.y} theme={theme} />
      )}
    </div>
  );
}