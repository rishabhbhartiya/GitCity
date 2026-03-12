# GitCity

**Your GitHub contribution history — reimagined as a 3D city skyline**

![banner](./screenshots/banner.png)

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![SVG](https://img.shields.io/badge/SVG-Isometric_3D-orange?style=flat-square)
![GitHub API](https://img.shields.io/badge/GitHub_API-GraphQL-181717?style=flat-square&logo=github)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

[🌐 Live Demo](https://gitcity.natrajx.in) · [Quick Start](#quick-start) · [Embed](#embed-on-your-portfolio) · [Themes](#themes)

---

## What is GitCity?

GitCity transforms your entire GitHub contribution history into an interactive isometric 3D city skyline. Every day you commit code, a building grows. The more contributions, the taller the tower.

Browse all your years, switch themes, compare streaks — built entirely with React and SVG. No Canvas, no WebGL, no heavy dependencies.

![demo](./screenshots/demo.png)

---

## See it live — rishabhbhartiya's Skyline

[![GitCity Skyline](https://gitcity.natrajx.in/rishabhbhartiya.svg)](https://gitcity.natrajx.in/rishabhbhartiya)

View the full interactive skyline → [gitcity.natrajx.in/rishabhbhartiya](https://gitcity.natrajx.in/rishabhbhartiya)

---

## Features

- **⬡ Isometric 3D Skyline** — dimetric projection, proportional building heights, windows, antennas
- **⊞ Bird's Eye View** — classic GitHub-style heatmap toggle
- **🎨 6 Themes** — Matrix, Noir, Aurora, Ocean, Gold, Ice
- **📅 All-Years Data** — full contribution history from the day you joined GitHub
- **🗓 Year Filters** — jump to any specific year (exact 52-53 week grid per year)
- **⏱ Rolling Filters** — All Time, 12 Mo, 6 Mo, 3 Mo, Month, Week
- **📊 Live Stats** — total commits, peak day, longest streak, current streak
- **🔗 URL Params** — shareable links, pre-loaded by username and theme
- **💾 Remember Me** — auto-loads on return via localStorage
- **🖼 SVG API** — embed your skyline in any README or portfolio as an image
- **📱 Responsive** — fits any viewport, tooltip flips to stay in bounds
- **🚫 Zero client dependencies** — only React 18 + Vite

---

## Screenshots

> Add your own screenshots by creating a `screenshots/` folder in the repo root.

| Matrix Theme | Noir Theme |
|---|---|
| ![matrix](./screenshots/matrix.png) | ![noir](./screenshots/noir.png) |

| Ocean Theme | Aurora Theme | Gold Theme | Ice Theme |
|---|---|---|---|
| ![ocean](./screenshots/ocean.png) | ![aurora](./screenshots/aurora.png) | ![gold](./screenshots/gold.png) | ![ice](./screenshots/ice.png) |

| Login Screen | Year Filter View |
|---|---|
| ![login](./screenshots/login.png) | ![year](./screenshots/year.png) |

---

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- Vercel CLI (`npm i -g vercel`) for local dev with API functions

### Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/yourname/gitcity.git
cd gitcity

# 2. Install dependencies
npm install

# 3. Create your local env file (see Environment Variables below)
echo "GITHUB_TOKEN=ghp_xxxxxxxxxxxx" > .env.local

# 4. Start dev server (Vercel CLI — runs API functions locally)
vercel dev

# 5. Open in your browser at http://localhost:3000
```

> Use `vercel dev` instead of `npm run dev`. The `/api` functions only run under Vercel CLI.

---

## Environment Variables

GitCity uses a server-side GitHub token so users never need to provide one.

**For local dev** — create `.env.local` in your project root:

```
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
```

**For production** — add it in Vercel:

1. Go to [vercel.com](https://vercel.com) → your project → Settings → Environment Variables
2. Key: `GITHUB_TOKEN` / Value: your token / Environment: all three (Production, Preview, Development)
3. Save → Redeploy

**Generate a token:**

1. Go to [github.com/settings/tokens/new](https://github.com/settings/tokens/new)
2. Name: `GitCity Server`
3. Type: Classic token
4. Expiry: No expiration
5. Scope: tick only `read:user`
6. Generate and copy immediately

> Add `.env.local` to your `.gitignore` — never commit your token.

---

## Embed on Your Portfolio

### Option 1 — README Image (SVG)

Drop this into any GitHub README for a live contribution card:

```md
[![GitCity Skyline](https://gitcity.natrajx.in/YOUR_USERNAME.svg)](https://gitcity.natrajx.in/YOUR_USERNAME)
```

With a specific theme:

```md
[![GitCity Skyline](https://gitcity.natrajx.in/YOUR_USERNAME.svg?theme=ocean)](https://gitcity.natrajx.in/YOUR_USERNAME)
```

SVG theme options: `matrix` `noir` `aurora` `ocean` `gold` `ice`

---

### Option 2 — Direct URL

Share or link to anyone's interactive skyline:

```
https://gitcity.natrajx.in/YOUR_USERNAME
https://gitcity.natrajx.in/YOUR_USERNAME?theme=noir
```

URL Parameters:

| Parameter | Required | Description | Example |
|-----------|----------|-------------|---------|
| `username` | Yes | GitHub username | `torvalds` |
| `theme` | No | Initial colour theme | `ocean` |

---

### Option 3 — iframe Embed

Embed the full interactive skyline in any HTML page or portfolio site:

```html
<iframe
  src="https://gitcity.natrajx.in/YOUR_USERNAME?theme=noir"
  width="100%"
  height="500px"
  frameborder="0"
  style="border-radius: 12px; overflow: hidden;"
  title="GitCity — My Contribution Skyline"
></iframe>
```

Tips:
- The iframe is fully interactive — hover tooltips, theme switching, year filters, view toggle all work
- Use `theme=` to match your portfolio colour scheme
- `height="480px"` fits cleanly in a single viewport section

---

### Option 4 — React Component

Copy these folders into your existing React project:

```
src/components/ContributionGraph3D/
src/hooks/
src/constants/
src/utils/
```

Then import and use:

```jsx
import { ContributionGraph3D } from "./components/ContributionGraph3D";

// With live data from your own API
<ContributionGraph3D
  contributions={data}    // [{ date: "YYYY-MM-DD", count: number }]
  themeName="ocean"
  title="My Skyline"
/>

// With random demo data
<ContributionGraph3D
  contributions={null}
  themeName="matrix"
  title="GitCity"
/>
```

---

## Deploy Your Own Instance

### Vercel (Recommended)

```bash
npm i -g vercel
vercel
```

Or via the dashboard:

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your repo
3. Framework preset: Vite (auto-detected)
4. Build command: `npm run build`
5. Output directory: `dist`
6. Add `GITHUB_TOKEN` environment variable (see above)
7. Click Deploy

### Netlify

Netlify supports serverless functions but requires adapting the `/api` folder to Netlify Functions format. Vercel is strongly recommended for this project.

---

## API Endpoints

Once deployed, three endpoints are available:

| Endpoint | Returns | Example |
|----------|---------|---------|
| `/USERNAME` | Interactive skyline page | `/rishabhbhartiya` |
| `/USERNAME.svg` | SVG contribution card | `/rishabhbhartiya.svg?theme=ocean` |
| `/api/contributions/USERNAME` | Raw JSON — all years | `/api/contributions/rishabhbhartiya` |

JSON response shape:

```json
{
  "username": "rishabhbhartiya",
  "years": [2022, 2023, 2024, 2025],
  "contributions": [
    { "date": "2022-01-01", "count": 0 },
    { "date": "2022-01-02", "count": 4 }
  ]
}
```

---

## Themes

| Name | Accent | Vibe |
|------|--------|------|
| `matrix` | `#00ff41` | Classic terminal green |
| `noir` | `#00d4ff` | Dark cyberpunk cyan |
| `aurora` | `#a855f7` | Northern lights purple |
| `ocean` | `#00b4d8` | Deep sea teal |
| `gold` | `#ffd700` | Pure gold towers |
| `ice` | `#a8c8ff` | Silver-blue crystal |

---

## Time Filters

| Filter | Range |
|--------|-------|
| All Time | Every contribution since you joined GitHub |
| 12 Mo | Rolling 12 months from today |
| 6 Mo | Rolling 6 months |
| 3 Mo | Rolling 3 months |
| Month | Current calendar month |
| Week | Current week |
| 2025, 2024… | Exact Jan 1 → Dec 31 for that year (52-53 tiles) |

Year buttons are generated automatically from your actual data.

---

## Project Structure

```
gitcity/
├── api/
│   ├── contributions/
│   │   └── [username].js     ← serverless: fetches all-years data
│   └── og/
│       └── [username].js     ← serverless: generates SVG card
├── public/
├── screenshots/              ← add your screenshots here
├── vercel.json               ← URL routing rules
└── src/
    ├── App.jsx               ← auth flow, URL params, localStorage
    ├── components/
    │   └── ContributionGraph3D/
    │       ├── ContributionGraph3D.jsx
    │       ├── GitHubConnect.jsx
    │       ├── IsometricGrid.jsx
    │       ├── Building.jsx
    │       ├── BirdsEyeGrid.jsx
    │       ├── StatsBar.jsx
    │       ├── Tooltip.jsx
    │       ├── ThemePicker.jsx
    │       ├── ViewToggle.jsx
    │       └── GraphLegend.jsx
    ├── hooks/
    │   ├── useGitHubData.js
    │   ├── useContributionData.js
    │   ├── useMountAnimation.js
    │   └── useMousePosition.js
    ├── constants/
    │   ├── graph.js
    │   └── themes.js
    └── utils/
        ├── dataUtils.js
        └── colorUtils.js
```

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI components and state |
| Vite 5 | Build tool and dev server |
| SVG | All rendering — no Canvas, no WebGL |
| GitHub GraphQL API | All-years contribution data |
| Vercel Serverless | Token-safe API proxy + SVG generation |

---

## License

MIT — use it, fork it, embed it, build on it freely.

---

## Contributing

Pull requests are welcome. For large changes please open an issue first.

---

Made with lots of coffee and too many commits

[⬡ Try GitCity Live](https://gitcity.natrajx.in)

If this helped you, consider starring the repo ⭐