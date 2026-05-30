# Contributing to MarkNest

Thank you for your interest in MarkNest.

## Project status: early preview

MarkNest is in **early preview**. APIs, capture heuristics, and packaging may change between releases. The **core desktop app** is usable locally for manual bookmarks, search, and export. The **Chrome extension** is optional but central to browser capture—and parts of it (especially X/Twitter DOM capture) are **experimental** and may break when sites change.

Please set expectations accordingly in issues and pull requests.

## Before you start

- Read [README.md](README.md) for scope and setup.
- Read [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) if you touch bridge, DB, or extension flow.
- Read [SECURITY.md](SECURITY.md) and [PRIVACY.md](PRIVACY.md) for extension or bridge changes.
- Read [docs/TRADEMARKS.md](docs/TRADEMARKS.md) before using third-party names in user-facing copy.
- Do not commit secrets, local databases, personal paths, or build artifacts (see [docs/RELEASE.md](docs/RELEASE.md)).

## Development setup

### Requirements

- Node.js 18+
- Rust (stable) and [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS
- Google Chrome (for extension work)

### Install dependencies

```bash
npm install
```

If `package-lock.json` is present, prefer `npm ci` for reproducible installs (same as CI).

### Run the desktop app

```bash
npm run tauri dev
```

The UI is served on port `1420`. The capture bridge listens on `http://127.0.0.1:4763` while the app is running.

### Load the Chrome extension

1. Start MarkNest (bridge must be running).
2. Open `chrome://extensions` → enable **Developer mode**.
3. **Load unpacked** → select the [`extension/`](extension/) folder.

See [extension/README.md](extension/README.md) and [docs/SMOKE_CAPTURE.md](docs/SMOKE_CAPTURE.md).

## CI-equivalent checks (run before opening a PR)

GitHub Actions runs [.github/workflows/ci.yml](.github/workflows/ci.yml) on push and pull requests to `main` / `master`:

```bash
# Install (match CI)
if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Frontend
npm run build

# Rust
cargo check --manifest-path src-tauri/Cargo.toml
```

**PowerShell (Windows):**

```powershell
if (Test-Path package-lock.json) { npm ci } else { npm install }
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

CI does **not** run `npm run tauri build`, lint scripts, or tests that are not defined in `package.json`—those are optional local checks before a release (see [docs/RELEASE.md](docs/RELEASE.md)).

## Reporting issues

| Template | Use for |
| -------- | ------- |
| [Bug report](https://github.com/Mosab246/marknest/issues/new?template=bug_report.yml) | Broken behavior, regressions, build failures |
| [Feature request](https://github.com/Mosab246/marknest/issues/new?template=feature_request.yml) | Ideas that fit local-first scope |
| [All issues](https://github.com/Mosab246/marknest/issues) | Search before filing duplicates |

Roadmap context: [ROADMAP.md](ROADMAP.md).

Include OS, MarkNest version, extension version (if relevant), and numbered reproduction steps.

**Security vulnerabilities:** follow [SECURITY.md](SECURITY.md). Do not file public issues with exploit details.

**Support / how-to:** check [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) first.

## Pull requests

1. Fork the repository and branch from `main`.
2. Keep changes focused; avoid unrelated refactors.
3. Fill out [.github/PULL_REQUEST_TEMPLATE.md](.github/PULL_REQUEST_TEMPLATE.md).
4. Describe **what** changed and **why**.
5. List manual test steps (desktop, extension, or docs-only).
6. Confirm CI-equivalent commands pass locally.
7. Update [CHANGELOG.md](CHANGELOG.md) for user-visible changes when appropriate.

Reviewers may ask for smoke steps from [docs/SMOKE_DESKTOP.md](docs/SMOKE_DESKTOP.md) or [docs/SMOKE_CAPTURE.md](docs/SMOKE_CAPTURE.md) when behavior changes.

## Good first contribution ideas

- Documentation fixes and clarifications ([docs/](docs/))
- [TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) entries from real support questions
- Small UI copy improvements (accessibility, empty states)
- Extension capture edge cases with tests described in the issue (DOM changes on X are hard—repro steps matter)
- CI or template improvements that do not change app behavior

Larger features (JSON import, sync, AI) should be discussed in a feature request first.

## Code style

- Match existing patterns in Rust and TypeScript files.
- Prefer small, reviewable diffs.
- Label experimental capture behavior honestly in UI and docs.

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
