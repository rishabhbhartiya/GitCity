/**
 * /api/contributions/[username].js — GitCity
 */

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

async function fetchJoinYear(username, token) {
  const query = `
    query($login: String!) {
      user(login: $login) {
        createdAt
      }
    }
  `;
  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `bearer ${token}` },
    body: JSON.stringify({ query, variables: { login: username } }),
  });
  const json = await res.json();
  const createdAt = json.data?.user?.createdAt;
  return createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear() - 1;
}

async function fetchYear(username, year, token) {
  const from = `${year}-01-01T00:00:00Z`;
  const today = new Date();
  const isCurrentYear = year === today.getFullYear();
  const toDate = isCurrentYear
    ? today.toISOString().replace(/\.\d{3}Z$/, "Z")
    : `${year}-12-31T23:59:59Z`;
  const to = toDate;
  const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
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
  const res = await fetch(GITHUB_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `bearer ${token}` },
    body: JSON.stringify({ query, variables: { login: username, from, to } }),
  });

  if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "GraphQL error");

  const weeks = json.data?.user?.contributionsCollection?.contributionCalendar?.weeks;
  if (!weeks) throw new Error(`User "${username}" not found.`);

  return weeks
    .flatMap(w => w.contributionDays)
    .map(d => ({ date: d.date, count: d.contributionCount }));
}

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });

  const { username } = req.query;
  if (!username) return res.status(400).json({ error: "Username required" });

  const token = process.env.GITHUB_TOKEN;
  if (!token) return res.status(500).json({ error: "GITHUB_TOKEN not configured on server." });

  try {
    const currentYear = new Date().getFullYear();
    const joinYear = await fetchJoinYear(username, token);

    const years = [];
    for (let y = joinYear; y <= currentYear; y++) years.push(y);

    const perYear = await Promise.all(years.map(y => fetchYear(username, y, token)));

    const seen = new Map();
    perYear.flat().forEach(d => {
      if (!seen.has(d.date) || d.count > 0) seen.set(d.date, d.count);
    });

    const contributions = Array.from(seen.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
    return res.status(200).json({ username, years, contributions });

  } catch (err) {
    const status = err.message.includes("not found") ? 404 : 500;
    return res.status(status).json({ error: err.message });
  }
};