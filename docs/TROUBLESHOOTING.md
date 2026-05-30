# Troubleshooting

MarkNest is in **early preview**. Behavior can vary by OS, browser version, and changes to third-party sites (especially X/Twitter).

## Extension says MarkNest is offline

The extension talks to `http://127.0.0.1:4763`. That only works when the **desktop app is running** and the capture bridge is up.

1. Start MarkNest: `npm run tauri dev` or your installed build.
2. Open **Settings** → confirm bridge status is **Running**.
3. If you closed the window but need capture, use the tray to restore the app—do not **Quit** from the tray unless you intend to stop the bridge.
4. In the extension popup, wait a few seconds and try again.

Verify manually:

```bash
curl http://127.0.0.1:4763/api/health
```

Expected: JSON with `"ok": true` and `"port": 4763`.

## Bridge port 4763 in use

Another process may be bound to port 4763, or a zombie MarkNest instance is running.

1. Quit MarkNest from the system tray (**Quit MarkNest**).
2. End any leftover `marknest` process in Task Manager (Windows) or Activity Monitor (macOS).
3. Restart the app and check Settings → bridge status.

## Where is my data?

| OS | Typical location |
| -- | ---------------- |
| Windows | `%APPDATA%\com.marknest.app\marknest.db` and `settings.json` |
| macOS | `~/Library/Application Support/com.marknest.app/` |
| Linux | `~/.local/share/com.marknest.app/marknest.db` |

Use **Settings → Backup database** before risky experiments.

## Tray and startup (desktop)

- **Close window to tray** (default): closing the main window hides it; the bridge keeps running.
- **Quit MarkNest** from the tray stops the app and the bridge—the extension will show offline.
- **Start with Windows** / **Start minimized**: enable in Settings; Windows 11 may require approval under **Settings → Apps → Startup**.

Tray behavior is most tested on **Windows**; other platforms may differ.

## Extension reload

After pulling code changes or manifest updates:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Reload** on MarkNest Capture
4. Restart MarkNest if bridge code changed

Permission errors often clear after reload. Confirm host permission for `http://127.0.0.1:4763/*`.

## Empty or partial tweet / article text

X and other sites change their DOM often. MarkNest uses **heuristic extraction** from visible page content—no official X API.

- URL, title, and metadata often still save.
- Try manual edit in the app after save.
- Experimental **auto-save on X bookmark** is off by default; see extension popup.

## Build issues

### `npm run build` fails

- Use Node.js 18+.
- Delete `node_modules` and run `npm ci` (or `npm install` if no lockfile).
- On Windows, run the terminal as a normal user with write access to the project folder.

### `cargo check` fails

- Install [Rust](https://www.rust-lang.org/tools/install) stable.
- Install [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS.
- From `src-tauri`: `cargo check`

### `npm run tauri build` fails (Windows)

- Install WebView2 (usually present on Windows 11).
- For installers: Windows SDK and NSIS per Tauri docs.
- First build downloads many crates; allow time and disk space.

See [RELEASE.md](RELEASE.md) for release build steps.

## Still stuck?

1. Check [ARCHITECTURE.md](ARCHITECTURE.md) for how components connect.
2. Search [GitHub issues](https://github.com/Mosab246/marknest/issues) or open a [bug report](https://github.com/Mosab246/marknest/issues/new?template=bug_report.yml) with versions, OS, and reproduction steps.
3. Security issues: [GitHub Security Advisories](https://github.com/Mosab246/marknest/security)—not a public issue with exploit details.
