# Privacy

MarkNest is designed so **you keep your data**. This document describes what the app and extension do on your device.

## Summary

| Topic | Behavior |
| ----- | -------- |
| Account | None required |
| Cloud sync | None |
| Telemetry | None by default |
| Where data lives | Local SQLite DB on your computer |
| Extension → internet | Only to pages you browse; capture posts to `127.0.0.1` |

## Data stored locally

MarkNest stores your library in a SQLite file (`marknest.db`) and app preferences in `settings.json`, both under the Tauri app data directory for your OS (see [README.md](README.md)).

Stored items may include URLs, titles, captured text, tags, folders, highlights, and related metadata you save or capture.

You can **export** bookmarks to JSON and **backup** the database from Settings. You are responsible for copies you make.

## What the Chrome extension reads

The extension reads content from web pages **only** to build a capture payload (title, visible text, selection, tweet/article hints, etc.) and send it to the local MarkNest bridge. It does not upload your library to a MarkNest server.

Because capture works on many sites, the extension uses broad host permissions and content scripts on `http://` and `https://` pages. It runs when you use MarkNest actions (popup save, context menu, keyboard shortcut, or optional experimental X bookmark hook)—not as a background data harvester for unrelated sites.

## Local bridge

Captured data is sent via `POST http://127.0.0.1:4763/api/capture` to the desktop app on your machine. It is not sent to MarkNest-operated cloud infrastructure.

## Optional network use in the desktop app

Some features may load **external** content when you view an item, for example:

- Opening a link in your system browser
- Embedded X/Twitter tweet players (`platform.twitter.com`) for video/tweet previews

Saved text and metadata remain local; embeds follow the third party’s policies when loaded.

## No telemetry by default

This repository does not include analytics SDKs or crash reporting to MarkNest servers. Build and run the app from source to verify behavior for your release.

## Your controls

- Quit MarkNest from the tray to stop the capture bridge.
- Uninstall or remove the extension in `chrome://extensions`.
- Delete or backup your database from Settings.
- Export JSON for portability.

## Questions

For security-sensitive reports, see [SECURITY.md](SECURITY.md). For development questions, see [CONTRIBUTING.md](CONTRIBUTING.md).
