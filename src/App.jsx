/**
 * App.jsx 
 */

import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { ContributionGraph3D } from "./components/ContributionGraph3D";
import { GitHubConnect } from "./components/ContributionGraph3D/GitHubConnect";
import { useGitHubData } from "./hooks/useGitHubData";
import { THEMES } from "./constants/themes";

function getUrlParams() {
  const p = new URLSearchParams(window.location.search);
  const pathParts = window.location.pathname.split("/").filter(Boolean);
  const pathUsername = pathParts[0] || "";
  const pathView = pathParts[1] || ""; 
  return {
    username: p.get("username") || pathUsername || "",
    theme: p.get("theme") || "",
    defaultView: pathView || null,
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

  // ── SEO: Structured Data for User Profile ────────────────────────────────
  const getProfileStructuredData = () => {
    if (!username || !profile) return null;

    const totalContributions = data?.reduce((sum, day) => sum + (day.count || 0), 0) || 0;

    return {
      "@context": "https://schema.org",
      "@type": "ProfilePage",
      "name": `${username} - GitCity`,
      "description": `View ${username}'s GitHub contributions as an interactive isometric 3D city skyline`,
      "url": `https://gitcity.natrajx.in/${username}`,
      "image": profile?.avatarUrl || "https://gitcity.natrajx.in/screenshots/banner.png",
      "author": {
        "@type": "Person",
        "name": username,
        "url": `https://github.com/${username}`,
        "image": profile?.avatarUrl || "",
      },
      "creator": {
        "@type": "Person",
        "name": "Natraj X",
        "url": "https://natrajx.in"
      },
      "dateCreated": profile?.createdAt || new Date().toISOString(),
      "keywords": `${username}, GitHub contributions, developer portfolio, 3D city, code visualization`,
      "text": `${username} has made ${totalContributions.toLocaleString()} contributions. Visualize them as a beautiful isometric city skyline.`,
      "inLanguage": "en-US"
    };
  };

  // ── Loading / init screen ────────────────────────────────────────────────
  if (screen === "init" || screen === "loading") {
    return (
      <>
        <Helmet>
          <title>Loading — GitCity</title>
        </Helmet>
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
      </>
    );
  }

  // ── Login screen ─────────────────────────────────────────────────────────
  if (screen === "connect") {
    return (
      <>
        <Helmet>
          <title>GitCity — Visualize Your GitHub Contributions as a 3D City</title>
          <meta name="description"
            content="GitCity transforms your GitHub contribution history into an interactive isometric 3D city skyline. Every commit builds a skyscraper. Free, open-source, embeddable in any README." />
          <meta property="og:title" content="GitCity — Your GitHub Contributions as a 3D City" />
          <meta property="og:description"
            content="Transform your GitHub commit history into a stunning isometric city skyline. Every day you code, a building grows. Free embed for your README or portfolio." />
          <meta property="og:url" content="https://gitcity.natrajx.in/" />
          <meta name="twitter:title" content="GitCity — GitHub Contributions as a 3D City" />
          <meta name="twitter:description"
            content="Turn your GitHub commit history into a beautiful isometric city. Free, embeddable, themeable." />
        </Helmet>
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

  const pageTitle = `${username} - GitCity`;
  const pageDescription = profile?.bio || `View ${username}'s GitHub contributions as an interactive 3D city skyline. ${data?.length || 0} days tracked.`;
  const pageUrl = `https://gitcity.natrajx.in/${username}`;
  const pageImage = profile?.avatarUrl || "https://gitcity.natrajx.in/screenshots/banner.png";

  const profileStructuredData = getProfileStructuredData();

  return (
    <>
      <Helmet>
        {/* Primary SEO */}
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1" />
        <meta name="googlebot" content="index, follow" />
        <link rel="canonical" href={pageUrl} />

        {/* Open Graph */}
        <meta property="og:type" content="profile" />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={pageImage} />
        <meta property="og:image:width" content="630" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="GitCity" />
        <meta property="og:locale" content="en_US" />
        <meta property="profile:username" content={username} />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@natrajx" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content={pageImage} />
        <meta name="twitter:url" content={pageUrl} />

        {/* Structured Data */}
        {profileStructuredData && (
          <script type="application/ld+json">
            {JSON.stringify(profileStructuredData)}
          </script>
        )}

        {/* Breadcrumb */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://gitcity.natrajx.in" },
              { "@type": "ListItem", "position": 2, "name": username, "item": pageUrl }
            ]
          })}
        </script>
      </Helmet>

      <div style={{ position: "relative" }}>
        <ContributionGraph3D
          contributions={data}
          themeName={theme}
          title={graphTitle}
          defaultView={getUrlParams().defaultView} // 👈 yeh add karo
          profile={profile}
          username={username}
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
    </>
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
        bottom: "1.3rem",
        left: "1.5rem",
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