# MarkNest v2.0 — Windows desktop smoke checklist

Run after `npm run tauri dev` or a release build. Reload the extension at `chrome://extensions` after icon or manifest changes.

## Launch & branding

- [ ] App launches without errors
- [ ] Sidebar shows MarkNest logo (not generic bookmark icon)
- [ ] Window/taskbar icon uses project logo (not default Tauri)
- [ ] System tray shows MarkNest icon
- [ ] Installer/bundle icons match logo (release build only)

## System tray

- [ ] Close main window (X) hides to tray when **Close window to tray** is on (default)
- [ ] Tray left-click or **Open MarkNest** shows and focuses the window
- [ ] **Settings** in tray menu opens app on Settings view
- [ ] **Quit MarkNest** fully exits; bridge stops (extension shows offline)
- [ ] Bridge still answers `GET http://127.0.0.1:4763/api/health` while window is hidden

## Startup settings (`settings.json` in app data dir)

- [ ] **Start with Windows** persists after restart; Windows startup entry created when enabled
- [ ] **Start minimized to tray** hides window on cold start when enabled
- [ ] **Close window to tray** off allows normal quit on window close
- [ ] Settings toggles survive app restart

## Capture bridge (Settings)

- [ ] Status shows **Running** when app/tray process is alive
- [ ] Endpoint `http://127.0.0.1:4763` displayed
- [ ] **Last checked** updates every ~5s on Settings page
- [ ] Help text mentions tray / keep running

## Chrome extension

- [ ] Extension icons visible in `chrome://extensions` and toolbar
- [ ] Popup green banner: **Connected to MarkNest** when app running
- [ ] Popup red banner when app quit: tray hint message
- [ ] Quick Save ON/OFF and X auto-bookmark ON/OFF shown in popup
- [ ] Toolbar badge `!` when bridge offline (optional; clears when connected)
- [ ] Manual save from popup still works
- [ ] Quick Save off → toolbar opens popup (not instant save)

## Regression (v1.x features)

- [ ] Existing bookmarks load
- [ ] Search, favorites, archive, folders, tags
- [ ] Highlights panel in reader
- [ ] JSON export and database backup
- [ ] Quick Save when enabled
- [ ] Ctrl+Shift+M quick save
- [ ] X experimental auto-bookmark when enabled
- [ ] Capture while app hidden in tray

## Build commands

```bash
npm install
npm run build
cd src-tauri && cargo check
npm run tauri build
```

- [ ] `npm run build` passes
- [ ] `cargo check` passes in `src-tauri`
- [ ] `npm run tauri build` produces bundle under `src-tauri/target/release/bundle/` (note NSIS/SDK prerequisites on Windows)

## Icon pipeline

```bash
npm run icon
```

- [ ] Regenerates `src-tauri/icons/`, `extension/icons/`, `src/assets/marknest-logo.png`
