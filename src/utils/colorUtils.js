/**
 * colorUtils.js
 */

/**
 * Parse a CSS hex colour string into [r, g, b] integers.
 * Supports both #rrggbb and #rgb shorthand.
 * @param {string} hex
 * @returns {[number, number, number]}
 */
export function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const full =
    clean.length === 3
      ? clean
          .split("")
          .map((c) => c + c)
          .join("")
      : clean;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Adjust the brightness of a hex colour by a percentage.
 * Positive pct = lighter, negative pct = darker.
 * @param {string} hex
 * @param {number} pct  e.g. 30 = 30% brighter, -40 = 40% darker
 * @returns {string} rgb(…) string
 */
export function adjustBrightness(hex, pct) {
  const [r, g, b] = hexToRgb(hex);
  const f = 1 + pct / 100;
  return `rgb(${Math.min(255, (r * f) | 0)}, ${Math.min(255, (g * f) | 0)}, ${Math.min(
    255,
    (b * f) | 0
  )})`;
}

/**
 * Linearly interpolate between two hex colours.
 * @param {string} hex1  start colour
 * @param {string} hex2  end colour
 * @param {number} t     0–1
 * @returns {string} rgb(…) string
 */
export function lerpColor(hex1, hex2, t) {
  const [r1, g1, b1] = hexToRgb(hex1);
  const [r2, g2, b2] = hexToRgb(hex2);
  return `rgb(${((r1 + (r2 - r1) * t) | 0)}, ${((g1 + (g2 - g1) * t) | 0)}, ${(
    (b1 + (b2 - b1) * t) | 0
  )})`;
}

/**
 * Convert a hex colour to rgba with a given alpha.
 * @param {string} hex
 * @param {number} alpha  0–1
 * @returns {string}
 */
export function hexToRgba(hex, alpha) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}
