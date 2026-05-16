# GitCity — Case Study

> A personal developer tool that turns your GitHub contribution history into a driveable 3D city. Built by [Natraj X](https://natrajx.in). MIT License.

---

## Problem Statement

Developer portfolios are static. Your GitHub contribution graph tells a story — streaks, burst periods, dead months, consistency — but the default green squares undersell it.

Existing tools had gaps:

| Gap | Why it mattered |
|-----|----------------|
| No README embeds existed for 3D skylines | Developers couldn't showcase the visual in their own profile |
| All tools required accounts or tokens | Friction kills casual exploration |
| No tool let you *inhabit* your own data | The data has narrative potential that flat grids don't exploit |
| Social-network tools mix your data with others | The personal story gets lost |

GitCity was built to close all four gaps for a single user type: **the developer who wants their own contribution history as a personal, embeddable, explorable artefact**.

---

## Lineage & Prior Art (Honest)

GitCity sits in a clear lineage. See [HISTORY.md](./HISTORY.md) for the full timeline.

The short version:
1. **GitHub Skyline (2020)** — GitHub coined "commits as 3D terrain"
2. **honzaap/GithubCity (2022)** — First "contributions per day → Three.js city"
3. **thegitcity.com (2025)** — Social pivot: each user = one building
4. **GitCity (2026)** — Personal tool: each day = one building, driveable, embeddable

The concept is open. The implementation choices are what differentiate each project. GitCity intentionally chose the *opposite* direction from thegitcity.com's social network model.

---

## What Was Actually Built

### Architecture

```
gitcity.natrajx.in/
├── api/
│   ├── svg.js              ← SVG embed API (novel)
│   ├── og/[username].js    ← OG image generation (novel)
│   └── contributions/[username].js  ← GitHub GraphQL proxy
└── src/
    ├── App.jsx             ← Auth flow, SEO, routing
    └── components/ContributionGraph3D/
        ├── IsometricGrid.jsx     ← SVG isometric renderer
        ├── BirdsEyeGrid.jsx      ← Flat heatmap
        ├── Citysimulation.jsx    ← Three.js entry point
        ├── CityTraffic.js        ← AI vehicle pathfinding
        ├── PedestrianSystem.js   ← Walking NPC system
        ├── WeatherSystem.js      ← Rain, wind, day/night
        └── CityAssets.js         ← Procedural building geometry
```

**Stack:** React 18 + Vite 5 · Three.js r128 · SVG (no canvas for skyline) · Vercel Serverless Functions · GitHub GraphQL API

---

### View 1 — Isometric 3D Skyline (SVG)

- Each of 365 days rendered as an isometric building in SVG (not canvas)
- SVG was a deliberate choice: it's embeddable, scalable, no runtime required
- 6 themes: Matrix, Noir, Aurora, Ocean, Gold, Ice
- Hover tooltips with exact date + commit count
- Year / 12m / 6m / 3m / month / week filters

**Key decision:** Using SVG instead of Three.js for the skyline meant the same render could be served as a static API response — enabling README embeds.

---

### View 2 — Bird's Eye Heatmap

- Classic GitHub-style contribution grid
- Same data pipeline as the isometric view, different renderer
- Useful for comparing years side by side

---

### View 3 — City Simulation (Three.js)

This is the genuinely novel part. Your actual commit data becomes the city geometry:

- Days with commits → buildings (height proportional to commit count)
- Days without commits → roads and empty lots
- The denser your commit history, the denser the city

**Systems built from scratch:**

- **CityTraffic.js** — AI vehicles that navigate the road grid, avoid collisions, respect intersections
- **PedestrianSystem.js** — NPCs that walk pavements and cross roads
- **WeatherSystem.js** — Rain particles, wind effects, ambient audio, day/night lighting cycle
- **CityAssets.js** — Procedural building geometry, streetlights, signage
- **Player vehicle** — WASD / arrow key driving with physics feel

None of these systems exist in honzaap's GithubCity or thegitcity.com.

---

### The Embed API (`/api/svg`)

```markdown
[![My GitCity Skyline](https://gitcity.natrajx.in/api/svg?u=USERNAME)](https://gitcity.natrajx.in/USERNAME)
```

- Single GET request returns a themed SVG of the user's contribution skyline
- Cacheable, fast, works in any Markdown renderer including GitHub READMEs
- No equivalent exists in any prior "GitHub as city" project

---

### Auth Design

Intentional constraint: **no account, no token**.

- GitHub's public GraphQL contributions API requires no authentication for public profiles
- Username stored in `localStorage` — no server-side sessions
- URL-based routing (`/torvalds`) for shareable profiles
- URL params for theme (`?theme=noir`) and view (`/torvalds/simulation`)

This was a product decision, not a technical limitation. Friction was the enemy.

---

## What Was Intentionally Not Built

| thegitcity.com feature | Why GitCity skipped it |
|------------------------|----------------------|
| User accounts | Adds friction; no personal data needed |
| Global social city | Dilutes personal narrative |
| Paid cosmetics | Against the "free tool" ethos |
| "You are a building among thousands" | Wrong metaphor for a personal tool |

---

## Differentiation Summary

| Feature | GitCity | honzaap/GithubCity | thegitcity.com |
|---------|---------|-------------------|----------------|
| Building = | One day of YOUR commits | One day of commits | One GitHub user |
| Driveable simulation | ✅ | ❌ | ❌ |
| README SVG embed API | ✅ | ❌ | ❌ |
| Account required | ❌ | ❌ | ✅ |
| Social network | ❌ | ❌ | ✅ |
| All-years history | ✅ | ❌ | ❌ |
| License | MIT | MIT | AGPL-3.0 |
| AI traffic + pedestrians | ✅ | ❌ | ❌ |
| Weather system | ✅ | ❌ | ❌ |
| OG image generation | ✅ | ❌ | ❌ |

---

## Metrics & Validation

- v1.0.0 shipped: March 15, 2026
- Tech: 66 files, 13 directories, ~3,500+ lines of original code
- Three.js simulation systems: 4 custom JS modules written from scratch
- Themes: 6 (Matrix, Noir, Aurora, Ocean, Gold, Ice)

---

## Lessons

**On naming:** The name "GitCity" overlaps with an older Kotlin VR project (bentolor/gitcity) and phonetically resembles thegitcity.com. This caused confusion. A distinct name would have been smarter. The product concept is defensible; the name choice was not.

**On prior art:** Discovering thegitcity.com mid-build clarified what GitCity should *not* be — social, account-gated, monetised. Constraint via contrast.

**On open source concepts:** No one owns "GitHub contributions as buildings." The concept is as open as "map of the internet as a city." What matters is the specific implementation, the product decisions, and the features that emerge from those decisions.

---

## Source & License

→ [gitcity.natrajx.in](https://gitcity.natrajx.in)  
→ MIT License — do anything, keep the credit  
→ Built by [Natraj X](https://natrajx.in)