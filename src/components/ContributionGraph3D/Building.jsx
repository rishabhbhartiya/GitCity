/**
 * Building.jsx
 */

import { useMemo } from "react";
import { adjustBrightness } from "../../utils/colorUtils";
import { TILE_W, TILE_H, MAX_BUILD_H, MIN_BUILD_H } from "../../constants/graph";

export function Building({ cell, maxCount, theme, hovered }) {
  const { count, date } = cell;
  const empty = count === 0;
  const ratio = empty ? 0 : count / Math.max(maxCount, 1);

  // Strictly linear height — taller = more commits
  const H = empty
    ? MIN_BUILD_H
    : Math.max(4, MIN_BUILD_H + ratio * (MAX_BUILD_H - MIN_BUILD_H));

  const TW = TILE_W, TH = TILE_H;

  // Colours
  const level    = empty ? 0 : Math.min(4, Math.ceil(ratio * 4));
  const base     = theme.levels[level];
  const colTop   = hovered ? adjustBrightness(base, 65)  : adjustBrightness(base, 35);
  const colLeft  = hovered ? adjustBrightness(base, 15)  : base;
  const colRight = hovered ? adjustBrightness(base, -8)  : adjustBrightness(base, -35);
  const colEdge  = adjustBrightness(base, -55);

  // Geometry
  const Tx = 0,        Ty = 0;
  const Lx = -TW / 2,  Ly = TH / 2;
  const Bx = 0,        By = TH;
  const Rx =  TW / 2,  Ry = TH / 2;
  const LBy = Ly + H,  BBy = By + H,  RBy = Ry + H;

  // Windows —————————————————————————————————————————————————————————————
  // Floor height: minimum 8 px so windows aren't crushed
  const seed   = date ? parseInt(date.replace(/-/g, ""), 10) : 0;
  const floors = empty || H < 14 ? 0 : Math.max(1, Math.floor(H / 9));

  // Window size: small, fixed — scale with tile, not building height
  const wW = Math.max(1.5, TW * 0.13);   // ~1.5 px wide
  const wH = Math.max(1.5, TH * 0.55);   // ~1.5 px tall

  const windows = useMemo(() => {
    if (floors === 0) return [];
    const ws = [];
    for (let f = 0; f < floors; f++) {
      // LEFT face — 2 windows per floor, horizontally centred
      ws.push({ f, face: "L", col: 0, lit: ((seed * (f + 1) * 3 + 1) % 7) > 2 });
      ws.push({ f, face: "L", col: 1, lit: ((seed * (f + 1) * 5 + 2) % 7) > 2 });
      // RIGHT face — 2 windows per floor
      ws.push({ f, face: "R", col: 0, lit: ((seed * (f + 1) * 7 + 3) % 7) > 2 });
      ws.push({ f, face: "R", col: 1, lit: ((seed * (f + 1) * 11+ 4) % 7) > 2 });
    }
    return ws;
  }, [date, floors, seed]);

  const glow = hovered
    ? `drop-shadow(0 0 4px ${theme.glow}) drop-shadow(0 0 10px ${theme.glow}50)`
    : "none";

  return (
    <g style={{ filter: glow, transition: "filter 0.12s", cursor: "pointer" }}>

      {/* Right face — draw first (further from viewer) */}
      <polygon
        points={`${Rx},${Ry} ${Bx},${By} ${Bx},${BBy} ${Rx},${RBy}`}
        fill={colRight} stroke={colEdge} strokeWidth={0.4}
      />

      {/* Left face */}
      <polygon
        points={`${Lx},${Ly} ${Bx},${By} ${Bx},${BBy} ${Lx},${LBy}`}
        fill={colLeft} stroke={colEdge} strokeWidth={0.4}
      />

      {/* Top rhombus face */}
      <polygon
        points={`${Tx},${Ty} ${Rx},${Ry} ${Bx},${By} ${Lx},${Ly}`}
        fill={colTop} stroke={colEdge} strokeWidth={0.4}
      />

      {/* Roof highlight line */}
      {!empty && (
        <polyline
          points={`${Lx},${Ly} ${Tx},${Ty} ${Rx},${Ry}`}
          fill="none"
          stroke={adjustBrightness(base, 90)}
          strokeWidth={0.55}
          opacity={0.5}
        />
      )}

      {/* LEFT-face windows
          Face occupies x: [Lx … Bx] = [-TW/2 … 0], width = TW/2
          2 columns, each column centred in its half */}
      {windows.map(({ f, face, col, lit }) => {
        if (face !== "L") return null;
        const fH      = H / floors;
        const faceW   = TW / 2;                          // total face width
        const colW    = faceW / 2;                        // each column width
        // Centre window in this column
        const wx      = Lx + col * colW + (colW - wW) / 2;
        // Y: bottom of shaft upward, slight inset
        const wy      = By + H - (f + 1) * fH + fH * 0.28;
        return (
          <rect key={`lw${f}c${col}`}
            x={wx} y={wy} width={wW} height={wH} rx={0.4}
            fill={lit ? theme.winLit : theme.winDark}
            opacity={lit ? (hovered ? 1 : 0.88) : 0.18}
          />
        );
      })}

      {/* RIGHT-face windows
          Face occupies x: [Bx … Rx] = [0 … TW/2], width = TW/2
          2 columns */}
      {windows.map(({ f, face, col, lit }) => {
        if (face !== "R") return null;
        const fH      = H / floors;
        const faceW   = TW / 2;
        const colW    = faceW / 2;
        const wx      = Bx + col * colW + (colW - wW) / 2;
        const wy      = By + H - (f + 1) * fH + fH * 0.28;
        return (
          <rect key={`rw${f}c${col}`}
            x={wx} y={wy} width={wW} height={wH} rx={0.4}
            fill={lit ? theme.winLit : theme.winDark}
            opacity={lit ? 0.62 : 0.13}
          />
        );
      })}

      {/* Antenna — only tall buildings */}
      {H > 36 && !empty && (
        <>
          <line
            x1={Tx} y1={Ty - 10} x2={Tx} y2={Ty}
            stroke={adjustBrightness(base, 55)} strokeWidth={0.7}
          />
          <circle cx={Tx} cy={Ty - 10} r={1.2}
            fill={hovered ? theme.accent : adjustBrightness(base, 80)}
            style={{ filter: hovered ? `drop-shadow(0 0 3px ${theme.accent})` : "none" }}
          />
        </>
      )}

      {/* Hover ring on top face */}
      {hovered && (
        <polygon
          points={`${Tx},${Ty} ${Rx},${Ry} ${Bx},${By} ${Lx},${Ly}`}
          fill="none" stroke={theme.accent} strokeWidth={1.2} opacity={0.95}
        />
      )}
    </g>
  );
}
