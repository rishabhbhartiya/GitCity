/**
 * Tooltip.jsx
 */

export function Tooltip({ cell, x, y, theme }) {
  if (!cell) return null;

  const { count, date } = cell;
  const formattedDate = new Date(date).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const TW = 180; // approximate tooltip width
  const TH = 130; // approximate tooltip height
  const GAP = 14; // gap from cursor

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Flip horizontally: show left of cursor if not enough space on right
  const flipX = x + GAP + TW > vw - 8;
  // Flip vertically: show below cursor if not enough space above
  const flipY = y - TH < 8;

  const left = flipX ? x - TW - GAP : x + GAP;
  const top = flipY ? y + GAP : y - TH;

  return (
    <div style={{
      position: "fixed",
      top,
      left,
      pointerEvents: "none",
      zIndex: 9999,
    }}>
      <div style={{
        background: theme.surface,
        border: `1px solid ${theme.accent}80`,
        borderRadius: "10px",
        padding: "0.75rem 1rem",
        boxShadow: `0 16px 40px rgba(0,0,0,0.7), 0 0 20px ${theme.glow}25`,
        minWidth: 160,
        maxWidth: TW,
      }}>
        {/* Accent top line */}
        <div style={{
          height: "2px", marginBottom: "0.55rem",
          background: `linear-gradient(90deg, ${theme.accent}00, ${theme.accent}, ${theme.accent}00)`,
          borderRadius: "1px",
        }} />

        {/* Count */}
        <div style={{
          color: theme.accent, fontWeight: 900,
          fontSize: "1.25rem", lineHeight: 1,
          textShadow: `0 0 10px ${theme.glow}`,
        }}>
          {count} commit{count !== 1 ? "s" : ""}
        </div>

        {/* Date */}
        <div style={{
          color: theme.text, fontSize: "0.72rem",
          marginTop: "0.3rem", lineHeight: 1.4, opacity: 0.9,
        }}>
          {formattedDate}
        </div>

        {/* Dot visualisation */}
        {count > 0 && (
          <div style={{
            display: "flex", gap: 3, flexWrap: "wrap",
            marginTop: "0.5rem", maxWidth: 140,
          }}>
            {Array.from({ length: Math.min(count, 20) }).map((_, i) => (
              <div key={i} style={{
                width: 6, height: 6, borderRadius: 1,
                background: theme.accent, opacity: 0.8,
              }} />
            ))}
            {count > 20 && (
              <span style={{ color: theme.muted, fontSize: "0.62rem", alignSelf: "center" }}>
                +{count - 20}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}