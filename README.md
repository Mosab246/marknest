# MarkNest

**Local-first bookmark knowledge manager** — save, organize, search, and annotate links, posts, articles, and web resources on your own machine.

> **Early preview** — APIs, capture behavior, and installers may change. Not production-ready; back up `marknest.db` before upgrades.

**Repository:** https://github.com/Mosab246/marknest

MarkNest is a desktop app (Tauri + React) with an **optional** Chrome extension for save-from-browser capture. Use the app alone for manual bookmarks, tags, folders, full-text search, highlights, and JSON export — no account, no cloud sync, no X/Twitter API.

---

## Installation

| Method | Status |
| ------ | ------ |
| **GitHub Releases** | [Releases](https://github.com/Mosab246/marknest/releases) — installers will be published here when available |
| **Build from source** | **Supported today** — follow [Quick start](#quick-start) below |

**Until the first release is published, build locally from source** (or run `npm run tauri dev` for development). See [docs/RELEASE.md](docs/RELEASE.md) for producing a Windows installer with `npm run tauri build`.

---

## Highlights

| | |
| --- | --- |
| **Your data stays local** | SQLite library on disk — you choose backup/export paths |
| **No login or cloud** | No MarkNest servers; capture bridge listens on `127.0.0.1` only |
| **Reader-style UI** | Three-panel layout (sidebar · list · detail) — [trademark notes](docs/TRADEMARKS.md) |
| **Optional extension** | Save pages, selections, and X posts while browsing — desktop app must be running |
| **Search & organize** | FTS5 search, tags, folders, favorites, archive, unread/read status |
| **MIT licensed** | [LICENSE](LICENSE) |

---

## Roadmap

Current scope, near-term plans, experimental features, and out-of-scope items: **[ROADMAP.md](ROADMAP.md)**.

---

## Quick start

### Requirements

- [Node.js](https://nodejs.org/) 18+
- [Rust](https://www.rust-lang.org/tools/install) and [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS
- Google Chrome — only if you use the extension

### Run from source

```bash
git clone https://github.com/Mosab246/marknest.git
cd marknest
npm install
npm run tauri dev
```

The library UI opens on port `1420`. While the app runs (including minimized to the system tray), the **capture bridge** is available at `http://127.0.0.1:4763`.

### Optional: load the Chrome extension

1. Keep MarkNest running (Settings → bridge **Running**).
2. Open `chrome://extensions` → **Developer mode** → **Load unpacked**.
3. Select the [`extension/`](extension/) folder.

Details: [extension/README.md](extension/README.md).

### Verify a change (same as CI)

```bash
npm ci
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

### Windows installer (maintainers)

```bash
npm run tauri build
```

Artifacts: `src-tauri/target/release/bundle/` — see [docs/RELEASE.md](docs/RELEASE.md).

---

## How it works

```text
Browser (extension) ──POST /api/capture──► 127.0.0.1:4763 (bridge) ──► SQLite ──► MarkNest UI
                     optional              loopback only
```

| Endpoint | Method | Purpose |
| -------- | ------ | ------- |
| `/api/health` | GET | Bridge up when app is running |
| `/api/capture` | POST | Create/update bookmark from capture payload |

[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) · [SECURITY.md](SECURITY.md) · [PRIVACY.md](PRIVACY.md)

### Where files live

| OS | App data (typical) |
| -- | ------------------ |
| Windows | `%APPDATA%\com.marknest.app\` → `marknest.db`, `settings.json` |
| macOS | `~/Library/Application Support/com.marknest.app/` |
| Linux | `~/.local/share/com.marknest.app/marknest.db` |

**Backup:** Settings → **Backup database**.

---

## What’s included

**Core (desktop only)** — bookmarks, FTS search, tags, folders, highlights, export, backup, system tray ([smoke checklist](docs/SMOKE_DESKTOP.md)).

**With extension (optional)** — page/selection/X capture via local bridge ([smoke checklist](docs/SMOKE_CAPTURE.md)).

**Experimental** — X DOM capture, auto-save on X bookmark (off by default), tweet embeds; see [ROADMAP.md](ROADMAP.md#experimental-features).

---

## Troubleshooting

| Symptom | Try |
| ------- | --- |
| Extension: “MarkNest not running” | Start app or restore from tray; bridge **Running** in Settings |
| Port `4763` in use | Tray → **Quit MarkNest**, then restart |
| Extension errors after update | Reload on `chrome://extensions` |

[docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md)

---

## Contributing

| | |
| --- | --- |
| [Contributing guide](CONTRIBUTING.md) | Setup, CI checks, PR expectations |
| [Report a bug](https://github.com/Mosab246/marknest/issues/new?template=bug_report.yml) | Desktop, extension, or bridge |
| [Request a feature](https://github.com/Mosab246/marknest/issues/new?template=feature_request.yml) | Local-first scope |
| [Issues](https://github.com/Mosab246/marknest/issues) | All open threads |
| [Pull requests](https://github.com/Mosab246/marknest/pulls) | Use the PR template |
| [Security](https://github.com/Mosab246/marknest/security) | Private advisories for vulnerabilities |

CI on `main`: `npm run build` + `cargo check` — [.github/workflows/ci.yml](.github/workflows/ci.yml).

---

## Documentation

| Doc | Description |
| --- | ----------- |
| [ROADMAP.md](ROADMAP.md) | Scope, roadmap, experimental, out of scope |
| [CHANGELOG.md](CHANGELOG.md) | Release notes |
| [CONTRIBUTING.md](CONTRIBUTING.md) | Development workflow |
| [SECURITY.md](SECURITY.md) | Bridge, extension, reporting |
| [PRIVACY.md](PRIVACY.md) | Local data and optional network use |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Components and data flow |
| [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) | Common fixes |
| [docs/RELEASE.md](docs/RELEASE.md) | Builds and GitHub Releases |
| [docs/TRADEMARKS.md](docs/TRADEMARKS.md) | Third-party marks |

---

## License

[MIT License](LICENSE) — Copyright (c) 2026 MarkNest contributors.
