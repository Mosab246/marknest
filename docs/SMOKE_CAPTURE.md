# MarkNest capture smoke tests

Run with MarkNest open (`npm run tauri dev` or production build).

## Database and app

1. Existing bookmarks load unchanged after upgrade
2. Existing SQLite data is not lost
3. App launches when port 4763 is busy (bridge off, no crash)
4. Manual create / edit bookmark still works
5. Search, favorite, archive, delete, export still work

## Capture bridge

6. `GET http://127.0.0.1:4763/api/health` returns `ok: true`
7. Settings shows bridge status (running / error)

## Chrome extension

8. Extension loads in developer mode
9. Popup shows active tab URL and title
10. Captured text and selected text previews populate
11. x.com/twitter.com status URL → source `x`, tweet ID extracted
12. POST capture succeeds; item appears in library
13. Captured text visible in right detail panel (Info tab)
14. MarkNest closed → extension shows “Open MarkNest, then try again.”
15. Saved captures readable offline in MarkNest

## X/Twitter quality (v1.3)

16. X status page: `capturedText` is main tweet only (no Home/Explore/Grok/nav)
17. No replies, Relevant people, Trending, or Terms in `capturedText`
18. List title is `Author on X` or `@handle on X`, not full tweet text
19. Detail panel shows tweet-style preview card first
20. Media image appears when `pbs.twimg.com` media found
21. Arabic/RTL tweet displays correctly (`dir="auto"`)
22. Saving same tweet twice updates existing item (no duplicate rows)
23. Extension shows "Already saved — updated existing item" on re-save
24. Tweet visible on page does not show "tweet text could not be extracted" (retry + fallbacks)
25. Arabic/emoji-only tweets extract without collapsing whitespace

## Reader detail panel (v1.4)

26. Right panel scrolls for long captured text; action header stays visible
27. Tweet Info tab: `TweetCapturePreview` first (author, linkified body, media, link card)
28. Article/web: `ArticleCapturePreview` with linkified `capturedText`
29. URLs in captured text, notes preview, and selected quote open in system browser
30. GitHub / external URLs from tweet body or `canonicalUrl` show link card with Open
31. `imageUrl` shows inline preview; click opens dialog; broken image shows fallback (no crash)
32. Arabic/RTL mixed text uses `dir="auto"` and does not overflow horizontally
33. `selectedText` appears as quoted block on tweets (when present)
34. Notes tab: save still works; link preview when notes contain URLs
35. Panel width resizable (360–520px) and persists in `localStorage`
36. Raw capture collapsible at bottom for tweets (not primary view)

## Video tweets (post-v7 fix)

57. Open a video tweet on X; wait until video is visible; save via popup
58. Metadata tab shows `Video URL` with `video.twimg.com` and `.mp4` (not `blob:`)
59. Detail panel shows inline video player (not “SEE WHAT’S HAPPENING” promo card)
60. Re-save same tweet updates `video_url` / `recaptured_at`, no duplicate row
61. If player fails in app, fallback shows Open video / Open original on X

## v1.5 Quick Save and capture quality

37. Extension popup: Quick Save toggle OFF → toolbar opens popup; ON → click saves without popup
38. Quick Save uses last tags/folder/status/favorite from popup prefs
39. Ctrl+Shift+M still saves when Quick Save off
40. Re-save same tweet → "Already saved — updated"; no duplicate row
41. Noisy legacy capture shows `CaptureQualityBanner` (noisy/partial/failed)
42. Re-capture CTA opens original URL in system browser
43. Tweet preview footer: Posted (if `postedAt`), Saved, Re-captured (if `recapturedAt`)
44. X native auto-bookmark toggle default OFF; when OFF, bookmark click does not auto-save
45. With auto-bookmark ON (experimental): X bookmark click may trigger silent save (DOM-dependent)

## v1.6 Highlights

46. Save with selected text → highlight row; duplicate text → no second row / "already exists" toast
47. Detail panel Highlights tab: list, add, edit note, delete
48. Delete bookmark removes its highlights (CASCADE)
49. Export JSON includes `highlights` array
50. Context menu "Save highlight to MarkNest" on selection

## v1.7 Search

51. Search finds text in notes, tags, highlight bodies
52. Scope chips: Tweets / Articles / Highlights / Notes filter results
53. Active search shows result count in library top bar
54. FTS still used (not LIKE-only regression)

## v1.8 Backup

55. Settings → Backup database writes copy to chosen path
56. Export JSON still works after backup

## Out of scope (do not test as requirements)

- X API integration
- Cloud sync / auth / AI
- JSON import
