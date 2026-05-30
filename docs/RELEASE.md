# Release process

MarkNest is in **early preview**. This document describes how maintainers and contributors produce verifiable builds—not a promise of store-ready installers on every platform.

## Pre-release checks

Run the same checks as [CI](../.github/workflows/ci.yml):

```bash
# From repository root
if [ -f package-lock.json ]; then npm ci; else npm install; fi
npm run build
cd src-tauri && cargo check
```

On Windows (PowerShell), use `npm ci` when `package-lock.json` exists, then `npm run build`, then `cd src-tauri; cargo check`.

Optional manual smoke tests:

- [SMOKE_DESKTOP.md](SMOKE_DESKTOP.md)
- [SMOKE_CAPTURE.md](SMOKE_CAPTURE.md)

## Frontend production build

```bash
npm run build
```

Output: `dist/` (bundled React app). Tauri consumes this via `frontendDist` in `src-tauri/tauri.conf.json`.

## Rust verification

```bash
cd src-tauri
cargo check
```

For stricter review before a tag:

```bash
cargo clippy
```

(Not required by CI today.)

## Desktop installer / binary

```bash
npm run tauri build
```

Requires full [Tauri prerequisites](https://tauri.app/start/prerequisites/) on the build machine.

### Windows artifacts

After a successful Windows build, installers and binaries are typically under:

```text
src-tauri/target/release/bundle/
```

Common outputs:

- `msi/` — MSI installer
- `nsis/` — NSIS installer (if configured)

Exact filenames depend on Tauri version and bundle settings in `tauri.conf.json`.

### macOS / Linux

Bundles appear under the same `src-tauri/target/release/bundle/` tree (`.app`, `.dmg`, `.deb`, `.AppImage`, etc., depending on targets and host OS).

Cross-compiling is possible but not documented here; build on the target OS when unsure.

## Icons

If `logo/marknestlogo.png` changed:

```bash
npm run icon
```

Requires Python and Pillow (`pip install pillow`). Regenerates `src-tauri/icons/`, `extension/icons/`, and `src/assets/marknest-logo.png`.

## Version alignment

Before tagging, align versions in:

- `package.json`
- `src-tauri/tauri.conf.json`
- `src-tauri/Cargo.toml`
- `extension/manifest.json`
- [CHANGELOG.md](../CHANGELOG.md)

## What not to commit

Never commit release artifacts or local environment data:

| Path / pattern | Reason |
| -------------- | ------ |
| `node_modules/` | Dependencies |
| `dist/` | Frontend build output |
| `src-tauri/target/` | Rust build artifacts and installers |
| `src-tauri/gen/` | Generated Tauri schemas |
| `*.db`, `marknest.db` | User library |
| `settings.json` (from app data) | User preferences |
| `.env`, secrets | Credentials |
| `marknest-err.txt`, debug logs | Local diagnostics |

See root [.gitignore](../.gitignore).

## Publishing a GitHub Release

1. Tag the commit (e.g. `v0.2.0`).
2. Push the tag after `main` is green on CI.
3. Attach platform installers from `src-tauri/target/release/bundle/` as release assets.
4. Copy notes from [CHANGELOG.md](../CHANGELOG.md).
5. Replace `PLACEHOLDER` / `REPLACE_WITH_ORG` URLs in docs if still present.

## Extension distribution

The Chrome extension in `extension/` is loaded **unpacked** for development. Store packaging (Chrome Web Store) is a separate process with permission review—not covered in this early preview.
