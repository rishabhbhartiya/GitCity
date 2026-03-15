/**
 * useGitHubData.js
 *
 * Fetches contribution data from our own serverless API first,
 * then falls back to third-party proxies if needed.
 *
 * Priority:
 *  1. /api/contributions/{username}  — our own Vercel function (all years)
 *  2. github-contributions-api.jogruber.de — public proxy (last year only)
 *  3. github-contributions.vercel.app — secondary public proxy
 */

import { useState, useCallback } from "react";

export function useGitHubData() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
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

    setProfile({
      name: user,
      avatarUrl: `https://github.com/${user}.png?size=32`,
    });
    setData(days);
    setLoading(false);
    return true;

  }, []);

  return { data, profile, loading, error, fetchData };
}