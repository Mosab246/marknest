# Release process

MarkNest is in **early preview**. This document explains how to build installers, publish a [GitHub Release](https://github.com/Mosab246/marknest/releases), and optionally package the Chrome extension.

## Pre-release checks

Match [CI](../.github/workflows/ci.yml):

```bash
npm ci
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

**PowerShell (Windows):**

```powershell
npm ci
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
```

Optional smoke tests: [SMOKE_DESKTOP.md](SMOKE_DESKTOP.md), [SMOKE_CAPTURE.md](SMOKE_CAPTURE.md).

Align versions in `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `extension/manifest.json`, and [CHANGELOG.md](../CHANGELOG.md).

---

## Frontend production build

```bash
npm run build
```

Output: `dist/` (consumed by Tauri as `frontendDist` in `src-tauri/tauri.conf.json`).

---

## Windows installer (`npm run tauri build`)

Build on a **Windows** machine with:

- [Rust](https://www.rust-lang.org/tools/install) (stable)
- [Node.js](https://nodejs.org/) 18+
- [Tauri prerequisites for Windows](https://tauri.app/start/prerequisites/) (WebView2, Visual Studio Build Tools, etc.)
- **NSIS** (for `.exe` installer) and/or Windows SDK for **MSI**, per your `tauri.conf.json` bundle targets

From the repository root:

```bash
npm ci
npm run build
npm run tauri build
```

First run can take a long time (Rust compile + bundling).

### Where Windows artifacts appear

After a successful build, look under:

```text
src-tauri/target/release/bundle/
```

Typical layout (exact names vary by Tauri version and config):

| Path (under `bundle/`) | Contents |
| ---------------------- | -------- |
| `nsis/` | NSIS installer `.exe` (common for Windows) |
| `msi/` | MSI installer (if enabled) |
| `release/` or nested folders | Portable `.exe` or support files |

Example pattern: `src-tauri/target/release/bundle/nsis/MarkNest_0.2.0_x64-setup.exe`.

Do **not** commit anything under `src-tauri/target/`.

---

## What to upload to GitHub Releases

1. Create a tag (e.g. `v0.2.0`) on `main` after CI is green.
2. Open https://github.com/Mosab246/marknest/releases → **Draft a new release**.
3. Choose the tag and title (e.g. `v0.2.0 — Early preview`).
4. Paste release notes from [CHANGELOG.md](../CHANGELOG.md).
5. Attach **release assets** (binaries built on each target OS):

| Asset | Source |
| ----- | ------ |
| Windows installer | `src-tauri/target/release/bundle/nsis/*.exe` and/or `msi/*.msi` |
| macOS (when built on Mac) | `.dmg` / `.app` under `bundle/` |
| Linux (when built on Linux) | `.deb`, `.AppImage`, etc. under `bundle/` |

6. Publish the release.

Until the [first release](https://github.com/Mosab246/marknest/releases) exists, users should [build from source](../README.md#quick-start).

---

## Chrome extension zip (optional)

The extension is normally loaded **unpacked** from the [`extension/`](../extension/) folder during development. For a release attachment:

**PowerShell (from repo root):**

```powershell
Compress-Archive -Path extension\* -DestinationPath marknest-extension-v0.2.0.zip -Force
```

**macOS / Linux:**

```bash
cd extension && zip -r ../marknest-extension-v0.2.0.zip . -x "*.DS_Store"
```

Upload `marknest-extension-v0.2.0.zip` to the GitHub Release with a short note:

1. Unzip to a folder.
2. `chrome://extensions` → Developer mode → **Load unpacked** → select that folder.
3. MarkNest desktop app must be running (bridge on `127.0.0.1:4763`).

Chrome Web Store distribution is a separate process (permission review) and is not covered here.

---

## macOS / Linux desktop bundles

Run `npm run tauri build` on the target OS (or a trusted CI runner for that platform). Artifacts also land under `src-tauri/target/release/bundle/`. Cross-compiling is possible but not documented in this early preview.

---

## Icons

If `logo/marknestlogo.png` changed:

```bash
npm run icon
```

Requires Python and Pillow (`pip install pillow`).

---

## What not to commit

| Path / pattern | Reason |
| -------------- | ------ |
| `node_modules/`, `dist/` | Dependencies and frontend build |
| `src-tauri/target/` | Rust output and installers |
| `src-tauri/gen/` | Generated Tauri schemas |
| `*.db`, `marknest.db`, user `settings.json` | User data |
| `.env`, secrets, `*.log`, `marknest-err.txt` | Sensitive or local-only |

See [.gitignore](../.gitignore).
