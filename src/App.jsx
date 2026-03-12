/**
 * App.jsx — GitSkyline
 * https://gitcity.natrajx.in
 *
 * Auth flow (no token needed):
 *  1. ?username=torvalds in URL  → auto-fetch
 *  2. localStorage "gh_username" → auto-fetch
 *  3. Neither                    → show GitHubConnect login screen
 */

import { useState, useEffect } from "react";
import { ContributionGraph3D } from "./components/ContributionGraph3D";
import { GitHubConnect } from "./components/ContributionGraph3D/GitHubConnect";
import { useGitHubData } from "./hooks/useGitHubData";
import { THEMES } from "./constants/themes";

function getUrlParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    username: p.get("username") || "",
    theme: p.get("theme") || "",
  };
}

function getSaved() {
  try { return localStorage.getItem("gh_username") || ""; }
  catch (_) { return ""; }
}

export default function App() {
  const [screen, setScreen] = useState("init");
  const [username, setUsername] = useState("");
  const [theme, setTheme] = useState("matrix");

  const { data, profile, loading, error, fetchData } = useGitHubData();

  useEffect(() => {
    const url = getUrlParams();
    const saved = getSaved();

    if (url.theme && THEMES[url.theme]) setTheme(url.theme);

    const user = url.username || saved;
    if (user) {
      setUsername(user);
      setScreen("loading");
      fetchData(user).then(ok => setScreen(ok ? "ready" : "connect"));
    } else {
      setScreen("connect");
    }
  }, []);

  useEffect(() => {
    if (data && screen === "loading") setScreen("ready");
  }, [data]);

  function handleConnect(user) {
    if (!user) { setUsername(""); setScreen("ready"); return; }
    setUsername(user);
    setScreen("loading");
    fetchData(user).then(ok => setScreen(ok ? "ready" : "connect"));
  }

  function handleDisconnect() {
    try { localStorage.removeItem("gh_username"); } catch (_) { }
    setScreen("connect");
  }

  const currentTheme = THEMES[theme] ?? THEMES["matrix"];

  // ── Loading / init screen ────────────────────────────────────────────────
  if (screen === "init" || screen === "loading") {
    return (
      <div style={{
        height: "100vh", display: "flex", alignItems: "center",
        justifyContent: "center", flexDirection: "column", gap: "1rem",
        background: currentTheme.bg, fontFamily: "'Courier New', monospace",
        color: currentTheme.muted,
      }}>
        <div style={{ fontSize: "2rem", animation: "spin 1s linear infinite" }}>⬡</div>
        <div style={{ fontSize: "0.75rem", letterSpacing: "0.15em" }}>
          {username ? `Fetching ${username}'s skyline…` : "Initialising GitSkyline…"}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // ── Login screen ─────────────────────────────────────────────────────────
  if (screen === "connect") {
    return (
      <>
        <GitHubConnect
          onConnect={handleConnect}
          loading={loading}
          error={error}
          theme={currentTheme}
        />
        <Backlink theme={currentTheme} />
      </>
    );
  }

  // ── Graph screen ─────────────────────────────────────────────────────────
  const graphTitle = username
    ? `@${username}'s Skyline`
    : "Code Skyline";

  return (
    <div style={{ position: "relative" }}>
      <ContributionGraph3D
        contributions={data}
        themeName={theme}
        title={graphTitle}
      />

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .switch-badge {
          position: fixed;
          top: 0.6rem;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
        }
        @media (max-width: 520px) {
          .switch-badge {
            left: 0.75rem;
            transform: none;
          }
        }
      `}</style>

      {/* Switch-user badge */}
      <button
        className="switch-badge"
        onClick={handleDisconnect}
        title="Switch user"
        style={{
          background: `${currentTheme.surface}dd`,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: "6px",
          color: currentTheme.muted,
          fontSize: "0.58rem",
          fontFamily: "'Courier New', monospace",
          letterSpacing: "0.08em",
          padding: "0.22rem 0.55rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.35rem",
          whiteSpace: "nowrap",
          transition: "color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={e => {
          e.currentTarget.style.color = currentTheme.accent;
          e.currentTarget.style.borderColor = currentTheme.accent;
        }}
        onMouseLeave={e => {
          e.currentTarget.style.color = currentTheme.muted;
          e.currentTarget.style.borderColor = currentTheme.border;
        }}
      >
        {profile?.avatarUrl && (
          <img src={profile.avatarUrl} alt=""
            width={12} height={12}
            style={{ borderRadius: "50%", display: "block" }}
          />
        )}
        {username || "demo"} · switch user
      </button>

      {/* Backlink */}
      <Backlink theme={currentTheme} />
    </div>
  );
}

// ── Backlink ───────────────────────────────────────────────────────────────
function Backlink({ theme }) {
  return (
    <a
      href="https://www.natrajx.in"
      target="_blank"
      rel="noreferrer"
      style={{
        position: "fixed",
        bottom: "0.6rem",
        right: "0.75rem",
        zIndex: 100,
        fontSize: "0.55rem",
        fontFamily: "'Courier New', monospace",
        letterSpacing: "0.1em",
        color: theme.muted,
        textDecoration: "none",
        opacity: 0.5,
        transition: "opacity 0.15s, color 0.15s",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.opacity = "1";
        e.currentTarget.style.color = theme.accent;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.opacity = "0.5";
        e.currentTarget.style.color = theme.muted;
      }}
    >
      ⬡ GitCity · by natrajx.in
    </a>
  );
}