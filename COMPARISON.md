# GitCity vs thegitcity.com — They Are Completely Different Products

> This document exists because people keep comparing these two projects.
> They share a similar name but solve **entirely different problems**.

---

## What thegitcity.com does

- Every GitHub **user** becomes **one building** in a shared global city
- Building height = total contribution count of that user
- It's a **social network** — you explore other developers' buildings
- You fly through a city where each building = one person
- Paid customisation: crowns, auras, roof effects
- Requires an account

## What GitCity (gitcity.natrajx.in) does

GitCity visualises **your own contribution history** across **three completely different views**:

### Panel 1 — 3D Isometric Skyline
- Your **365 days of contributions** rendered as an isometric 3D city
- Each **day** = one building. Height = commits on that day
- Click any building to see the exact date and commit count
- 6 themes, year/month/week filters
- Embeds in any GitHub README as a live SVG

### Panel 2 — Bird's Eye Heatmap
- Classic GitHub-style contribution grid
- Same data, different visual — flat tile heatmap
- Good for comparing years side by side

### Panel 3 — City Simulation (Three.js)
- A **driveable 3D city** built entirely from your real commit data
- Each **day you committed** = one building in the city
- Drive your car through streets built from your own history
- AI traffic, pedestrians, airplane, day/night mode
- The more active your commit history, the denser the city

---

## Side-by-side comparison

| Feature | GitCity (ours) | thegitcity.com |
|---------|---------------|----------------|
| **What each building represents** | One day of your commits | One GitHub user |
| **Purpose** | Visualise your personal history | Explore a social city of developers |
| **Views** | 3D Skyline + Heatmap + Simulation | Single 3D city |
| **Driveable simulation** | ✅ Yes — drive through your own data | ❌ No |
| **README embed** | ✅ One-line SVG API | ❌ No |
| **Account required** | ❌ Username only | ✅ Yes |
| **All-years history** | ✅ Every year since joining | ❌ No |
| **Open source license** | ✅ MIT — do anything | AGPL-3.0 — deploy = share source |
| **Self-hostable freely** | ✅ Yes | ❌ AGPL restricts this |
| **Monetisation** | Free | Paid items ($1–3) |

---

## Summary

**thegitcity.com** = a social city where *you* are a building among thousands of other developers.

**GitCity** = your entire contribution history *becomes* a city that only you live in — and you can drive through it.

Same name, completely different concept. One is a social network. The other is a personal developer tool.

---

## Embed your skyline (something thegitcity.com cannot do)

```markdown
[![My GitCity Skyline](https://gitcity.natrajx.in/api/svg?u=YOUR_USERNAME)](https://gitcity.natrajx.in/YOUR_USERNAME)
```

---

*Built by [Natraj X](https://natrajx.in) · [gitcity.natrajx.in](https://gitcity.natrajx.in) · MIT License*
