/**
 * GitHubConnect.jsx — Enhanced login screen with backlink to natrajx.in
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

  const ready = !loading && username.trim().length > 0;

  // Demo usernames to try
  const demos = ["torvalds", "gaearon", "sindresorhus", "natrajx"];

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", flexDirection: "column",
      background: `radial-gradient(ellipse 90% 70% at 30% 10%, ${theme.surface} 0%, ${theme.bg} 60%)`,
      fontFamily: "'Courier New', monospace",
      color: theme.text, position: "relative", overflow: "hidden",
      gap: 0,
    }}>

      {/* BG grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: `linear-gradient(${theme.border}15 1px, transparent 1px),
                          linear-gradient(90deg, ${theme.border}15 1px, transparent 1px)`,
        backgroundSize: "48px 48px",
      }} />

      {/* Animated bg glow */}
      <div style={{
        position: "absolute", width: 600, height: 600, borderRadius: "50%",
        background: `radial-gradient(circle, ${theme.accent}08 0%, transparent 70%)`,
        top: "50%", left: "50%", transform: "translate(-50%,-50%)",
        pointerEvents: "none",
        animation: "pulse-bg 4s ease-in-out infinite",
      }} />

      {/* Creator badge — top left */}
      <a href="https://natrajx.in" target="_blank" rel="noopener noreferrer"
        style={{
          position: "absolute", top: "1rem", left: "1rem",
          color: theme.muted, fontSize: "0.52rem", letterSpacing: "0.1em",
          textDecoration: "none", opacity: 0.6,
          display: "flex", alignItems: "center", gap: "0.3rem",
          transition: "opacity 0.15s",
        }}
        onMouseEnter={e => e.currentTarget.style.opacity = "1"}
        onMouseLeave={e => e.currentTarget.style.opacity = "0.6"}
      >
        <span style={{ fontSize: "0.7rem" }}>⬡</span>
        by natrajx.in
      </a>

      {/* Main card */}
      <div style={{
        position: "relative", width: "100%", maxWidth: 420,
        margin: "2rem 1rem",
        background: `${theme.surface}cc`,
        border: `1px solid ${theme.border}`,
        borderRadius: 16,
        padding: "2.5rem 2rem 2rem",
        boxShadow: `0 0 0 1px ${theme.border}30, 0 0 60px ${theme.glow}15, 0 24px 60px rgba(0,0,0,0.5)`,
        backdropFilter: "blur(20px)",
      }}>

        {/* Logo + title */}
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{
            fontSize: "2.8rem", marginBottom: "0.75rem",
            filter: `drop-shadow(0 0 16px ${theme.glow})`,
            animation: "float 3s ease-in-out infinite",
            display: "inline-block",
          }}>⬡</div>
          <h1 style={{
            fontSize: "1.6rem", fontWeight: 900, letterSpacing: "-0.02em",
            color: theme.accent, margin: 0,
            textShadow: `0 0 20px ${theme.glow}60`,
          }}>GitCity</h1>
          <p style={{
            fontSize: "0.68rem", color: theme.muted, marginTop: "0.4rem",
            letterSpacing: "0.08em", lineHeight: 1.5,
          }}>
            Your GitHub contributions as a living 3D city
          </p>
        </div>

        {/* Accent divider */}
        <div style={{
          height: 1, marginBottom: "1.75rem",
          background: `linear-gradient(90deg, transparent, ${theme.accent}40, transparent)`,
        }} />

        {/* Input */}
        <div style={{ position: "relative", marginBottom: "1rem" }}>
          <span style={{
            position: "absolute", left: "0.85rem", top: "50%", transform: "translateY(-50%)",
            color: theme.muted, fontSize: "0.75rem",
          }}>@</span>
          <input
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            onKeyDown={e => e.key === "Enter" && ready && handleSubmit()}
            placeholder="github-username"
            autoFocus
            style={{
              width: "100%", padding: "0.75rem 0.9rem 0.75rem 1.65rem",
              background: `${theme.bg}cc`,
              border: `1px solid ${username ? theme.accent + "80" : theme.border}`,
              borderRadius: 8, color: theme.text,
              fontSize: "0.9rem", fontFamily: "inherit",
              outline: "none", transition: "border-color 0.15s",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Remember toggle */}
        <label style={{
          display: "flex", alignItems: "center", gap: "0.5rem",
          fontSize: "0.62rem", color: theme.muted, cursor: "pointer",
          marginBottom: "1.25rem", userSelect: "none",
        }}>
          <span style={{
            width: 14, height: 14, borderRadius: 3,
            border: `1px solid ${remember ? theme.accent : theme.border}`,
            background: remember ? `${theme.accent}30` : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.15s", flexShrink: 0,
          }}
            onClick={() => setRemember(r => !r)}
          >
            {remember && <span style={{ color: theme.accent, fontSize: "0.6rem" }}>✓</span>}
          </span>
          Remember me on this device
        </label>

        {/* Error */}
        {error && (
          <div style={{
            background: "#ff000015", border: "1px solid #ff000040",
            borderRadius: 6, padding: "0.5rem 0.75rem",
            color: "#ff6b6b", fontSize: "0.65rem", marginBottom: "1rem",
          }}>
            ⚠ {error}
          </div>
        )}

        {/* CTA button */}
        <button
          onClick={handleSubmit}
          disabled={!ready}
          style={{
            width: "100%", padding: "0.8rem",
            background: ready ? theme.accent : `${theme.accent}30`,
            border: `1px solid ${ready ? theme.accent : theme.border}`,
            borderRadius: 8, color: ready ? theme.bg : theme.muted,
            fontSize: "0.78rem", fontFamily: "inherit",
            fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase",
            cursor: ready ? "pointer" : "not-allowed",
            transition: "all 0.18s",
            boxShadow: ready ? `0 0 20px ${theme.glow}40` : "none",
          }}
        >
          {loading ? "Loading…" : "Build My City →"}
        </button>

        {/* Demo shortcuts */}
        <div style={{ marginTop: "1.5rem" }}>
          <div style={{ fontSize: "0.52rem", color: theme.muted, letterSpacing: "0.1em", marginBottom: "0.5rem", textAlign: "center" }}>
            TRY A DEMO
          </div>
          <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
            {demos.map(u => (
              <button key={u} onClick={() => { setUsername(u); onConnect(u); }}
                style={{
                  background: "transparent",
                  border: `1px solid ${theme.border}`,
                  borderRadius: 5, color: theme.muted,
                  fontSize: "0.58rem", fontFamily: "inherit",
                  padding: "0.22rem 0.55rem", cursor: "pointer",
                  transition: "all 0.15s",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.muted; }}
              >
                @{u}
              </button>
            ))}
          </div>
        </div>

        {/* Privacy note */}
        <p style={{
          fontSize: "0.52rem", color: theme.muted, textAlign: "center",
          marginTop: "1.5rem", opacity: 0.55, lineHeight: 1.6,
        }}>
          Public GitHub data only · No token required · No data stored
        </p>
      </div>

      {/* Footer backlink */}
      <div style={{
        position: "relative", zIndex: 1,
        fontSize: "0.52rem", color: theme.muted, opacity: 0.5,
        display: "flex", alignItems: "center", gap: "0.75rem",
        flexWrap: "wrap", justifyContent: "center",
        padding: "0 1rem 1.5rem",
      }}>
        <a href="https://natrajx.in" target="_blank" rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.color = theme.accent}
          onMouseLeave={e => e.currentTarget.style.color = "inherit"}
        >natrajx.in</a>
        <span>·</span>
        <a href="https://natrajx.in/projects" target="_blank" rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.color = theme.accent}
          onMouseLeave={e => e.currentTarget.style.color = "inherit"}
        >projects</a>
        <span>·</span>
        <a href="https://natrajx.in/blog" target="_blank" rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.color = theme.accent}
          onMouseLeave={e => e.currentTarget.style.color = "inherit"}
        >blog</a>
        <span>·</span>
        <a href="https://github.com/natrajx/gitcity" target="_blank" rel="noopener noreferrer"
          style={{ color: "inherit", textDecoration: "none" }}
          onMouseEnter={e => e.currentTarget.style.color = theme.accent}
          onMouseLeave={e => e.currentTarget.style.color = "inherit"}
        >source</a>
      </div>

      <style>{`
        @keyframes pulse-bg { 0%,100%{transform:translate(-50%,-50%) scale(1);} 50%{transform:translate(-50%,-50%) scale(1.15);} }
        @keyframes float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
      `}</style>
    </div>
  );
}