# Security Policy

MarkNest is a **local-first** desktop application. Your library lives on your machine; there is no MarkNest cloud account or hosted backend.

**Repository:** https://github.com/Mosab246/marknest

## Supported versions

| Version | Supported |
| ------- | --------- |
| 0.2.x   | Yes (early preview) |

## Local capture bridge

While MarkNest is running, a small HTTP server accepts capture requests from the Chrome extension:

- **Bind address:** `127.0.0.1` only (not `0.0.0.0` / not exposed to your LAN by default)
- **Default port:** `4763`
- **Endpoints:** `GET /api/health`, `POST /api/capture`

Any process on your computer can talk to localhost. Treat your machine as the trust boundary. Do not forward port 4763 through a tunnel or proxy unless you understand the risk.

## Chrome extension

The extension needs broad permissions to save pages you visit:

| Permission | Why |
| ---------- | --- |
| `activeTab`, `tabs`, `scripting` | Read the current tab and inject capture logic |
| `contextMenus` | “Save to MarkNest” / highlight actions |
| `storage` | Quick Save preferences |
| `notifications` | Optional save confirmation toasts |
| `host_permissions` for `http://127.0.0.1:4763/*` | Talk to the local bridge |
| `host_permissions` for `https://x.com/*`, `https://twitter.com/*` | X/Twitter capture |
| `host_permissions` for `http://*/*`, `https://*/*` | Capture arbitrary sites you choose to save |

The extension sends captured metadata and text **only** to your local bridge. It does not send your library to MarkNest servers (there are none).

Content scripts run on pages matching `http://*/*` and `https://*/*` so capture can run where you browse. See [PRIVACY.md](PRIVACY.md) for what is read and stored.

## Desktop app

- **SQLite** database and **settings** are stored under the Tauri app data directory on your OS (see [README.md](README.md)).
- **No telemetry** is built into MarkNest by default.
- **Autostart** and **open external URL** use normal OS APIs; review those features in Settings if you use them.

## Reporting a vulnerability

If you believe you have found a security issue in MarkNest:

1. **Do not** open a public GitHub issue with exploit details or proof-of-concept steps that could harm users.
2. **Preferred:** [Open a private security advisory](https://github.com/Mosab246/marknest/security/advisories/new) on GitHub (Security → Advisories → Report a vulnerability).
3. **Alternative:** Use [GitHub Security](https://github.com/Mosab246/marknest/security) to find the advisory reporting flow for this repository.

<!-- TODO: Add a dedicated security@ email here if the project adopts one later. -->

For **non-sensitive** security questions (e.g. how the bridge binds, extension permissions), you may open a normal [issue](https://github.com/Mosab246/marknest/issues) with the **question** intent or ask in discussions if enabled—still avoid posting exploit details publicly.

Include in private reports:

- A clear description and impact
- Steps to reproduce
- Version / commit hash if known
- Your environment (OS, MarkNest version, extension version)

We will acknowledge reports as soon as we can and work on a fix for supported versions.

## Out of scope

- Weaknesses in third-party sites (e.g. X/Twitter DOM changes breaking capture)
- Issues that require physical access to an unlocked machine with MarkNest already running
- Social engineering or malware unrelated to this repository
