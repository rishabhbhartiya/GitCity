/**
 * BirdsEyeGrid.jsx
 * Top-down (bird's-eye) view of the contribution grid.
 * Classic GitHub-style heatmap but with height encoded as both colour AND
 * a subtle inner-glow / border to preserve the 3D feel.
 *
 * Props: same interface as IsometricGrid so ContributionGraph3D can
 * swap between them with a single flag.
 */

import { adjustBrightness } from "../../utils/colorUtils";
import {
  TOTAL_WEEKS,
  BIRDS_CELL,
  BIRDS_GAP,
  DAY_LABELS,
} from "../../constants/graph";

export function BirdsEyeGrid({
  sortedCells,
  stats,
  monthLabels,
  theme,
  mounted,
  hoveredDate,
  onHover,
}) {
  const S  = BIRDS_CELL;
  const G  = BIRDS_GAP;
  const LABEL_W = 28;
  const LABEL_H = 18;

  const svgW = LABEL_W + TOTAL_WEEKS * (S + G) + 10;
  const svgH = LABEL_H + 7 * (S + G) + 10;

  return (
    <svg
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ width: "100%", minWidth: 680, display: "block", overflow: "visible" }}
    >
      <defs>
        <filter id="beGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="1.5" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Month labels */}
      {monthLabels.map(({ week, label }) => (
        <text
          key={`bm${week}`}
          x={LABEL_W + week * (S + G) + S / 2}
          y={12}
          fill={theme.muted}
          fontSize="8"
          fontFamily="monospace"
          textAnchor="middle"
          opacity={0.75}
        >
          {label}
        </text>
      ))}

      {/* Day labels */}
      {[1, 3, 5].map((d) => (
        <text
          key={`bd${d}`}
          x={LABEL_W - 4}
          y={LABEL_H + d * (S + G) + S * 0.65}
          fill={theme.muted}
          fontSize="7"
          fontFamily="monospace"
          textAnchor="end"
          opacity={0.55}
        >
          {DAY_LABELS[d]}
        </text>
      ))}

      {/* Cells */}
      <g transform={`translate(${LABEL_W}, ${LABEL_H})`}>
        {sortedCells.map((cell) => {
          const { count, date, week, day } = cell;
          const isHov = hoveredDate === date;
          const level = count === 0 ? 0 : Math.min(4, Math.ceil((count / Math.max(stats.maxCount, 1)) * 4));
          const color = theme.levels[level];
          const idx   = week * 7 + day;
          const delay = mounted ? `${idx * 0.8}ms` : "0ms";

          // Height as bar inside the cell (visual indicator even in top-down)
          const heightPct = count === 0 ? 0 : 0.15 + (count / Math.max(stats.maxCount, 1)) * 0.7;
          const barH = S * heightPct;

          const cx = week * (S + G);
          const cy = day  * (S + G);

          return (
            <g
              key={date}
              style={{
                opacity: mounted ? 1 : 0,
                transition: `opacity 0.3s ${delay}`,
              }}
              onMouseEnter={() => onHover(cell)}
              onMouseLeave={() => onHover(null)}
            >
              {/* Base cell */}
              <rect
                x={cx} y={cy} width={S} height={S}
                rx={2}
                fill={color}
                stroke={isHov ? theme.accent : adjustBrightness(color, -40)}
                strokeWidth={isHov ? 1.5 : 0.4}
                style={{
                  filter: isHov ? `drop-shadow(0 0 4px ${theme.glow})` : "none",
                  transition: "stroke 0.1s, filter 0.1s",
                  cursor: "pointer",
                }}
              />

              {/* Inner height bar (shows relative contribution count) */}
              {count > 0 && (
                <rect
                  x={cx + S * 0.25}
                  y={cy + S - barH - S * 0.1}
                  width={S * 0.5}
                  height={barH}
                  rx={1}
                  fill={adjustBrightness(color, 50)}
                  opacity={isHov ? 0.95 : 0.55}
                />
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
