# MarkNest

**Local-first bookmark knowledge manager** — save, organize, search, and annotate links, posts, articles, and web resources on your own machine.

> **Early preview** — APIs, capture behavior, and installers may change. Not production-ready; back up `marknest.db` before upgrades. See [CHANGELOG.md](CHANGELOG.md).

MarkNest is a desktop app (Tauri + React) with an **optional** Chrome extension for save-from-browser capture. Use the app alone for manual bookmarks, tags, folders, full-text search, highlights, and JSON export — no account, no cloud sync, no X/Twitter API.

---

## Highlights

| | |
| --- | --- |
| **Your data stays local** | SQLite library on disk — you choose backup/export paths |
| **No login or cloud** | No MarkNest servers; capture bridge listens on `127.0.0.1` only |
| **Reader-style UI** | Three-panel layout (sidebar · list · detail), inspired by common reading apps — [not affiliated](docs/TRADEMARKS.md) with Readwise |
| **Optional extension** | Save pages, selections, and X posts while browsing — desktop app must be running |
| **Search & organize** | FTS5 search, tags, folders, favorites, archive, unread/read status |
| **MIT licensed** | Open source — [LICENSE](LICENSE) |

---

## Quick start

### Requirements

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) and [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS
- Google Chrome — only if you use the extension

### Run from source

```bash
git clone https://github.com/REPLACE_WITH_ORG/marknest.git
cd marknest
npm install
npm run tauri dev
```

The library UI opens on port `1420`. While the app runs (including minimized to the system tray), the **capture bridge** is available at `http://127.0.0.1:4763`.

### Optional: load the Chrome extension

1. Keep MarkNest running (Settings → bridge **Running**).
2. Open `chrome://extensions` → **Developer mode** → **Load unpacked**.
3. Select the [`extension/`](extension/) folder.

Toolbar popup, context-menu save, and `Ctrl+Shift+M` are documented in [extension/README.md](extension/README.md).

### Production build

```bash
npm run build
cd src-tauri && cargo check   # same checks as CI
npm run tauri build          # installers under src-tauri/target/release/bundle/
```

Release details: [docs/RELEASE.md](docs/RELEASE.md).

---

## How it works

```text
Browser (extension) ──POST /api/capture──► 127.0.0.1:4763 (bridge) ──► SQLite ──► MarkNest UI
                     optional              loopback only
```

The extension reads page metadata and visible text in the browser, then sends JSON to the local bridge. The Rust backend persists to `marknest.db` and the React UI reads via Tauri commands. Nothing is sent to a MarkNest cloud — there isn’t one.

| Endpoint | Method | Purpose |
| -------- | ------ | ------- |
| `/api/health` | GET | Bridge up when app is running |
| `/api/capture` | POST | Create/update bookmark from capture payload |

Architecture, modules, and trust boundaries: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [SECURITY.md](SECURITY.md) · [PRIVACY.md](PRIVACY.md)

### Where files live

| OS | App data (typical) |
| -- | ------------------ |
| Windows | `%APPDATA%\com.marknest.app\` → `marknest.db`, `settings.json` |
| macOS | `~/Library/Application Support/com.marknest.app/` |
| Linux | `~/.local/share/com.marknest.app/marknest.db` |

**Backup:** Settings → **Backup database**.

---

## What’s included

**Core (desktop only)**

- Bookmark CRUD, types (tweet, thread, article, video, other)
- Tags, folders, favorites, archive, unread/read
- Full-text search (SQLite FTS5)
- Highlights, JSON export, database backup
- System tray on desktop (close-to-tray keeps bridge alive on Windows — see [docs/SMOKE_DESKTOP.md](docs/SMOKE_DESKTOP.md))

**With extension (optional)**

- Save current page, selection, or X/Twitter posts from visible DOM
- Quick Save and keyboard shortcut
- Right-click “Save to MarkNest” / highlight capture

**Experimental** (best-effort; may break when sites change)

| Area | Expectation |
| ---- | ----------- |
| X/Twitter text extraction | Heuristic DOM capture — no official API; body text can be empty while URL/metadata save |
| Auto-save on X bookmark | Off by default in extension popup |
| Tweet/video embeds | May load `platform.twitter.com` when viewing; saved text remains local |

---

## What we are not building (yet)

- Cloud sync, teams, or accounts
- X/Twitter API or paid scraping
- JSON import (planned)
- Built-in AI summaries or vector search

Roadmap ideas: [CHANGELOG.md](CHANGELOG.md) · open a [feature request](issues/new?template=feature_request.yml).

---

## Tech stack

Tauri 2 · React · TypeScript · Vite · Tailwind / shadcn · Rust · SQLite (`rusqlite`) · Chrome extension (MV3)

---

## Troubleshooting

| Symptom | Try |
| ------- | --- |
| Extension: “MarkNest not running” | Start app or restore from tray; confirm bridge **Running** in Settings |
| Port `4763` in use | Tray → **Quit MarkNest**, then restart |
| Extension errors after update | Reload on `chrome://extensions` |

Full guide: [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## Contributing

Contributions are welcome — documentation, clear bug reports with repro steps, and focused PRs are especially helpful.

| | |
| --- | --- |
| [Contributing guide](CONTRIBUTING.md) | Setup, CI-equivalent checks, PR expectations |
| [Report a bug](issues/new?template=bug_report.yml) | Desktop, extension, or bridge |
| [Request a feature](issues/new?template=feature_request.yml) | Local-first scope |
| [Open a pull request](pulls) | Use the PR template |

**Good first issues:** improve [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) or [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), UI copy/empty states, capture regression write-ups with repro steps, docs/CI-only changes.

CI on `main`: `npm run build` + `cargo check` — [.github/workflows/ci.yml](.github/workflows/ci.yml).

**Before publishing this repo:** replace `REPLACE_WITH_ORG` in the clone URL above with your GitHub org or username.

---

## Documentation

| Doc | Description |
| --- | ----------- |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow |
| [SECURITY.md](SECURITY.md) | Bridge, extension permissions, reporting |
| [PRIVACY.md](PRIVACY.md) | Local data and optional network use |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components and data flow |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common fixes |
| [docs/RELEASE.md](docs/RELEASE.md) | Build artifacts and what not to commit |
| [docs/TRADEMARKS.md](docs/TRADEMARKS.md) | X, Twitter, Readwise, and other marks |
| [docs/SMOKE_CAPTURE.md](docs/SMOKE_CAPTURE.md) | Extension smoke checklist |
| [docs/SMOKE_DESKTOP.md](docs/SMOKE_DESKTOP.md) | Desktop / tray smoke checklist |
| [CHANGELOG.md](CHANGELOG.md) | Release notes |

---

## License

[MIT License](LICENSE) — Copyright (c) 2026 MarkNest contributors.
