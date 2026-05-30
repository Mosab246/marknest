# MarkNest Chrome Extension

Save the current page, selected text, or tweets to your local MarkNest library.

## Requirements

- MarkNest desktop app must be **running** (capture bridge on `http://127.0.0.1:4763`)
- Chrome or Chromium-based browser

## Install (developer mode)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select this `extension` folder

## Usage

- **Toolbar icon** — open popup, review capture, click Save (default)
- **Quick Save** — enable in popup: toolbar click saves immediately with last tags/folder/status
- **Right-click** — “Save to MarkNest” (page) or “Save highlight to MarkNest” (selection)
- **Keyboard** — `Ctrl+Shift+M` (quick save current page)
- **Experimental** — optional X native bookmark auto-save (default OFF; X DOM changes often)

## Capture bridge

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Check MarkNest is running |
| `/api/capture` | POST | Save bookmark JSON |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| “Open MarkNest, then try again.” | Launch MarkNest (`npm run tauri dev` or installed app) |
| Port conflict | Free port 4763 or restart MarkNest; check Settings → bridge status |
| Permission errors | Reload extension; confirm host permissions in manifest |
| Empty tweet text | X DOM may change; URL and metadata still save |

## Smoke checks

1. Extension loads without errors in `chrome://extensions`
2. Popup shows active tab URL and source
3. Page text and selection appear in previews
4. Tweet URL detects source `x` and tweet ID
5. Save creates item visible in MarkNest library
6. Captured text shows in detail panel
7. With MarkNest closed, popup shows bridge error
8. Context menu save works on selection and full page

## Out of scope

- X/Twitter API
- Cloud sync or login
