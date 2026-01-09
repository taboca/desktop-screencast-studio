# Origin pivot options memo (2025-12-01)

**Situation** — Shift+click zoom/tilt should center the clicked point smoothly.

**Complication** — In v8, setting the transform-origin to the click can cause a brief jump when the pivot reinterprets the existing transform, especially on far-off clicks.

**Question** — How to avoid the initial jump while keeping the clicked point aligned?

**Answer / Options**
- **Option A (pivot transition in sync):** Move the transform-origin from center to target with its own short transition, while keeping the transform neutral during that slide; then apply the translate/scale/tilt after the pivot lands (or start both with matched timing). This keeps rotations anchored at the clicked point and removes the jump.
- **Option B (fixed center origin + translate-only):** Keep transform-origin fixed at center; compute translation from an untransformed layout to bring the clicked point to center, then apply zoom/tilt about the center. No pivot jump, simpler math. Tradeoff: tilt occurs around center, so the clicked point can arc slightly during rotation.

Implementation choice for v9: use Option B to test the simpler, no-jump path.

v9 behavior notes (Option B applied)
- Transform origin remains centered; no origin animation.
- On Shift+click, translation is computed from the neutral layout (transform temporarily set to `none`) so the clicked point aligns to viewport center.
- Zoom/tilt then apply around the center pivot; expect no initial pivot jump, but the clicked point will arc slightly during tilt (tradeoff accepted for this test).
