/**
 * ViewToggle.jsx
 * Toggle: 3D Skyline | Bird's Eye | City Simulation
 */

export function ViewToggle({ view, onToggle, theme }) {
  const options = [
    { key: "iso", icon: "⬡", label: "3D Skyline" },
    { key: "birds", icon: "⊞", label: "Bird's Eye" },
    { key: "city", icon: "⛙", label: "Simulation" },
  ];

  return (
    <div style={{
      display: "inline-flex",
      background: theme.surface,
      border: `1px solid ${theme.border}`,
      borderRadius: "8px",
      overflow: "hidden",
      flexShrink: 0,
    }}>
      {options.map(({ key, icon, label }, idx) => {
        const active = view === key;
        return (
          <button
            key={key}
            onClick={() => onToggle(key)}
            style={{
              padding: "0.4rem 0.9rem",
              fontSize: "0.68rem",
              fontFamily: "inherit",
              letterSpacing: "0.06em",
              cursor: "pointer",
              background: active ? theme.accent : "transparent",
              color: active ? theme.bg : theme.muted,
              border: "none",
              borderRight: idx < options.length - 1 ? `1px solid ${theme.border}` : "none",
              transition: "all 0.18s",
              fontWeight: active ? 700 : 400,
              boxShadow: active ? `inset 0 0 12px ${theme.glow}30` : "none",
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              whiteSpace: "nowrap",
            }}
          >
            <span style={{ fontSize: "0.75rem" }}>{icon}</span>
            {label}
          </button>
        );
      })}
    </div>
  );
}