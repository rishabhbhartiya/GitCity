# Contributing to GitCity

First off — thank you for taking the time to contribute! 🎉

GitCity is an open source project and contributions of all kinds are welcome — bug fixes, new features, documentation improvements, and more.

---

## Table of Contents

- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Reporting Bugs](#reporting-bugs)
- [Suggesting Features](#suggesting-features)

---

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_USERNAME/gitcity`
3. **Install** dependencies: `npm install`
4. **Set up** environment: `cp .env.example .env.local` and add your `GITHUB_TOKEN`
5. **Run** locally: `vercel dev`

---

## Development Setup

```bash
# Install dependencies
npm install

# Run with Vercel dev (recommended — runs API functions locally)
vercel dev

# Run Vite only (no API functions — use hosted API)
npm run dev

# Build for production
npm run build
```

### Environment variables

Create a `.env.local` file:
```
GITHUB_TOKEN=ghp_your_github_token_here
```

Generate a token at [github.com/settings/tokens](https://github.com/settings/tokens) with `read:user` scope.

---

## How to Contribute

### Bug fixes
- Check existing [issues](../../issues) first
- If not reported, open an issue describing the bug
- Reference the issue in your PR

### New features
- Open an issue first to discuss the feature
- Wait for maintainer feedback before spending time building
- Small, focused PRs are merged faster than large ones

### Themes
Want to add a new theme? Each theme needs:
```js
yourtheme: {
  bg:      "#...",  // background
  surface: "#...",  // card/panel surface
  accent:  "#...",  // primary accent colour
  muted:   "#...",  // secondary text
  text:    "#...",  // primary text
  border:  "#...",  // border colour
  glow:    "#...",  // glow/shadow colour
  winLit:  "#...",  // lit window colour
  winDark: "#...",  // unlit window colour
  levels:  ["#...","#...","#...","#...","#..."],  // 5 contribution levels
}
```
Add it to `src/constants/themes.js` and `api/og/[username].js`.

---

## Pull Request Process

1. **Branch** from `main`: `git checkout -b feat/your-feature`
2. **Commit** with clear messages: `feat: add aurora theme variant`
3. **Test** your changes locally with `vercel dev`
4. **Push** and open a PR against `main`
5. **Describe** what changed and why in the PR description
6. **Link** any related issues: `Closes #42`

### Commit message format
```
type: short description

Types: feat | fix | docs | style | refactor | perf | chore
```

PRs that pass review will be merged by the maintainer. All contributors will be credited.

---

## Coding Standards

- **React** components use functional components + hooks
- **No** class components
- **CSS-in-JS** (inline styles) — no external CSS files
- **ESM** (`import`/`export`) throughout — no CommonJS `require()`
- Keep components focused — one responsibility per file
- API functions in `/api/` must handle errors and always return a response

---

## Reporting Bugs

Open a [GitHub issue](../../issues/new) with:
- **Browser** and version
- **Steps to reproduce**
- **Expected** vs **actual** behaviour
- **Screenshots** if relevant
- The **username** you were trying (if it's a data issue)

---

## Suggesting Features

Open a [GitHub issue](../../issues/new) with the label `enhancement`:
- What problem does it solve?
- Who would use it?
- Any implementation ideas?

---

## Questions?

Open a [discussion](../../discussions) or reach out via [natrajx.in](https://natrajx.in).

---

Made with ☕ by [Natraj X](https://natrajx.in)
