# Changelog

All notable changes to GitCity are documented here.

Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [Unreleased]

### Planned
- More themes
- Mobile optimisation
- Share button for skylines

---

## [1.0.0] — 2026-03-15

### Added
- Isometric 3D SVG skyline — every contribution day = one building
- City Simulation — driveable Three.js city built from real GitHub data
- Bird's Eye heatmap view
- 6 themes: Matrix, Noir, Aurora, Ocean, Gold, Ice
- Year / 12 month / 6 month / 3 month / week filters
- Stats bar — total commits, peak day, longest streak, current streak
- SVG embed API — `GET /api/svg?u=USERNAME` for README embeds
- GitHub GraphQL contributions API — `GET /api/contributions/:username`
- Username-only auth — no personal access token required
- All-years history — fetches every year since account creation
- Welcome animation in city simulation
- Day/Night toggle in city simulation
- Hover contribution cards in isometric view
- Open Graph meta tags for social sharing
- Sitemap, robots.txt, llms.txt for SEO and AI optimisation
- MIT License

### Tech
- React 18 + Vite 5
- Three.js r128 for city simulation
- SVG for isometric skyline (embeddable, no canvas)
- Vercel serverless functions
- GitHub GraphQL API

---

[Unreleased]: https://github.com/natrajx/gitcity/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/natrajx/gitcity/releases/tag/v1.0.0
