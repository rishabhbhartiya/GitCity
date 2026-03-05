/**
 * themes.js
 * All colour themes for the 3D Contribution Graph.
 * Each theme controls: backgrounds, borders, text, glow,
 * 5-level contribution colours, and window colours.
 *
 * Add your own by following the same shape.
 */

export const THEMES = {
  matrix: {
    name: "Matrix",
    bg: "#060d06",
    surface: "#0c1a0c",
    border: "#1a3320",
    text: "#b0ffb0",
    muted: "#3d6b3d",
    accent: "#00ff41",
    glow: "#00ff41",
    levels: ["#0c1a0c", "#0e4020", "#1a7535", "#27ae60", "#00ff41"],
    winLit: "#ccffcc",
    winDark: "#1a3320",
  },
  noir: {
    name: "Noir",
    bg: "#04080f",
    surface: "#0c1525",
    border: "#1a2e50",
    text: "#e0f4ff",
    muted: "#3d6080",
    accent: "#00d4ff",
    glow: "#00d4ff",
    levels: ["#0c1525", "#0d2d4e", "#0e5080", "#1a8fc1", "#00d4ff"],
    winLit: "#ffe066",
    winDark: "#1a2e50",
  },
  ember: {
    name: "Ember",
    bg: "#0f0500",
    surface: "#200b00",
    border: "#4a1a00",
    text: "#ffe5cc",
    muted: "#7a3a15",
    accent: "#ff6a00",
    glow: "#ff4500",
    levels: ["#200b00", "#5c1a00", "#a03000", "#e05500", "#ff6a00"],
    winLit: "#ffcc44",
    winDark: "#3a1000",
  },
  aurora: {
    name: "Aurora",
    bg: "#030710",
    surface: "#0a1428",
    border: "#1a2a50",
    text: "#d0e8ff",
    muted: "#4060a0",
    accent: "#a855f7",
    glow: "#a855f7",
    levels: ["#0a1428", "#2d1060", "#5b20a0", "#8b35d0", "#a855f7"],
    winLit: "#e0aaff",
    winDark: "#1a0a40",
  },
  sakura: {
    name: "Sakura",
    bg: "#0f060a",
    surface: "#1a0c12",
    border: "#3d1a28",
    text: "#ffe0ee",
    muted: "#7a3a55",
    accent: "#ff79c6",
    glow: "#ff79c6",
    levels: ["#1a0c12", "#4d1a30", "#8b2252", "#cc3380", "#ff79c6"],
    winLit: "#ffccee",
    winDark: "#3d1a28",
  },
};

export const DEFAULT_THEME = "matrix";
