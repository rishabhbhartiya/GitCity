/**
 * GraphLegend.jsx
 */

export function GraphLegend({ theme }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.45rem",
        justifyContent: "flex-end",
        marginTop: "0.6rem",
      }}
    >
      <span style={{ fontSize: "0.68rem", color: theme.muted }}>Less</span>

      {theme.levels.map((color, i) => (
        <div
          key={i}
          style={{
            width: 13,
            height: 13,
            borderRadius: 3,
            background: color,
            border: `1px solid ${theme.border}`,
            boxShadow: i === theme.levels.length - 1 ? `0 0 7px ${theme.glow}80` : "none",
          }}
        />
      ))}

      <span style={{ fontSize: "0.68rem", color: theme.muted }}>More</span>
    </div>
  );
}
