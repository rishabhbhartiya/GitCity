/**
 * themes.js — GitSkyline
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

  ocean: {
    name: "Ocean",
    bg: "#020c14",
    surface: "#061828",
    border: "#0d3050",
    text: "#cceeff",
    muted: "#2a6080",
    accent: "#00b4d8",
    glow: "#00b4d8",
    levels: ["#061828", "#0a3060", "#0a6090", "#0090c0", "#00b4d8"],
    winLit: "#90e0ff",
    winDark: "#0d2a44",
  },

  gold: {
    name: "Gold",
    bg: "#0c0900",
    surface: "#1a1200",
    border: "#3d2e00",
    text: "#fff3cc",
    muted: "#7a6020",
    accent: "#ffd700",
    glow: "#ffd700",
    levels: ["#1a1200", "#4a3000", "#806000", "#c09000", "#ffd700"],
    winLit: "#fff0a0",
    winDark: "#3d2e00",
  },

  ice: {
    name: "Ice",
    bg: "#060810",
    surface: "#0d1220",
    border: "#1e2e50",
    text: "#e8f0ff",
    muted: "#5060a0",
    accent: "#a8c8ff",
    glow: "#a8c8ff",
    levels: ["#0d1220", "#1a2a50", "#2a4a90", "#4a70d0", "#a8c8ff"],
    winLit: "#ffffff",
    winDark: "#1e2e50",
  },
};

export const DEFAULT_THEME = "matrix";