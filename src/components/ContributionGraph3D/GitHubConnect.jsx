/**
 * GitHubConnect.jsx
 *
 * Login screen shown when no GitHub credentials are available.
 * Handles:
 *  - Username + token input
 *  - "Remember me" (saves to localStorage)
 *  - Loading / error states
 *  - Link to generate a token
 */

import { useState } from "react";

export function GitHubConnect({ onConnect, loading, error, theme }) {
  const [username, setUsername] = useState("");
  const [token,    setToken]    = useState("");
  const [remember, setRemember] = useState(true);
  const [showToken, setShowToken] = useState(false);

  function handleSubmit() {
    if (remember) {
      try {
        localStorage.setItem("gh_username", username.trim());
        localStorage.setItem("gh_token",    token.trim());
      } catch (_) {}
    }
    onConnect(username.trim(), token.trim());
  }

  const inputStyle = {
    width: "100%",
    background: "#0d1117",
    border: `1px solid ${theme.border}`,
    borderRadius: "8px",
    padding: "0.65rem 0.85rem",
    color: theme.text,
    fontSize: "0.85rem",
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.15s",
  };

  const labelStyle = {
    fontSize: "0.65rem",
    color: theme.muted,
    textTransform: "uppercase",
    letterSpacing: "0.1em",
    marginBottom: "0.35rem",
    display: "block",
  };

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
        maxWidth: "420px",
        background: `${theme.surface}cc`,
        border: `1px solid ${theme.border}`,
        borderRadius: "16px",
        padding: "2rem",
        backdropFilter: "blur(20px)",
        boxShadow: `0 0 60px ${theme.glow}15, 0 24px 60px rgba(0,0,0,0.5)`,
        margin: "1rem",
      }}>
        {/* Top accent bar */}
        <div style={{
          position: "absolute", top: 0, left: "10%", right: "10%", height: "2px",
          background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
          borderRadius: "1px",
        }} />

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <div style={{ fontSize: "0.6rem", letterSpacing: "0.22em", color: theme.muted, marginBottom: "0.5rem", textTransform: "uppercase" }}>
            ◈ 3D Contribution Skyline
          </div>
          <h1 style={{
            margin: 0, fontSize: "1.6rem", fontWeight: 900, color: theme.accent,
            textShadow: `0 0 24px ${theme.glow}60`,
          }}>
            Code Skyline
          </h1>
          <p style={{ margin: "0.4rem 0 0", color: theme.muted, fontSize: "0.75rem" }}>
            Connect your GitHub to visualise your contributions
          </p>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

          {/* Username */}
          <div>
            <label style={labelStyle}>GitHub Username</label>
            <input
              type="text"
              placeholder="e.g. torvalds"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={inputStyle}
              autoComplete="username"
              autoFocus
            />
          </div>

          {/* Token */}
          <div>
            <label style={labelStyle}>
              Personal Access Token
              <a
                href="https://github.com/settings/tokens/new?scopes=read:user&description=Code+Skyline"
                target="_blank"
                rel="noreferrer"
                style={{ marginLeft: "0.5rem", color: theme.accent, textDecoration: "none", fontSize: "0.6rem", opacity: 0.8 }}
              >
                Generate token ↗
              </a>
            </label>
            <div style={{ position: "relative" }}>
              <input
                type={showToken ? "text" : "password"}
                placeholder="ghp_xxxxxxxxxxxx"
                value={token}
                onChange={e => setToken(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
                style={{ ...inputStyle, paddingRight: "2.5rem" }}
                autoComplete="current-password"
              />
              <button
                onClick={() => setShowToken(s => !s)}
                style={{
                  position: "absolute", right: "0.6rem", top: "50%",
                  transform: "translateY(-50%)",
                  background: "none", border: "none", cursor: "pointer",
                  color: theme.muted, fontSize: "0.75rem", padding: "0.2rem",
                }}
              >
                {showToken ? "hide" : "show"}
              </button>
            </div>
            <p style={{ margin: "0.35rem 0 0", fontSize: "0.62rem", color: theme.muted, opacity: 0.75 }}>
              Needs <code style={{ color: theme.accent }}>read:user</code> scope only. Never leaves your browser.
            </p>
          </div>

          {/* Remember me */}
          <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.72rem", color: theme.muted }}>
            <input
              type="checkbox"
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              style={{ accentColor: theme.accent, width: 14, height: 14 }}
            />
            Remember me (saves to localStorage)
          </label>

          {/* Error */}
          {error && (
            <div style={{
              background: "#ff000018", border: "1px solid #ff000040",
              borderRadius: "8px", padding: "0.6rem 0.85rem",
              fontSize: "0.72rem", color: "#ff6b6b",
            }}>
              ⚠ {error}
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={loading || !username || !token}
            style={{
              padding: "0.7rem",
              background: loading || !username || !token
                ? `${theme.accent}40`
                : `linear-gradient(135deg, ${theme.accent}cc, ${theme.accent})`,
              border: `1px solid ${theme.accent}`,
              borderRadius: "8px",
              color: loading || !username || !token ? theme.muted : theme.bg,
              fontSize: "0.8rem",
              fontFamily: "inherit",
              fontWeight: 700,
              letterSpacing: "0.08em",
              cursor: loading || !username || !token ? "not-allowed" : "pointer",
              transition: "all 0.15s",
              boxShadow: loading || !username || !token ? "none" : `0 0 20px ${theme.glow}40`,
            }}
          >
            {loading ? "⟳ Fetching contributions…" : "⬡ Load My Skyline"}
          </button>

          {/* Demo mode */}
          <button
            onClick={() => onConnect(null, null)}
            style={{
              padding: "0.45rem",
              background: "transparent",
              border: `1px solid ${theme.border}`,
              borderRadius: "8px",
              color: theme.muted,
              fontSize: "0.72rem",
              fontFamily: "inherit",
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            Use demo data instead
          </button>
        </div>
      </div>
    </div>
  );
}
