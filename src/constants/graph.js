/**
 * graph.js
 */

// Tile (rhombus footprint of each day cell)
export const TILE_W      = 10;   // rhombus full width
export const TILE_H      = 5;    // rhombus full height

// Building heights (in same SVG units as tile)
export const MAX_BUILD_H = 48;   // tallest building
export const MIN_BUILD_H = 1;    // flat slab for 0-contribution days

// Grid size
export const TOTAL_WEEKS = 53;
export const TOTAL_DAYS  = 7;

// Bird's-eye
export const BIRDS_CELL = 9;
export const BIRDS_GAP  = 2;

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
