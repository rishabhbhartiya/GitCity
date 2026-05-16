# Acknowledgements

GitCity builds on ideas and infrastructure from many people. Credit where it's due.

---

## Conceptual Lineage

**GitHub, Inc.** — [GitHub Skyline](https://skyline.github.com)  
Originated the metaphor of rendering contribution history as 3D terrain/skyline (2020). The visual language of "commits = height" comes from here.

**Jan Hannemann (honzaap)** — [GithubCity](https://honzaap.github.io/GithubCity/)  
First widely-recognised implementation of per-day contribution data rendered as a Three.js 3D city (2022). Proved the concept at scale. GitCity's simulation view is independently built but draws creative inspiration from the existence of this project.

**Samuel Rizzon** — [thegitcity.com](https://thegitcity.com)  
Explored the social-network angle of the "GitHub as city" concept (2025–2026). Discovering this project mid-build clarified what GitCity should not be, sharpening the product focus toward a personal tool.

**bentolor** — [gitcity (Kotlin VR)](https://github.com/bentolor/gitcity)  
Early exploration of representing Git repository history as a navigable 3D city. Predates both honzaap and Samuel on the naming, different concept (repo structure vs contribution history).

---

## Technical Dependencies

**Three.js** — [threejs.org](https://threejs.org) · MIT License  
3D rendering engine used for the City Simulation view.

**React** — [react.dev](https://react.dev) · MIT License  
UI framework.

**Vite** — [vitejs.dev](https://vitejs.dev) · MIT License  
Build tool and dev server.

**react-helmet-async** · MIT License  
Dynamic meta tag management for SEO.

**Vercel** — [vercel.com](https://vercel.com)  
Hosting and serverless functions.

**GitHub GraphQL API** — [docs.github.com](https://docs.github.com/en/graphql)  
Source of contribution data. No authentication required for public profiles.

---

## Community

Thanks to everyone who filed issues, suggested features, or shared their skylines. The contribution history that builds your city was made by you.

---

*GitCity is MIT licensed. Build on it, fork it, embed it.*  
*[gitcity.natrajx.in](https://gitcity.natrajx.in) · by [Natraj X](https://natrajx.in)*