/**
 * GitHubConnect.jsx
 * Login screen — username only, no token needed.
 */

import { useState } from "react";

export function GitHubConnect({ onConnect, loading, error, theme }) {
  const [username, setUsername] = useState("");
  const [remember, setRemember] = useState(true);

  function handleSubmit() {
    if (!username.trim()) return;
    if (remember) {
      try { localStorage.setItem("gh_username", username.trim()); } catch (_) { }
    }
    onConnect(username.trim());
  }

  const inputStyle = {
    width: "100%",
    background: "#0d1117",
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
    padding: "0.7rem 1rem",
    color: theme.text,
    fontSize: "0.9rem",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const ready = !loading && username.trim().length > 0;

  return (
    <div style={{
      height: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: `radial-gradient(ellipse 80% 60% at 30% 10%, ${theme.surface} 0%, ${theme.bg} 65%)`,
      fontFamily: "'Courier New', monospace",
      color: theme.text,
      position: "relative",
      overflow: "hidden",
    }}>
      {/* BG grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(${theme.border}12 1px, transparent 1px),
                          linear-gradient(90deg, ${theme.border}12 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
      }} />

      {/* Card */}
      <div style={{
        position: "relative",
        width: "100%",
        maxWidth: "400px",
        background: `${theme.surface}cc`,
        border: `1px solid ${theme.border}`,
        borderRadius: "16px",
        padding: "2rem",
        backdropFilter: "blur(20px)",
        boxShadow: `0 0 60px ${theme.glow}15, 0 24px 60px rgba(0,0,0,0.5)`,
        margin: "1rem",
        boxSizing: "border-box",
      }}>
        {/* Top accent bar */}
        <div style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: "2px",
          background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
          borderRadius: "1px",
        }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "0.58rem", letterSpacing: "0.22em", color: theme.muted, marginBottom: "0.5rem", textTransform: "uppercase" }}>
            ◈ 3D Contribution Skyline
          </div>
          <div style={{
            fontSize: "1.7rem", fontWeight: 900, color: theme.accent,
            textShadow: `0 0 24px ${theme.glow}60`, marginBottom: "0.4rem",
          }}>
            GitContra
          </div>
          <div style={{ color: theme.muted, fontSize: "0.75rem" }}>
            Enter any GitHub username to visualise their skyline
          </div>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>

          {/* Username input */}
          <div>
            <div style={{ fontSize: "0.62rem", color: theme.muted, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>
              GitHub Username
            </div>
            <input
              type="text"
              placeholder="e.g. torvalds"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && ready && handleSubmit()}
              style={inputStyle}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>

          {/* Remember */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.72rem", color: theme.muted }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ accentColor: theme.accent, width: 13, height: 13 }}
            />
            Remember me
          </label>

          {/* Error */}
          {error && (
            <div style={{
              background: "#ff000018", border: "1px solid #ff000040",
              borderRadius: "8px", padding: "0.55rem 0.85rem",
              fontSize: "0.72rem", color: "#ff6b6b", lineHeight: 1.4,
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!ready}
            style={{
              padding: "0.72rem",
              background: ready
                ? `linear-gradient(135deg, ${theme.accent}cc, ${theme.accent})`
                : `${theme.accent}30`,
              border: `1px solid ${ready ? theme.accent : theme.border}`,
              borderRadius: "8px",
              color: ready ? theme.bg : theme.muted,
              fontSize: "0.82rem",
              fontFamily: "inherit",
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: ready ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              boxShadow: ready ? `0 0 20px ${theme.glow}40` : "none",
            }}
          >
            {loading ? "⟳  Loading skyline…" : "⬡  View Skyline"}
          </button>

          {/* Demo */}
          <button
            onClick={() => onConnect(null)}
            style={{
              padding: "0.45rem",
              background: "transparent",
              border: `1px solid ${theme.border}`,
              borderRadius: "8px",
              color: theme.muted,
              fontSize: "0.7rem",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Use demo data instead
          </button>
        </div>
      </div>
    </div>
  );
}