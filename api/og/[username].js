/**
 * /api/og/[username].js — GitSkyline
 *
 * Returns a static SVG skyline for README / portfolio embedding.
 *
 * Usage:
 *   GET /api/og/torvalds          → SVG (default matrix theme)
 *   GET /api/og/torvalds?theme=noir  → SVG with noir theme
 *
 * Embed in README:
 *   ![My Skyline](https://gitcity.natrajx.in/api/og/YOUR_USERNAME)
 *
 * Embed in HTML:
 *   <img src="https://gitcity.natrajx.in/api/og/YOUR_USERNAME?theme=ocean" />
 */

const GITHUB_GRAPHQL = "https://api.github.com/graphql";

const THEMES = {
    matrix: { bg: "#060d06", surface: "#0c1a0c", accent: "#00ff41", muted: "#3d6b3d", text: "#b0ffb0", levels: ["#0c1a0c", "#0e4020", "#1a7535", "#27ae60", "#00ff41"] },
    noir: { bg: "#04080f", surface: "#0c1525", accent: "#00d4ff", muted: "#3d6080", text: "#e0f4ff", levels: ["#0c1525", "#0d2d4e", "#0e5080", "#1a8fc1", "#00d4ff"] },
    aurora: { bg: "#030710", surface: "#0a1428", accent: "#a855f7", muted: "#4060a0", text: "#d0e8ff", levels: ["#0a1428", "#2d1060", "#5b20a0", "#8b35d0", "#a855f7"] },
    ocean: { bg: "#020c14", surface: "#061828", accent: "#00b4d8", muted: "#2a6080", text: "#cceeff", levels: ["#061828", "#0a3060", "#0a6090", "#0090c0", "#00b4d8"] },
    gold: { bg: "#0c0900", surface: "#1a1200", accent: "#ffd700", muted: "#7a6020", text: "#fff3cc", levels: ["#1a1200", "#4a3000", "#806000", "#c09000", "#ffd700"] },
    ice: { bg: "#060810", surface: "#0d1220", accent: "#a8c8ff", muted: "#5060a0", text: "#e8f0ff", levels: ["#0d1220", "#1a2a50", "#2a4a90", "#4a70d0", "#a8c8ff"] },
};

async function getContributions(username, token) {
    // Last 365 days only for the SVG (fast)
    const from = new Date();
    from.setFullYear(from.getFullYear() - 1);

    const query = `
    query($login: String!, $from: DateTime!) {
      user(login: $login) {
        name
        contributionsCollection(from: $from) {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays { date contributionCount }
            }
          }
        }
      }
    }
  `;

    const res = await fetch(GITHUB_GRAPHQL, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `bearer ${token}` },
        body: JSON.stringify({ query, variables: { login: username, from: from.toISOString() } }),
    });

    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message ?? "GraphQL error");
    const user = json.data?.user;
    if (!user) throw new Error(`User "${username}" not found`);

    const days = user.contributionsCollection.contributionCalendar.weeks
        .flatMap(w => w.contributionDays)
        .map(d => ({ date: d.date, count: d.contributionCount }));

    return {
        name: user.name || username,
        total: user.contributionsCollection.contributionCalendar.totalContributions,
        days,
    };
}

function buildSVG(username, data, theme) {
    const { days, total, name } = data;
    const t = THEMES[theme] || THEMES.matrix;

    // Grid layout
    const CELL = 11;
    const GAP = 2;
    const COLS = 53;
    const ROWS = 7;
    const PAD_X = 12;
    const PAD_Y = 40;
    const W = PAD_X * 2 + COLS * (CELL + GAP);
    const H = PAD_Y + ROWS * (CELL + GAP) + 30;

    const maxCount = Math.max(...days.map(d => d.count), 1);

    function levelFor(count) {
        if (count === 0) return 0;
        const ratio = count / maxCount;
        if (ratio < 0.25) return 1;
        if (ratio < 0.50) return 2;
        if (ratio < 0.75) return 3;
        return 4;
    }

    // Build week columns
    const weeks = [];
    let week = [];
    days.forEach((d, i) => {
        const dow = new Date(d.date).getDay();
        if (dow === 0 && week.length) { weeks.push(week); week = []; }
        week.push(d);
    });
    if (week.length) weeks.push(week);

    // Generate cells
    let cells = "";
    weeks.forEach((w, wi) => {
        w.forEach((d) => {
            const dow = new Date(d.date).getDay();
            const x = PAD_X + wi * (CELL + GAP);
            const y = PAD_Y + dow * (CELL + GAP);
            const color = t.levels[levelFor(d.count)];
            cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${color}"/>`;
        });
    });

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="10" fill="${t.bg}"/>
  <text x="${PAD_X}" y="18" font-family="monospace" font-size="11" font-weight="bold" fill="${t.accent}">${name || username}'s GitSkyline</text>
  <text x="${PAD_X}" y="32" font-family="monospace" font-size="9" fill="${t.muted}">${total.toLocaleString()} contributions in the last year · gitcity.natrajx.in</text>
  ${cells}
  <text x="${PAD_X}" y="${H - 8}" font-family="monospace" font-size="8" fill="${t.muted}">Less</text>
  ${[0, 1, 2, 3, 4].map((l, i) => `<rect x="${PAD_X + 30 + i * 13}" y="${H - 16}" width="${CELL}" height="${CELL}" rx="2" fill="${t.levels[l]}"/>`).join("")}
  <text x="${PAD_X + 105}" y="${H - 8}" font-family="monospace" font-size="8" fill="${t.muted}">More</text>
</svg>`;
}

export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");

    if (req.method === "OPTIONS") return res.status(200).end();

    const { username, theme = "matrix" } = req.query;
    if (!username) return res.status(400).send("Username required");

    const token = process.env.GITHUB_TOKEN;
    if (!token) return res.status(500).send("GITHUB_TOKEN not configured");

    try {
        const data = await getContributions(username, token);
        const svg = buildSVG(username, data, theme);

        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
        return res.status(200).send(svg);

    } catch (err) {
        // Return error as SVG so <img> tags don't show broken image
        const errSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="60" viewBox="0 0 400 60">
  <rect width="400" height="60" rx="8" fill="#0c0c0c"/>
  <text x="16" y="28" font-family="monospace" font-size="12" fill="#ff6b6b">⚠ GitSkyline</text>
  <text x="16" y="46" font-family="monospace" font-size="10" fill="#666">${err.message}</text>
</svg>`;
        res.setHeader("Content-Type", "image/svg+xml");
        return res.status(200).send(errSvg);
    }
}