# Index Design Guide

This document captures the design thinking behind the home page (`index.html`, `ambient-field.js`) and the rules to follow when changing it or building anything that sits beside it. Read it before touching layout, colour, or motion.

## 1. Core idea: a personal gallery

The page is a quiet gallery, not a product landing page. A visitor walks through a few rooms, and each room holds a small number of well-lit pieces.

- **Pieces, not widgets.** Every block (portrait, architecture diagram, project card, credential, contact panel) is a framed object on a calm wall. Frames are thin 1px lines on a slightly lifted surface.
- **Labels like a museum.** Monospace eyebrows (`01 / Selected work`, `Tech Lead · Aug – Nov 2025`) play the role of wall labels: small, uppercase, low contrast.
- **Typography carries the voice.** `Instrument Serif` is used only for large display moments (the name, the lead statement, the closing question). `TikTok Sans` handles reading text. Monospace handles metadata.
- **Restraint is the style.** One accent colour, generous space, and very few things happening at once. If something is not helping a visitor look at the work, remove it.
- **The background is atmosphere.** The contour field behind the page is part of the room, not a decoration on top of the content.

## 2. Wave: the thread through index and lab

The wave is the shared element that makes `index` and `lab` feel like one place.

- On **index** it is a quiet contour field (`ambient-field.js`): fine lines in a single hue that breathe slowly, lean slightly toward the pointer, and slow down as the visitor leaves the hero.
- On **lab** it is the same idea taken further: layered, light-aware waves behind frosted acrylic (`lab/wave-scene.js`).
- Both share the same character: **slow, fluid, low-contrast, never in competition with text.** The wave is something you notice after a moment, not something that announces itself.

Rules for the wave:

- Keep it in the page's accent hue, using light and dark values that follow the active theme and transition with it.
- Text is never drawn over, sampled by, or blurred against the wave in a way that hurts legibility. The vignette keeps the field soft behind content.
- Motion is time-based and eased (no sudden speed changes), pauses when the tab is hidden, and holds still under `prefers-reduced-motion`.
- Any new page that wants to feel part of the site should reuse the wave motif (contour lines, soft swell, slow phase), not invent a new background.
- Cost matters. Cap the pixel ratio, avoid per-frame allocations, and prefer fewer, cheaper strokes over more effects. See `docs/discovery/lab-wave-performance.md` for the lab-side lessons.

## 3. Visual system

| Area | Rule |
| --- | --- |
| Colour | Use the CSS variables (`--bg-color`, `--text-main`, `--text-secondary`, `--accent-color`, `--surface`, `--line`, `--tag-bg`, `--shadow`). Never hard-code colours in components. Every new colour needs a light and a dark value. |
| Surfaces | `--surface` for framed pieces, `--bg-color` for the wall. Borders are 1px `--line`. |
| Radius | Cards 6px, controls 3px, tags 2px. Do not introduce pill shapes or large radii. |
| Type scale | Serif for display only. Body text stays small and calm (`.76rem`–`.95rem`). Metadata in monospace, `.58rem`–`.72rem`. |
| Spacing | Sections breathe (`85px` vertical on desktop, `55px` on mobile). Do not tighten sections to fit more in. |
| Icons | Arrows are inline SVG (`.i-arrow`), never Unicode arrows such as ↗ ↔, which can turn into colour emoji on iOS. |
| Themes | Light and dark are equal citizens. Colour changes are driven by registered `@property` variables so they transition together. |

## 4. Motion principles

Motion on this page is **short arrivals and slow ambient cycles**. It should feel like light moving in a room, not like an interface performing.

