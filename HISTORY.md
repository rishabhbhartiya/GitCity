# HISTORY — Prior Art & Lineage of "GitHub as a City"

> This document traces the full lineage of GitHub contribution visualisations rendered as 3D cities. GitCity is one node in a lineage that began at GitHub itself. No one owns the concept.

---

## The Lineage

### 2020 — GitHub Skyline (GitHub, Inc.)
GitHub themselves introduced the metaphor: your contribution graph rendered as 3D terrain, downloadable as an STL file for 3D printing. The word "skyline" and the visual language of "commits = building height" originate here.

→ https://skyline.github.com (archived)

### ~2019–2021 — bentolor/gitcity
A VR/3D exploration of a **Git repository's history** rendered as a city — buildings represent files and directories, not contribution days. Different concept, but the "git → city" naming predates both honzaap and Samuel Rizzon.

→ https://github.com/bentolor/gitcity

### 2022 — honzaap/GithubCity
Jan Hannemann (honzaap) launched GithubCity, ranking #2 on Product Hunt with 248 upvotes. It was the first widely-recognised project to render a **user's contribution history as a Three.js 3D city**, with each day becoming a building. honzaap's own words:

> "GitHub already did that with GitHub Skyline and when I looked at it I thought it looked like a city."

This is the direct conceptual ancestor of the "contributions-as-city" idea in its modern form.

→ https://honzaap.github.io/GithubCity/

### 2025–2026 — thegitcity.com (Samuel Rizzon)
Samuel Rizzon built a **social network** variant: every GitHub *user* becomes one building in a shared global city. Building height = total contribution count. Requires account creation. Offers paid cosmetics. Reached viral scale (~1M views on one video).

Different concept from honzaap: the building is the *person*, not the *day*.

→ https://thegitcity.com

### 2026 — GitCity (gitcity.natrajx.in)
Built by Natraj X as a **personal developer tool**, not a social network. Each building = one day of the *owner's* commit history. Three distinct views: Isometric 3D Skyline, Bird's Eye Heatmap, and a driveable City Simulation. Embeddable as a live SVG in any GitHub README. No account required.

Novel features not present in any prior project:
- Driveable Three.js simulation with AI traffic, pedestrians, weather
- `/api/svg` embed API — live SVG for GitHub READMEs
- OG image generation per user (`/api/og/[username]`)
- All-years history (every year since account creation)
- Username-only, no token or account

→ https://gitcity.natrajx.in · MIT License

---

## Summary

| Year | Project | Author | Building = ? | Social? |
|------|---------|--------|--------------|---------|
| 2020 | GitHub Skyline | GitHub, Inc. | Year's terrain | No |
| ~2021 | bentolor/gitcity | bentolor | Repo files/dirs | No |
| 2022 | GithubCity | honzaap | One day of commits | No |
| 2025 | thegitcity.com | Samuel Rizzon | One GitHub user | Yes |
| 2026 | GitCity | Natraj X | One day of commits | No |

---

## Key takeaway

The idea of rendering GitHub contributions as 3D buildings is not proprietary to any individual. It traces to GitHub's own product in 2020. Multiple developers have independently explored it with different angles. GitCity's angle — personal, embeddable, driveable, free — is distinct from all prior work.

---

*Maintained by [Natraj X](https://natrajx.in) · Last updated 2026*