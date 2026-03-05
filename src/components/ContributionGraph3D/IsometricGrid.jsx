/**
 * IsometricGrid.jsx
 *
 * Fixed-viewBox SVG that scales to fill its container.
 * Buildings grow upward from ground plane.
 */

import { useMemo } from "react";
import { Building } from "./Building";
import {
  TILE_W, TILE_H, TOTAL_WEEKS, TOTAL_DAYS, MAX_BUILD_H, MIN_BUILD_H,
} from "../../constants/graph";

function gPos(week, day) {
  return {
    gx: (week - day) * (TILE_W / 2),
    gy: (week + day) * (TILE_H / 2),
  };
}

export function IsometricGrid({
  sortedCells, stats, monthLabels, theme, mounted, hoveredDate, onHover,
}) {
  const TW = TILE_W, TH = TILE_H;

  const minGX = gPos(0, TOTAL_DAYS - 1).gx;
  const maxGX = gPos(TOTAL_WEEKS - 1, 0).gx + TW;
  const maxGY = gPos(TOTAL_WEEKS - 1, TOTAL_DAYS - 1).gy + TH;

  const PAD_L = 8, PAD_T = MAX_BUILD_H + 12, PAD_R = 8, PAD_B = 10;
  const vbW = PAD_L + (maxGX - minGX) + PAD_R;
  const vbH = PAD_T + maxGY + PAD_B;
  const OX = PAD_L - minGX;
  const OY = PAD_T;

  const paintOrder = useMemo(
    () => [...sortedCells].sort((a, b) => {
      const s = (a.week + a.day) - (b.week + b.day);
      return s !== 0 ? s : a.day - b.day;
    }),
    [sortedCells]
  );

  const groundLines = useMemo(() => {
    const lines = [];
    for (let d = 0; d < TOTAL_DAYS; d++) {
      const p0 = gPos(0, d), p1 = gPos(TOTAL_WEEKS - 1, d);
      lines.push({ key: `d${d}`, x1: OX + p0.gx + TW / 2, y1: OY + p0.gy + TH / 2, x2: OX + p1.gx + TW / 2, y2: OY + p1.gy + TH / 2 });
    }
    for (let w = 0; w <= TOTAL_WEEKS - 1; w += 4) {
      const p0 = gPos(w, 0), p1 = gPos(w, TOTAL_DAYS - 1);
      lines.push({ key: `w${w}`, x1: OX + p0.gx + TW / 2, y1: OY + p0.gy + TH / 2, x2: OX + p1.gx + TW / 2, y2: OY + p1.gy + TH / 2 });
    }
    return lines;
  }, [OX, OY]);

  return (
    <svg
      viewBox={`0 0 ${vbW} ${vbH}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ width: "100%", height: "100%", display: "block" }}
    >
      <defs>
        <linearGradient id="fogB" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={theme.bg} stopOpacity="0" />
          <stop offset="100%" stopColor={theme.bg} stopOpacity="0.6" />
        </linearGradient>
      </defs>

      {/* Ground fill */}
      {(() => {
        const pts = [gPos(0, 0), gPos(TOTAL_WEEKS - 1, 0), gPos(TOTAL_WEEKS - 1, TOTAL_DAYS - 1), gPos(0, TOTAL_DAYS - 1)]
          .map(({ gx, gy }) => `${OX + gx + TW / 2},${OY + gy + TH / 2}`).join(" ");
        return <polygon points={pts} fill={`${theme.surface}30`} />;
      })()}

      {/* Ground grid */}
      {groundLines.map(({ key, x1, y1, x2, y2 }) => (
        <line key={key} x1={x1} y1={y1} x2={x2} y2={y2} stroke={`${theme.border}55`} strokeWidth={0.3} />
      ))}



      {/* Buildings */}
      <g>
        {paintOrder.map(cell => {
          const { gx, gy } = gPos(cell.week, cell.day);
          const ratio = cell.count === 0 ? 0 : cell.count / Math.max(stats.maxCount, 1);
          const H = cell.count === 0 ? MIN_BUILD_H : Math.max(3, ratio * (MAX_BUILD_H - MIN_BUILD_H));
          const isHov = hoveredDate === cell.date;
          const delay = mounted ? `${Math.min(cell.week * 8 + cell.day * 2, 500)}ms` : "0ms";
          return (
            <g key={cell.date}
              transform={`translate(${OX + gx}, ${OY + gy - H})`}
              style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.4s ${delay}` }}
              onMouseEnter={() => onHover(cell)}
              onMouseLeave={() => onHover(null)}
            >
              <Building cell={cell} maxCount={stats.maxCount} theme={theme} hovered={isHov} />
            </g>
          );
        })}
      </g>

      <rect x={0} y={vbH - 16} width={vbW} height={16} fill="url(#fogB)" pointerEvents="none" />
    </svg>
  );
}
