/**
 * ThemePicker.jsx
 * Renders a row of labelled buttons to switch between graph themes.
 *
 * Props:
 *   themes        object   – the THEMES map from constants/themes.js
 *   activeTheme   string   – key of the currently active theme
 *   onSelect      fn(key)  – called when a theme button is clicked
 *   currentTheme  object   – resolved theme object for the active theme
 */

export function ThemePicker({ themes, activeTheme, onSelect, currentTheme }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", alignItems: "flex-end" }}>
      <span
        style={{
          fontSize: "0.58rem",
          color: currentTheme.muted,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        District
      </span>

      <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
        {Object.entries(themes).map(([key, t]) => {
          const isActive = activeTheme === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              style={{
                padding: "0.22rem 0.6rem",
                borderRadius: "4px",
                fontSize: "0.63rem",
                fontFamily: "inherit",
                letterSpacing: "0.06em",
                cursor: "pointer",
                background: isActive ? t.accent : "transparent",
                color: isActive ? "#000" : t.accent,
                border: `1px solid ${t.accent}55`,
                transition: "all 0.2s",
                boxShadow: isActive ? `0 0 14px ${t.glow}70` : "none",
                fontWeight: isActive ? 700 : 400,
              }}
            >
              {t.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
