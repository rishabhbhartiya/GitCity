/**
 * StatsBar.jsx — compact, high-contrast stats row.
 */

export function StatsBar({ stats, theme }) {
  const items = [
    { icon: "▦", label: "Total Commits",  value: stats.total.toLocaleString(),            sub: "selected range" },
    { icon: "⬆", label: "Peak Day",       value: stats.busiest ? `${stats.busiest.count} commits` : "—", sub: stats.busiest?.date ?? "" },
    { icon: "◈", label: "Longest Streak", value: `${stats.maxStreak} days`,               sub: "consecutive" },
    { icon: "◉", label: "Current Streak", value: `${stats.curStreak} days`,               sub: "active now" },
  ];

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(4, 1fr)",
      gap: "0.5rem",
      marginBottom: "0.65rem",
    }}>
      {items.map(({ icon, label, value, sub }) => (
        <div key={label} style={{
          background: theme.surface,
          border: `1px solid ${theme.border}`,
          borderRadius: "8px",
          padding: "0.5rem 0.75rem",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{
            position: "absolute", top: 0, left: 0, right: 0, height: "2px",
            background: `linear-gradient(90deg, ${theme.accent}00, ${theme.accent}, ${theme.accent}00)`,
          }} />
          <div style={{
            display: "flex", alignItems: "center", gap: "0.3rem",
            fontSize: "0.6rem", color: theme.muted,
            textTransform: "uppercase", letterSpacing: "0.1em",
            marginBottom: "0.2rem", marginTop: "0.05rem",
          }}>
            <span style={{ color: theme.accent, fontSize: "0.65rem" }}>{icon}</span>
            {label}
          </div>
          <div style={{
            fontSize: "1.15rem", fontWeight: 900, color: theme.accent,
            lineHeight: 1, letterSpacing: "-0.02em",
            textShadow: `0 0 10px ${theme.glow}55`,
          }}>{value}</div>
          {sub && (
            <div style={{ fontSize: "0.6rem", color: theme.muted, marginTop: "0.18rem", opacity: 0.8 }}>
              {sub}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
