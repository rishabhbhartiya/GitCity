/**
 * App.jsx
 *
 * Entry point that handles:
 *
 *  1. URL params  — ?username=torvalds&token=ghp_xxx
 *     Auto-fetches on load, no login screen shown.
 *
 *  2. localStorage — credentials saved from previous "remember me" login.
 *     Auto-fetches on load if found.
 *
 *  3. Login screen — shown when no credentials are available.
 *     User enters username + token, optionally saves to localStorage.
 *
 *  4. Demo mode — "Use demo data" button skips all of the above.
 *
 * After credentials are resolved, <ContributionGraph3D> is rendered
 * with the real GitHub contribution data (or null for demo).
 */

import { useState, useEffect } from "react";
import { ContributionGraph3D } from "./components/ContributionGraph3D";
import { GitHubConnect }       from "./components/ContributionGraph3D/GitHubConnect";
import { useGitHubData }       from "./hooks/useGitHubData";
import { THEMES }              from "./constants/themes";

// ── Helpers ───────────────────────────────────────────────────────────────────

function getUrlParams() {
  const p = new URLSearchParams(window.location.search);
  return {
    username: p.get("username") || "",
    token:    p.get("token")    || "",
    theme:    p.get("theme")    || "",
  };
}

function getSavedCredentials() {
  try {
    return {
      username: localStorage.getItem("gh_username") || "",
      token:    localStorage.getItem("gh_token")    || "",
    };
  } catch (_) {
    return { username: "", token: "" };
  }
}

// ── App ───────────────────────────────────────────────────────────────────────

export default function App() {
  // "connect"  = show login screen
  // "loading"  = fetching from GitHub
  // "ready"    = show the graph (data or demo)
  const [screen,   setScreen]   = useState("init");
  const [username, setUsername] = useState("");
  const [theme,    setTheme]    = useState("matrix");

  const { data, profile, loading, error, fetchData } = useGitHubData();

  // On mount: check URL params → localStorage → show login
  useEffect(() => {
    const url   = getUrlParams();
    const saved = getSavedCredentials();

    if (url.theme && THEMES[url.theme]) setTheme(url.theme);

    if (url.username && url.token) {
      // Auto-fetch from URL params
      setUsername(url.username);
      setScreen("loading");
      fetchData(url.username, url.token).then(ok => {
        setScreen(ok ? "ready" : "connect");
      });
    } else if (saved.username && saved.token) {
      // Auto-fetch from localStorage
      setUsername(saved.username);
      setScreen("loading");
      fetchData(saved.username, saved.token).then(ok => {
        setScreen(ok ? "ready" : "connect");
      });
    } else {
      setScreen("connect");
    }
  }, []);

  // Transition to ready once data arrives
  useEffect(() => {
    if (data && screen === "loading") setScreen("ready");
  }, [data]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  function handleConnect(user, token) {
    if (!user && !token) {
      // Demo mode
      setUsername("");
      setScreen("ready");
      return;
    }
    setUsername(user);
    setScreen("loading");
    fetchData(user, token).then(ok => {
      setScreen(ok ? "ready" : "connect");
    });
  }

  function handleDisconnect() {
    try {
      localStorage.removeItem("gh_username");
      localStorage.removeItem("gh_token");
    } catch (_) {}
    setScreen("connect");
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const currentTheme = THEMES[theme] ?? THEMES["matrix"];

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
          {screen === "loading" ? `Fetching ${username}'s contributions…` : "Initialising…"}
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (screen === "connect") {
    return (
      <GitHubConnect
        onConnect={handleConnect}
        loading={loading}
        error={error}
        theme={currentTheme}
      />
    );
  }

  // "ready" — show the graph
  const graphTitle = profile?.name
    ? `${profile.name}'s Skyline`
    : username
    ? `${username}'s Skyline`
    : "Code Skyline";

  return (
    <div style={{ position: "relative" }}>
      <ContributionGraph3D
        contributions={data}   // null = demo data
        themeName={theme}
        title={graphTitle}
      />

      {/* Disconnect / switch user button */}
      <button
        onClick={handleDisconnect}
        title="Switch GitHub user"
        style={{
          position: "fixed",
          top: "0.75rem",
          // sits between the title and the theme picker
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 100,
          background: `${currentTheme.surface}cc`,
          border: `1px solid ${currentTheme.border}`,
          borderRadius: "6px",
          color: currentTheme.muted,
          fontSize: "0.58rem",
          fontFamily: "inherit",
          letterSpacing: "0.1em",
          padding: "0.22rem 0.6rem",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "0.3rem",
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.color = currentTheme.accent; e.currentTarget.style.borderColor = currentTheme.accent; }}
        onMouseLeave={e => { e.currentTarget.style.color = currentTheme.muted;  e.currentTarget.style.borderColor = currentTheme.border; }}
      >
        {profile?.avatarUrl && (
          <img src={profile.avatarUrl} alt="" width={12} height={12}
            style={{ borderRadius: "50%" }} />
        )}
        {username || "demo"} · switch user
      </button>
    </div>
  );
}
