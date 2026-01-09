# Visual effect zoom/pan/3d memo (2025-12-01)

**Situation** — We have a shift+click kinetic zoom/tilt that is supposed to pull the clicked point of the stage to the viewport center with scale + 3D rotation while keeping the screen share canvas inside the viewport.

**Complication** — The animation looks good overall, but the clicked point is not landing in the exact center of the viewport after the move, and on clicks near the right side the frame appears to drift outward before settling (a “bounce”).

**Question** — Why does the target point fail to finish centered, and what is causing the outward bounce when starting the zoom?

**Answer (analysis)** — Two math/animation factors inside `src/content/cockpit-v7/index.html` explain the behavior:
- **Bounding-rect math on a rotated element:** `updateFocusTranslation()` (around the frameKinetics block) temporarily applies the zoom+tilt transform (no translation) to `scaleWrapper`, then uses `flipContainer.getBoundingClientRect()` to compute the target point. Because the element is already scaled and rotated (`translate3d(... ) scale(...) rotateX(...) rotateY(...)`), the bounding box is inflated/skewed relative to the element’s internal 0–1 coordinates. Using `rect.left + rect.width * targetOrigin.x` on that rotated box does not land on the true projected point, so the computed translation is off — the farther from center (and the more tilt), the larger the miss.
- **Transitioning transform-origin with the transform:** The CSS transitions `transform 0.6s ease` and `transform-origin 0.25s ease` run together. `applyScaleTransform()` sets the new origin and transform based on a translation that assumes the origin is already at the clicked point. While the origin animates from center to the clicked point, the rotation/scale pivot moves, so the frame initially swings the “wrong” way (the outward drift you see) before the origin finishes moving and the translation finishes easing.

Notes and implications
- The center reference used in the math is the `screenWrapper` viewport (`wrapperRect`), so the centering target is the true viewport center; the panel is ignored by design because panel clicks are filtered.
- The random tilt (`randomTilt()`) is included in the pre-measurement transform, so larger random tilts magnify the bounding-box distortion and thus the centering error.

Directions to fix (not yet implemented)
- Compute the target point before the rotate/scale are applied (e.g., measure the untransformed element or use `DOMMatrixReadOnly`/`getScreenCTM`-style math to transform a logical point into viewport coordinates), then derive translation from that real point. Avoid using the rotated bounding box directly.
- Either remove the `transform-origin` transition during the zoom, or compute translation after the origin change is locked in, so the pivot does not move while the transform is animating.

Proposed sequence (translate-first, then zoom/tilt, with a fixed origin)
- **Step 1: set origin to the clicked point immediately** (no animation on `transform-origin`). This establishes the pivot at the target before we move.
- **Step 2: compute translation in the unrotated/unscaled frame** so that the clicked point maps to the viewport center. Do this by measuring the element without extra transform or by mapping the logical point through a `DOMMatrix`.
- **Step 3: apply a single transform chain** with translation first, then scale, then rotate (e.g., `translate3d(tx, ty, 0) scale(s) rotateX(...) rotateY(...)`). Because translate happens first, scale/tilt won’t alter the centering math.
- This ordering removes the outward drift (no pivot slide mid-flight) and the centering error (translation computed without the rotated bounding box). Once stable, we can consider re-adding a mild origin transition separately if a stylistic pivot shift is desired.

Implementation in cockpit-v8 (done)
- Forked v7 into `src/content/cockpit-v8/`.
- Removed the `transform-origin` transition on `#scaleWrapper`; now only the transform eases.
- In `frameKinetics.updateFocusTranslation()`, the transform origin is set immediately to the clicked point, the transform is neutralized (`none`) for measurement, and translation is derived from the unrotated/unscaled layout to center that point. The transform is then reapplied with the usual `translate3d(...) scale(...) rotateX/Y(...)` chain.
- Expected result: the clicked point pins to the viewport center without the initial outward bounce; the rotation/scale still play, but pivot remains fixed at the target.
