# Cockpit V7 no-scroll memo (2025-11-29)

Summary of changes
- Duplicated `src/content/cockpit-v6` into `src/content/cockpit-v7` to keep a clean v6 snapshot while iterating.
- Locked the viewport in `src/content/cockpit-v7/index.html` by setting `html, body` to `overflow: hidden` (with explicit 100% sizing) so the shift+click zoom/tilt no longer produces X/Y scrollbars during the 3D focus move.
- Updated in-page labels to "Cockpit V7 Panel" and pointed navigation links (`index.html`, `src/content/rec_sample/index.html`) to the v7 cockpit.

Behavior notes
- Shift+click still triggers the kinetic zoom/tilt and re-centers on the clicked point; excess content is clipped to the viewport instead of generating scrollbars.
- Control panel shortcuts remain the same (Shift+T to toggle the panel).

Quick check
1) Open `src/content/cockpit-v7/` in the browser.
2) Start a screen share, then Shift+click on the stage to zoom—verify no scrollbars appear.
3) Toggle the panel (Shift+T) to confirm layout stays pinned without scrolling.
