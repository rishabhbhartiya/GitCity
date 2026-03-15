<div align="center">

<a href="https://gitcity.natrajx.in">
  <img src="./screenshots/3dcity.gif" alt="GitCity — GitHub Contributions as a 3D City Skyline" width="100%" />
</a>

# ⬡ GitCity

**Your GitHub contribution history — reimagined as a living 3D city**

[![Live Demo](https://img.shields.io/badge/🌐_Live_Demo-gitcity.natrajx.in-00ff41?style=for-the-badge&labelColor=060d06)](https://gitcity.natrajx.in)
[![Made by Natraj X](https://img.shields.io/badge/Made_by-Natraj_X-a855f7?style=for-the-badge&labelColor=030710)](https://natrajx.in)
[![React 18](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![License MIT](https://img.shields.io/badge/License-MIT-00b4d8?style=for-the-badge)](./LICENSE)

</div>

---

## 🏙️ See it live — your skyline in one line

Drop this into any GitHub README, portfolio, or blog post:

```markdown
[![My GitCity Skyline](https://gitcity.natrajx.in/api/svg?u=YOUR_USERNAME)](https://gitcity.natrajx.in/YOUR_USERNAME)
```

**rishabhbhartiya's skyline — rendered live from the API:**

[![GitCity Skyline](https://gitcity.natrajx.in/api/svg?u=rishabhbhartiya)](https://gitcity.natrajx.in/rishabhbhartiya)

> Every building = one day of commits. The taller the tower, the more you shipped.

**random's skyline — rendered live from the API:-**

[![GitCity Skyline](https://gitcity.natrajx.in/api/svg?u=urpreetam)](https://gitcity.natrajx.in/urpreetam)

---

## ✨ What is GitCity?

GitCity fetches your **entire GitHub contribution history** via the GitHub GraphQL API and renders it as:

| View | Description |
|------|-------------|
| **⬡ 3D Skyline** | Isometric SVG city — buildings grow with commit count |
| **🏎️ City Simulation** | Drive a Three.js city built from your real commit data |
| **⊞ Bird's Eye** | Classic contribution heatmap, reimagined |

No personal access token required. Enter your username and go.

---

## 🎨 Themes

Six handcrafted themes — switch instantly:

| Theme | Preview |
|-------|---------|
| **Matrix** | [![matrix](https://img.shields.io/badge/Matrix-00ff41?style=flat-square&labelColor=060d06)](https://gitcity.natrajx.in/rishabhbhartiya?theme=matrix) |
| **Noir** | [![noir](https://img.shields.io/badge/Noir-00d4ff?style=flat-square&labelColor=04080f)](https://gitcity.natrajx.in/rishabhbhartiya?theme=noir) |
| **Aurora** | [![aurora](https://img.shields.io/badge/Aurora-a855f7?style=flat-square&labelColor=030710)](https://gitcity.natrajx.in/rishabhbhartiya?theme=aurora) |
| **Ocean** | [![ocean](https://img.shields.io/badge/Ocean-00b4d8?style=flat-square&labelColor=020c14)](https://gitcity.natrajx.in/rishabhbhartiya?theme=ocean) |
| **Gold** | [![gold](https://img.shields.io/badge/Gold-ffd700?style=flat-square&labelColor=0c0900)](https://gitcity.natrajx.in/rishabhbhartiya?theme=gold) |
| **Ice** | [![ice](https://img.shields.io/badge/Ice-a8c8ff?style=flat-square&labelColor=060810)](https://gitcity.natrajx.in/rishabhbhartiya?theme=ice) |

---

## 🔗 Embed API

The SVG embed API is **dynamic** — it re-renders from live GitHub data on each request.

### Basic embed

```markdown
![GitCity](https://gitcity.natrajx.in/api/svg?u=YOUR_USERNAME)
```

### With theme

```markdown
![GitCity Noir](https://gitcity.natrajx.in/api/svg?u=YOUR_USERNAME&theme=noir)
```

Available themes: `matrix` · `noir` · `aurora` · `ocean` · `gold` · `ice`

### HTML (full control)

```html
<a href="https://gitcity.natrajx.in/YOUR_USERNAME">
  <img src="https://gitcity.natrajx.in/api/svg?u=YOUR_USERNAME&theme=aurora"
       alt="My GitHub Skyline" width="100%" />
</a>
```

### iframe (interactive, for portfolios)

```html
<iframe
  src="https://gitcity.natrajx.in/YOUR_USERNAME"
  width="100%" height="500"
  frameborder="0"
  title="GitHub Contribution Skyline">
</iframe>
```

---

## 🚀 Quick Start

### Option A — Use the hosted version (recommended)

Just go to **[gitcity.natrajx.in/YOUR_USERNAME](https://gitcity.natrajx.in)** — no setup needed.

### Option B — Self-host

```bash
# 1. Clone
git clone https://github.com/natrajx/gitcity
cd gitcity

# 2. Install
npm install

# 3. Set your GitHub token (for API calls)
echo "GITHUB_TOKEN=ghp_your_token_here" > .env.local

# 4. Run locally
vercel dev          # uses /api serverless functions
# OR
npm run dev         # Vite only (no API — use hosted API instead)

# 5. Deploy to Vercel
vercel --prod
```

### Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GITHUB_TOKEN` | Yes | GitHub Personal Access Token (read:user scope) |

---

## 🤖 SEO & AI Optimisation

Three files live in `public/` and are served directly from the site root:

| File | URL | Purpose |
|------|-----|---------|
| `public/robots.txt` | `/robots.txt` | Search crawler rules, AI bot allowlist, sitemap pointer |
| `public/sitemap.xml` | `/sitemap.xml` | Pages for Google to index |
| `public/llms.txt` | `/llms.txt` | Machine-readable summary for AI assistants (ChatGPT, Claude, Perplexity) |

**Why `public/`?** Vite copies everything in `public/` verbatim into `dist/` at build time, so these files are served at the bare URL with no routing involved — exactly what crawlers and search engines expect.

---

## 📁 Project Structure

```
gitcity/
├── public/                           # ← Static files served at site root
│   ├── robots.txt                    #   gitcity.natrajx.in/robots.txt
│   ├── sitemap.xml                   #   gitcity.natrajx.in/sitemap.xml
│   └── llms.txt                      #   gitcity.natrajx.in/llms.txt
├── api/
│   ├── contributions/[username].js   # Serverless: GitHub GraphQL proxy
│   └── og/[username].js              # Serverless: SVG generator for embeds
├── index.html                        # Root HTML with SEO/OG meta
├── src/
│   ├── App.jsx                       # Auth flow, URL params
│   ├── components/ContributionGraph3D/
│   │   ├── ContributionGraph3D.jsx   # Main graph component + filters
│   │   ├── IsometricGrid.jsx         # SVG isometric 3D skyline
│   │   ├── CitySimulation.jsx        # Three.js driveable city
│   │   ├── BirdsEyeGrid.jsx          # Heatmap view
│   │   └── Building.jsx              # Individual isometric building
│   ├── constants/
│   │   └── themes.js                 # 6 colour themes
│   └── hooks/
│       └── useGitHubData.js          # Data fetching hook
├── vercel.json                       # Routing rules
└── vite.config.js
```

---

## 🛠️ Tech Stack

- **[React 18](https://react.dev)** — UI
- **[Vite 5](https://vitejs.dev)** — build
- **[Three.js r128](https://threejs.org)** — city simulation (WebGL)
- **SVG** — isometric skyline (pure, embeddable)
- **[GitHub GraphQL API](https://docs.github.com/en/graphql)** — contribution data
- **[Vercel](https://vercel.com)** — hosting + serverless

---

## 🤝 Contributing

PRs welcome. Open an issue first for major changes.

```bash
git checkout -b feat/your-feature
# make changes
git commit -m "feat: your feature"
git push origin feat/your-feature
# open PR → main
```

---

## 🙋 About the Author

Built by **[Natraj X](https://natrajx.in)** — developer, designer, and builder.

- 🌐 Portfolio & blog: **[natrajx.in](https://natrajx.in)**
- 💼 Projects: [natrajx.in/projects](https://natrajx.in/projects)
- ✍️ Writing: [natrajx.in/blog](https://natrajx.in/blog)
- 🐙 GitHub: [@natrajx](https://github.com/natrajx)

If GitCity is useful to you, a ⭐ on the repo and a mention helps a lot.

---

## 📄 License

MIT © [Natraj X](https://natrajx.in) — free to use, modify, and distribute.

---

<div align="center">

Made with ☕ by <a href="https://natrajx.in"><strong>Natraj X</strong></a>
&nbsp;·&nbsp;
<a href="https://gitcity.natrajx.in">gitcity.natrajx.in</a>
&nbsp;·&nbsp;
<a href="https://natrajx.in/projects">More projects</a>
&nbsp;·&nbsp;
<a href="https://natrajx.in/blog">Blog</a>

</div>
