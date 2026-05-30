# Roadmap

MarkNest is an **early-preview**, **local-first** project. This document sets expectations for what is in the public repo today, what we want next, and what we are not pursuing yet.

**Repository:** https://github.com/Mosab246/marknest

---

## Current public scope (v0.2.0)

What works today when you [build from source](README.md#quick-start):

### Desktop app

- Manual bookmark create, read, update, delete
- Types: tweet, thread, article, video, other
- Tags, folders, favorites, archive, unread/read status
- Full-text search (SQLite FTS5)
- Highlights on saved items
- JSON export and database backup
- System tray on desktop (close-to-tray, open/quit, bridge status)
- Windows-oriented startup/tray options (other platforms may vary)

### Optional Chrome extension

- Save current page, selection, or visible X/Twitter content via local bridge (`127.0.0.1:4763`)
- Popup review save, Quick Save, context menus, `Ctrl+Shift+M`
- Requires MarkNest desktop app running

### Explicit non-goals in this release

- No cloud account, sync, or MarkNest-hosted backend
- No X/Twitter API or paid scraping
- No JSON import UI yet
- No built-in AI summaries or vector search

---

## Near-term roadmap

Targeted improvements while staying local-first and open source:

| Priority | Item | Notes |
| -------- | ---- | ----- |
| High | **First GitHub Release** | Windows installer via `npm run tauri build`; see [docs/RELEASE.md](docs/RELEASE.md) |
| High | **CI green on `main`** | `npm run build` + `cargo check` on Ubuntu (Tauri system deps installed) |
| Medium | **JSON import** | Import from existing JSON export format |
| Medium | **Extension release zip** | Optional downloadable zip for sideloading (see [docs/RELEASE.md](docs/RELEASE.md)) |
| Medium | **Capture regression docs** | Repro templates when X DOM changes |
| Low | **macOS / Linux installer verification** | Tray and bundle smoke on non-Windows hosts |

---

## Future roadmap

Ideas that fit the product direction but are not scheduled:

- Optional **local-only** AI summaries (no cloud inference requirement)
- Scheduled **user-controlled backups** (paths, reminders)
- Narrower extension permission mode (site allowlist) for privacy-conscious users
- Chrome Web Store listing (separate review process)
- Improved cross-platform tray parity

Discussion welcome via [feature requests](https://github.com/Mosab246/marknest/issues/new?template=feature_request.yml).

---

## Experimental features

Shipped but **best-effort** or **off by default**. May break without notice when browsers or X change.

| Feature | Status |
| ------- | ------ |
| **X/Twitter DOM capture** | Heuristic extraction; no official API; empty body text possible |
| **Auto-save on X bookmark** | Extension toggle; default **off** |
| **Tweet / video embeds** | May load `platform.twitter.com` when viewing; saved text stays local |
| **Capture quality heuristics** | UI hints only; not a guarantee of completeness |

Core library features do **not** depend on these.

---

## Out of scope (for now)

We are unlikely to accept contributions that add:

- Cloud sync, multi-user accounts, or team workspaces
- Hosted MarkNest servers or telemetry pipelines
- X/Twitter API integration that requires paid API access as a default path
- Scraping or automation that violates site terms of service
- Marketing sites or landing pages inside this repo

If your idea is adjacent (e.g. export to another local tool), open a [feature request](https://github.com/Mosab246/marknest/issues/new?template=feature_request.yml) first.

---

## How to influence the roadmap

1. Read [CONTRIBUTING.md](CONTRIBUTING.md).
2. Search [existing issues](https://github.com/Mosab246/marknest/issues).
3. File a focused [bug](https://github.com/Mosab246/marknest/issues/new?template=bug_report.yml) or [feature request](https://github.com/Mosab246/marknest/issues/new?template=feature_request.yml).
4. For security issues, use [GitHub Security Advisories](https://github.com/Mosab246/marknest/security) — not a public exploit thread.

Release history: [CHANGELOG.md](CHANGELOG.md) · Builds: [Releases](https://github.com/Mosab246/marknest/releases).
