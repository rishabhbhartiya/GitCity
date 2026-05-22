/**
 * /api/og/[username].js
 */

const THEMES = {
    matrix: { bg: "#060d06", surface: "#0c1a0c", accent: "#00ff41", muted: "#3d6b3d", text: "#b0ffb0", levels: ["#0c1a0c", "#0e4020", "#1a7535", "#27ae60", "#00ff41"] },
    noir: { bg: "#04080f", surface: "#0c1525", accent: "#00d4ff", muted: "#3d6080", text: "#e0f4ff", levels: ["#0c1525", "#0d2d4e", "#0e5080", "#1a8fc1", "#00d4ff"] },
    aurora: { bg: "#030710", surface: "#0a1428", accent: "#a855f7", muted: "#4060a0", text: "#d0e8ff", levels: ["#0a1428", "#2d1060", "#5b20a0", "#8b35d0", "#a855f7"] },
    ocean: { bg: "#020c14", surface: "#061828", accent: "#00b4d8", muted: "#2a6080", text: "#cceeff", levels: ["#061828", "#0a3060", "#0a6090", "#0090c0", "#00b4d8"] },
    gold: { bg: "#0c0900", surface: "#1a1200", accent: "#ffd700", muted: "#7a6020", text: "#fff3cc", levels: ["#1a1200", "#4a3000", "#806000", "#c09000", "#ffd700"] },
    ice: { bg: "#060810", surface: "#0d1220", accent: "#a8c8ff", muted: "#5060a0", text: "#e8f0ff", levels: ["#0d1220", "#1a2a50", "#2a4a90", "#4a70d0", "#a8c8ff"] },
};

// ── Fetch via public proxy (no token needed) ──────────────────────────────────
async function fetchViaProxy(username) {
    const url = `https://github-contributions-api.jogruber.de/v4/${username}?y=last`;
    const res = await fetch(url, { headers: { "User-Agent": "GitCity-OG/1.0" } });
    if (!res.ok) throw new Error(`Proxy returned ${res.status}`);
    const json = await res.json();
    const contributions = json.contributions;
    if (!Array.isArray(contributions) || contributions.length === 0) {
        throw new Error("No contributions from proxy");
    }
    const days = contributions.map(d => ({ date: d.date, count: d.count ?? 0 }));
    const total = days.reduce((s, d) => s + d.count, 0);
    return { name: username, total, days };
}

// ── Fetch via GitHub GraphQL (needs token) ────────────────────────────────────
async function fetchViaGraphQL(username, token) {
    const today = new Date();
    const from = `${today.getFullYear()}-01-01T00:00:00Z`;
    const to = today.toISOString().slice(0, 19) + "Z";

    const query = `
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        name
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
            totalContributions
            weeks { contributionDays { date contributionCount } }
          }
        }
      }
    }
  `;

    const res = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `bearer ${token}`,
            "User-Agent": "GitCity-OG/1.0",
        },
        body: JSON.stringify({ query, variables: { login: username, from, to } }),
    });

    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const json = await res.json();
    if (json.errors) throw new Error(json.errors[0]?.message || "GraphQL error");

    const user = json.data?.user;
    if (!user) throw new Error(`User not found: ${username}`);

    const days = user.contributionsCollection.contributionCalendar.weeks
        .flatMap(w => w.contributionDays)
        .map(d => ({ date: d.date, count: d.contributionCount }));

    return {
        name: user.name || username,
        total: user.contributionsCollection.contributionCalendar.totalContributions,
        days,
    };
}

