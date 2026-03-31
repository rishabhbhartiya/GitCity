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
      {/* GitHub repo — prominent star button */}
      <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "0 1rem 0.75rem" }}>
        <a
          href="https://github.com/rishabhbhartiya/GitCity"
          target="_blank" rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            background: `${theme.surface}cc`,
            border: `1px solid ${theme.border}`,
            borderRadius: 8, padding: "0.38rem 0.9rem",
            color: theme.muted, textDecoration: "none",
            fontSize: "0.62rem", fontFamily: "inherit", letterSpacing: "0.06em",
            transition: "all 0.18s",
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = theme.accent; e.currentTarget.style.color = theme.accent; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = theme.border; e.currentTarget.style.color = theme.muted; }}
        >
          <svg height="14" width="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
          </svg>
          ⭐ Star on GitHub
        </a>
      </div>

      {/* Footer links */}
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
      </div>

      <style>{`
        @keyframes pulse-bg { 0%,100%{transform:translate(-50%,-50%) scale(1);} 50%{transform:translate(-50%,-50%) scale(1.15);} }
        @keyframes float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
      `}</style>
    </div>
  );
}