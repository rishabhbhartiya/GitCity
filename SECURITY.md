# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| Latest (main) | ✅ |
| Older branches | ❌ |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in GitCity, please report it responsibly:

1. **Email:** Contact via [natrajx.in](https://natrajx.in)
2. **Subject:** `[SECURITY] GitCity - Brief description`
3. **Include:**
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

## What to expect

- **Acknowledgement** within 48 hours
- **Status update** within 7 days
- **Fix** as soon as possible depending on severity
- **Credit** in the release notes if you wish

## Scope

### In scope
- The deployed site `gitcity.natrajx.in`
- The serverless API endpoints (`/api/contributions`, `/api/og`, `/api/svg`)
- The React frontend

### Out of scope
- Third-party services (GitHub API, jogruber proxy)
- Social engineering attacks
- Denial of service attacks

## Known limitations

- The app uses a server-side `GITHUB_TOKEN` for GitHub GraphQL queries. This token only has `read:user` scope and is never exposed to the client.
- Contribution data is public GitHub data — no private data is accessed.

Thank you for helping keep GitCity safe.