1. **One easing language.** Use `--ease` (`cubic-bezier(.2,.65,.3,1)`), a soft deceleration. Durations come from `--t-fast` (.25s, small controls), roughly .3–.5s (hover on cards), and `--t-slow` (.9s, arrivals). Do not add new curves for one-off effects.
2. **Arrive, then rest.** Content fades up a short distance (about 28–32px) and stops. There is no bounce, overshoot, or looping on content.
3. **Sequence, don't scatter.** Items that appear together are staggered (hero lines about 90ms apart, grouped cards 90ms apart via `--d`). The order should follow reading order.
4. **Lines draw, then content settles.** Section rules draw in from the left (`scaleX`) as a section arrives. This is the page's signature gesture; reuse it for new sections.
5. **One hover language.** Cards and badges share the same response: border turns to the accent colour, a soft `--shadow` appears, and the card lifts about 3px (via the `translate` property so it does not fight the arrival `transform`). Links and arrows nudge a few pixels in the direction the arrow points.
6. **Ambient motion is slow and conditional.** Diagram signals and the wave run slowly, only while visible, and pause when the tab is hidden.
7. **Only animate cheap properties.** `opacity`, `transform`, `translate`, and registered colour variables. Never animate layout (`width`, `height`, `top`, `margin`).
8. **Content is visible by default.** Anything already in view on load is never hidden for an animation. Pending states apply only to off-screen elements.
9. **Always respect reduced motion.** The `prefers-reduced-motion` block removes transitions, animations, and hover movement. New motion must be covered by it.

## 5. Do

- Start from the gallery metaphor: one idea per frame, plenty of wall around it.
- Reuse existing tokens, classes, and patterns (`.project-card`, `.section-heading`, `.i-arrow`, arrival classes) before writing new ones.
- Add new off-screen blocks to the arrival target list in the page script so they join the same sequence and rule-drawing behaviour.
- Test every change in light, dark, desktop, and a ~375px mobile width.
- Check keyboard focus (`:focus-visible` outlines) and that `aria-hidden` is set on decorative arrows and diagrams.
- Keep the page working without JavaScript: content must remain visible and readable.
- Document significant motion or visual decisions in `docs/discovery/` or this folder.

## 6. Don't

- Don't add parallax, scroll-jacking, cursor trails, tilt cards, marquee text, or auto-playing carousels.
- Don't use gradients as fills on cards, glows on text, or heavy drop shadows. Shadows are soft and only appear on hover.
- Don't add a second accent colour or saturated colours outside the palette.
- Don't introduce bounce, spring overshoot, or looping animation on content (the lab uses a soft spring for liquid wave response only, not for page UI).
- Don't make the wave brighter, faster, or more detailed to "add life". If it draws attention away from the work, it is too much.
- Don't put important information only inside an animation or only on hover.
- Don't hard-code colours, durations, or easing curves in new components when a token exists.
- Don't ship a motion without a reduced-motion fallback.
- Don't publish `lab/` accidentally: it is excluded in `_config.yml` and its nav link is commented out in `index.html` until it is ready. Remove both together when publishing.

## 7. Checklist before merging a design change

- [ ] Does it still feel like a gallery: calm, framed, uncluttered?
- [ ] Are colours, easing, and durations taken from the existing tokens?
- [ ] Do light and dark both look right, including during the theme transition?
- [ ] Does it work at ~375px with no horizontal scroll?
- [ ] Is motion limited to `opacity` / `transform` / `translate`, and disabled by `prefers-reduced-motion`?
- [ ] Is anything already visible on load left visible?
- [ ] Is the wave still quiet, readable-behind, and consistent with `lab`?
- [ ] No console errors; keyboard focus still visible.

## 8. Where things live

| File | Role |
| --- | --- |
| `index.html` | Page markup, all CSS (tokens at the top, "Refinement layer" near the end), and page scripts (theme, nav, arrival, active section). |
| `ambient-field.js` | Contour-field wave behind the index page. |
| `lab/` | Experimental page (unpublished): wave scene, frosted acrylic, light study. |
| `docs/discovery/` | Notes on lab design and performance decisions. |
| `design/` | Design guidance (this folder). |
