# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- GitHub issue/PR templates, CI workflow (`npm run build`, `cargo check`).
- Docs: ARCHITECTURE, TROUBLESHOOTING, RELEASE, TRADEMARKS.

## [0.2.0] - 2026-05-30

### Added

- Initial public preview of MarkNest as open source.
- Local-first desktop app (Tauri 2 + React) for saving and organizing links, posts, articles, and web resources.
- Chrome extension (MV3) with local capture bridge on `127.0.0.1:4763`.
- SQLite storage with FTS search, tags, folders, favorites, archive, highlights, JSON export, and database backup.
- System tray behavior on desktop (close-to-tray, startup options on supported platforms).

### Notes

- Early preview: X/Twitter DOM capture and experimental auto-bookmark features are best-effort and may break when sites change.
- JSON import and cloud sync are not included in this release.

[Unreleased]: https://github.com/PLACEHOLDER/marknest/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/PLACEHOLDER/marknest/releases/tag/v0.2.0