// ── Build SVG ─────────────────────────────────────────────────────────────────
function buildSVG(username, data, themeName) {
    const { days, total, name } = data;
    const t = THEMES[themeName] || THEMES.matrix;

    const CELL = 11, GAP = 2, ROWS = 7;
    const PAD_X = 14, PAD_Y = 44;
    const weeks = [];
    let week = new Array(7).fill(null);
    days.forEach(d => {
        const dow = new Date(d.date + "T12:00:00Z").getUTCDay();
        week[dow] = d;
        if (dow === 6) { weeks.push(week); week = new Array(7).fill(null); }
    });
    if (week.some(Boolean)) weeks.push(week);

    const COLS = weeks.length;
    const W = PAD_X * 2 + COLS * (CELL + GAP);
    const H = PAD_Y + ROWS * (CELL + GAP) + 32;
    const maxC = Math.max(...days.map(d => d.count), 1);

    function level(count) {
        if (!count) return 0;
        const r = count / maxC;
        return r < 0.25 ? 1 : r < 0.5 ? 2 : r < 0.75 ? 3 : 4;
    }

    // Month labels
    let monthLabels = "";
    let lastMonth = -1;
    weeks.forEach((w, wi) => {
        const firstDay = w.find(Boolean);
        if (!firstDay) return;
        const d = new Date(firstDay.date + "T12:00:00Z");
        const m = d.getUTCMonth();
        if (m !== lastMonth) {
            lastMonth = m;
            const label = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
            const x = PAD_X + wi * (CELL + GAP);
            monthLabels += `<text x="${x}" y="16" font-family="monospace" font-size="9" fill="${t.muted}">${label}</text>`;
        }
    });

    // Day cells
    let cells = "";
    weeks.forEach((w, wi) => {
        w.forEach((d, dow) => {
            const x = PAD_X + wi * (CELL + GAP);
            const y = PAD_Y + dow * (CELL + GAP);
            const color = d ? t.levels[level(d.count)] : t.levels[0];
            const title = d ? `${d.count} contributions on ${d.date}` : "";
            cells += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" rx="2" fill="${color}">${title ? `<title>${title}</title>` : ""}</rect>`;
        });
    });

    // Legend
    const lx = PAD_X;
    const ly = H - 18;
    const legend = [
        `<text x="${lx}" y="${ly + 8}" font-family="monospace" font-size="8" fill="${t.muted}">Less</text>`,
        ...[0, 1, 2, 3, 4].map((l, i) =>
            `<rect x="${lx + 28 + i * 14}" y="${ly}" width="${CELL}" height="${CELL}" rx="2" fill="${t.levels[l]}"/>`
        ),
        `<text x="${lx + 105}" y="${ly + 8}" font-family="monospace" font-size="8" fill="${t.muted}">More</text>`,
        // Right-aligned credit
        `<text x="${W - PAD_X}" y="${ly + 8}" text-anchor="end" font-family="monospace" font-size="8" fill="${t.muted}">gitcity.natrajx.in</text>`,
    ].join("");

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" rx="10" fill="${t.bg}"/>
  <!-- Header -->
  <text x="${PAD_X}" y="${PAD_Y - 24}" font-family="monospace" font-size="12" font-weight="bold" fill="${t.accent}">${escXml(name || username)}</text>
  <text x="${PAD_X + 6 + (name || username).length * 7.5}" y="${PAD_Y - 24}" font-family="monospace" font-size="10" fill="${t.muted}">'s GitCity Skyline</text>
  <text x="${PAD_X}" y="${PAD_Y - 10}" font-family="monospace" font-size="9" fill="${t.muted}">${total.toLocaleString()} contributions in the last year</text>
  <!-- Month labels -->
  ${monthLabels}
  <!-- Cells -->
  ${cells}
  <!-- Legend -->
  ${legend}
</svg>`;
}

function escXml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function errorSVG(msg) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="72" viewBox="0 0 480 72">
  <rect width="480" height="72" rx="8" fill="#0c0c14"/>
  <text x="16" y="30" font-family="monospace" font-size="13" font-weight="bold" fill="#ff6b6b">⚠ GitCity — could not load skyline</text>
  <text x="16" y="52" font-family="monospace" font-size="10" fill="#666688">${escXml(msg)}</text>
</svg>`;
}

// ── Handler ───────────────────────────────────────────────────────────────────
export default async function handler(req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    if (req.method === "OPTIONS") return res.status(200).end();
    let username = (req.query.username || "").trim();
    if (!username) {
        const parts = (req.url || "").split("?")[0].split("/").filter(Boolean);
        username = parts[parts.length - 1] || "";
    }
    username = decodeURIComponent(username).replace(/\.svg$/i, "").trim();

    const theme = (req.query.theme || "matrix").trim().toLowerCase();
    if (!username || !/^[a-zA-Z0-9][a-zA-Z0-9-]{0,38}$/.test(username)) {
        res.setHeader("Content-Type", "image/svg+xml");
        return res.status(400).send(errorSVG(`Invalid username: "${username}"`));
    }

    try {
        let data;
        try {
            data = await fetchViaProxy(username);
        } catch (proxyErr) {
            const token = process.env.GITHUB_TOKEN;
            if (!token) throw new Error(`Could not fetch contributions for "${username}". Try again later.`);
            data = await fetchViaGraphQL(username, token);
        }

        const svg = buildSVG(username, data, theme);
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");
        return res.status(200).send(svg);

    } catch (err) {
        res.setHeader("Content-Type", "image/svg+xml");
        res.setHeader("Cache-Control", "no-store");
        return res.status(200).send(errorSVG(err.message));
    }
}