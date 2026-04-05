/**
 * useGitHubData.js
 *
 * Fetches contribution data from our own serverless API first,
 * then falls back to third-party proxies if needed.
 * Also fetches repo metadata for Neighborhood view.
 *
 * Priority:
 *  1. /api/contributions/{username}  — our own Vercel function (all years)
 *  2. github-contributions-api.jogruber.de — public proxy (last year only)
 *  3. github-contributions.vercel.app — secondary public proxy
 *
 * Repos:
 *  - GitHub public API /users/:username/repos
 *  - Activity score = recency + stars (proxy for commit intensity)
 */

import { useState, useCallback } from "react";

// ── Repo activity score ───────────────────────────────────────────────────────
// Uses pushed_at recency + stargazers as a proxy for how active a repo is.
// No per-repo commit API calls needed — zero extra lag.
function calcActivityScore(repo) {
  const daysSince = (Date.now() - new Date(repo.pushed_at)) / 86400000;
  const recencyScore = Math.max(0, 365 - daysSince); // max 365 for pushed today
  const starScore = (repo.stargazers_count || 0) * 2;
  const forkScore = (repo.forks_count || 0) * 1.5;
  return Math.round(recencyScore + starScore + forkScore);
}

export function useGitHubData() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [repos, setRepos] = useState([]); // NEW — repo list for neighborhood view
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (username) => {
    const user = username?.trim();
    if (!user) {
      setError("Please enter a GitHub username.");
      return false;
    }

    setLoading(true);
    setError(null);
    setData(null);
    setRepos([]);

    let days = null;
    let lastErr = "";

    // ── 1. Own API (/api/contributions/:username) ──────────────────────────
    try {
      const res = await fetch(`/api/contributions/${encodeURIComponent(user)}`);
      const json = await res.json();
      if (res.ok && Array.isArray(json.contributions) && json.contributions.length > 0) {
        days = json.contributions; // [{ date, count }]
      } else {
        lastErr = json.error || `API error ${res.status}`;
      }
    } catch (e) {
      lastErr = e.message;
    }

    // ── 2. jogruber public proxy ───────────────────────────────────────────
    if (!days) {
      try {
        const res = await fetch(
          `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`
        );
        if (res.ok) {
          const json = await res.json();
          if (Array.isArray(json.contributions) && json.contributions.length > 0) {
            days = json.contributions.map(d => ({ date: d.date, count: d.count ?? 0 }));
          }
        }
      } catch (_) { /* fall through */ }
    }

    // ── 3. vercel public proxy ─────────────────────────────────────────────
    if (!days) {
      try {
        const res = await fetch(
          `https://github-contributions.vercel.app/api?username=${encodeURIComponent(user)}`
        );
        if (res.ok) {
          const json = await res.json();
          if (json.contributions && typeof json.contributions === "object") {
            const entries = Array.isArray(json.contributions)
              ? json.contributions.map(d => ({ date: d.date, count: Number(d.count) || 0 }))
              : Object.entries(json.contributions).map(([date, count]) => ({ date, count: Number(count) || 0 }));
            if (entries.length > 0) days = entries;
          }
        }
      } catch (_) { /* fall through */ }
    }

    if (!days || days.length === 0) {
      setError(lastErr || `No contribution data found for "${user}". Check the username and try again.`);
      setLoading(false);
      return false;
    }

    // ── 4. Fetch repos (parallel — doesn't block contribution data) ────────
    // Single API call — no per-repo calls, no rate limit risk
    let repoList = [];
    try {
      const repoRes = await fetch(
        `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=pushed`,
        { headers: { Accept: "application/vnd.github+json" } }
      );
      if (repoRes.ok) {
        const repoJson = await repoRes.json();
        if (Array.isArray(repoJson)) {
          repoList = repoJson
            .filter(r => !r.fork) // exclude forks — show only owned repos
            .map(r => ({
              name: r.name,
              fullName: r.full_name,
              description: r.description || "",
              language: r.language || "Unknown",
              stars: r.stargazers_count || 0,
              forks: r.forks_count || 0,
              url: r.html_url,
              pushedAt: r.pushed_at,
              createdAt: r.created_at,
              isArchived: r.archived || false,
              activityScore: calcActivityScore(r),
            }))
            .sort((a, b) => b.activityScore - a.activityScore); // most active first
        }
      }
    } catch (_) {
      // Repos failing is non-fatal — contribution data still works
      repoList = [];
    }

    setProfile({
      name: user,
      avatarUrl: `https://github.com/${user}.png?size=32`,
    });
    setData(days);
    setRepos(repoList); // set repos — empty array if fetch failed
    setLoading(false);
    return true;

  }, []);

  return { data, profile, repos, loading, error, fetchData }; // repos added to return
}