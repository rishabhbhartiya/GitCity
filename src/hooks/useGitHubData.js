/**
 * useGitHubData.js
 *
 * Fetches contribution data from the GitHub GraphQL API.
 *
 * Usage:
 *   const { data, loading, error, fetch } = useGitHubData();
 *   fetch(username, token);
 *
 * Returns data as [{ date: "YYYY-MM-DD", count: number }]
 */

import { useState, useCallback } from "react";

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

const QUERY = `
  query($login: String!) {
    user(login: $login) {
      name
      avatarUrl
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
            }
          }
        }
      }
    }
  }
`;

export function useGitHubData() {
  const [data,    setData]    = useState(null);
  const [profile, setProfile] = useState(null); // { name, avatarUrl }
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState(null);

  const fetchData = useCallback(async (username, token) => {
    if (!username || !token) {
      setError("Username and token are required.");
      return false;
    }

    setLoading(true);
    setError(null);
    setData(null);

    try {
      const res = await fetch(GITHUB_GRAPHQL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `bearer ${token}`,
        },
        body: JSON.stringify({ query: QUERY, variables: { login: username } }),
      });

      if (!res.ok) {
        throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
      }

      const json = await res.json();

      if (json.errors) {
        const msg = json.errors[0]?.message ?? "Unknown GraphQL error";
        throw new Error(msg);
      }

      const user = json.data?.user;
      if (!user) throw new Error(`User "${username}" not found.`);

      // Flatten weeks → days
      const days = user.contributionsCollection.contributionCalendar.weeks
        .flatMap(w => w.contributionDays)
        .map(d => ({ date: d.date, count: d.contributionCount }));

      setProfile({ name: user.name || username, avatarUrl: user.avatarUrl });
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
