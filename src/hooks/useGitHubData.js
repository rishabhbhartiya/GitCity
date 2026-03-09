/**
 * useGitHubData.js
 *
 * Fetches contribution data using the public GitHub contributions proxy.
 * No token required — username only.
 *
 * Primary:  https://github-contributions-api.jogruber.de/v4/{username}
 * Fallback: https://github-contributions.vercel.app/api?username={username}
 *
 * Returns data as [{ date: "YYYY-MM-DD", count: number }]
 */

import { useState, useCallback } from "react";

const PRIMARY = (u) => `https://github-contributions-api.jogruber.de/v4/${u}?y=last`;
const FALLBACK = (u) => `https://github-contributions.vercel.app/api?username=${u}`;

export function useGitHubData() {
  const [data, setData] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async (username) => {
    if (!username?.trim()) {
      setError("Please enter a GitHub username.");
      return false;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Try primary proxy first
      let days = null;

      try {
        const res = await fetch(PRIMARY(username.trim()));
        if (res.ok) {
          const json = await res.json();
          // jogruber API: { contributions: [{ date, count }] }
          if (Array.isArray(json.contributions)) {
            days = json.contributions.map(d => ({
              date: d.date,
              count: d.count ?? 0,
            }));
          }
        }
      } catch (_) { /* fall through to fallback */ }

      // Fallback proxy
      if (!days) {
        const res = await fetch(FALLBACK(username.trim()));
        if (!res.ok) throw new Error(`User "${username}" not found.`);
        const json = await res.json();
        // vercel proxy: { contributions: { [date]: count } } or similar
        if (json.contributions && typeof json.contributions === "object") {
          days = Object.entries(json.contributions).map(([date, count]) => ({
            date,
            count: Number(count) || 0,
          }));
        } else {
          throw new Error(`Could not load contributions for "${username}".`);
        }
      }

      if (!days || days.length === 0) {
        throw new Error(`No contribution data found for "${username}".`);
      }

      setProfile({ name: username.trim(), avatarUrl: `https://github.com/${username.trim()}.png?size=32` });
      setData(days);
      setLoading(false);
      return true;

    } catch (err) {
      setError(err.message);
      setLoading(false);
      return false;
    }
  }, []);

  return { data, profile, loading, error, fetchData };
}