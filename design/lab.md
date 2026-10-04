# Lab Design Guide

This document captures the design thinking behind the lab (`lab/`) and the rules for extending it. It is the counterpart to [index.md](index.md): the index page is a calm gallery, the lab is a workshop with the lights on. Read both, because the two pages share one thread, the wave.

> **Status.** The lab is unpublished. `lab` is listed in `_config.yml` `exclude` and its nav link is commented out in `index.html`. Current copy is placeholder text. The page exists to validate design direction and to grow a set of reusable components.

## 1. Core idea: a personal lab

The lab is where personal engineering and hobby work will live: homelab builds, tooling, experiments, notes on what worked and what did not. The current content (frosted acrylic wave, optical studies, contour field) is a stand-in that proves the visual language.

- **A workbench, not a brochure.** The index page presents finished work in frames. The lab presents work in progress, with specimen labels (`FIG. 001`, `PLATE 01`, `MATERIAL STUDY / 001`), status markers (`Ongoing`, `In use`), and field notes.
- **Light and material carry the design.** Quality comes from how things are lit: transmission through frosted acrylic, edge highlights, soft shadows between layers, a warm daylight palette and a cool moonlight palette. Flat blocks and generic cards are the exception, not the default.
- **Not bound by conventional graphic design.** Grid regularity, uniform spacing and a minimal palette are tools, not rules. It is fine for the hero to be a full-bleed light study, for a component to break the layout, or for an object to be the layout.
- **Technique is allowed to be expensive, within reason.** The lab may use canvas rendering, backdrop blur, layered gradients, View Transitions and scroll-driven animation where they make the material convincing. It should not be held back by "what is cheapest" as the first question. It must still be usable (see section 6).
- **Honest approximation.** Materials are artistic approximations (CSS gradients, SVG, 2D canvas), not physical simulations. Do not claim or chase physical accuracy; chase the feeling of a lit object.
- **Personal, a little less polished.** Copy is first person and plain. The lab can say "just because".

## 2. Wave: the thread through index and lab

The wave links the two pages and is the lab's signature.

- On **index** it is a quiet contour field (`ambient-field.js`): single hue, slow, low contrast.
- On **lab** it is the full expression (`lab/wave-scene.js`): three layers of frosted acrylic lit by daylight or moonlight, with transmission, bevels, edge highlights, layer shadows, and a liquid pointer response.
- `FIG. 002 / Ambient field` in the lab explicitly credits the index contour field as part of the same family. Keep that relationship visible.

Rules for the wave:

- **Same family, different intensity.** Anything that is a wave on the index must be recognisable as a quieter version of the lab wave, and vice versa: long horizontal swells, slow phase, one hue per theme.
- **Light is the subject.** Daylight (warm ivory `#f2eee5`, warm white key light) and moonlight (deep navy `#081326`, cool silver-blue key light) are the two states. The theme toggle switches between them; do not add time-of-day logic or a sun/moon icon in the artwork.
- **Layers are independent.** Each layer has its own phase, frequency, speed and breathing; deeper layers are heavier and slower. Layers may overlap naturally; hide overlaps with acrylic transmission, never by constraining the geometry.
- **Liquid, not springy UI.** Pointer response uses damped springs per layer (one soft overshoot, no ringing). This liquid response belongs to the wave only; ordinary UI uses the settle curve.
- **Text is never sampled or blurred by the wave.** All wave and light layers share the canvas; page text stays above it and crisp. Keep the hero title and caption away from the brightest highlights.
- **Always have a still.** Posters (`lab/assets/wave-poster-light.webp`, `-dark.webp`) are the fallback for reduced motion, no JavaScript, failed WebGL/canvas setup and first paint. Regenerate them whenever the painter changes noticeably.

## 3. Visual system

| Area | Rule |
| --- | --- |
| Palette | Light: `--bg #f2eee5`, `--ink #202320`, `--accent #316665`. Dark: `--bg #081326`, `--ink #e1eaf4`, `--accent #a6bdd8`. Tokens are registered with `@property` so theme changes interpolate. |
| Components | Read host tokens (`--bg --ink --muted --line --accent --sans --serif --mono`) with their own defaults, so a component works in any page. |
| Type | Serif italic (`<em>`) for the emotional half of a title ("Made out of *curiosity.*"). Sans for reading. Small uppercase mono labels (9–10px) for specimen metadata. |
| Labels | Number everything: `FIG.`, `PLATE`, `001 /`, `I. II. III.`. It reinforces the lab-notebook feel. |
| Surfaces | Frosted panels use translucent fills with small backdrop blur (3–5px), fine edge lines, and a moving reflection under the pointer (`[data-surface]`). |
| Light | Prefer driving highlights and shadows from a light-direction variable (`--study-light`, `--study-key`, `--study-angle`) so objects respond together. |
| Icons and glyphs | Same rule as the index guide ([index.md](index.md)): no Unicode arrows or symbol glyphs (`→ ↓ ↑ ↗ ↺ ＋ ↳ ◐ ▷ Ⅱ`) as icons or in labels, including text set from JavaScript (`lab.js` swaps pause/play as SVG). Use inline SVG `.i-arrow` (16×16 viewBox, 1.5px stroke, `currentColor`, `.86em`; `.i-fill` for solid shapes). `light-study.css` carries its own copy of the rule so the component stays portable. All lab markup follows this today; keep it that way. |
| Themes | Light (day) and dark (moon) are both first-class. Check every new object in both. |

## 4. Motion principles

The lab is allowed more motion than the index, but it follows a clear vocabulary.

1. **Two curves.** `--ease-settle` (`cubic-bezier(.16,1,.3,1)`, long deceleration) for all arrivals and transitions; `--ease-soft` (slight overshoot) only for small controls. Do not add more.
2. **Opening choreography.** Title lines rise in sequence, then eyebrow, aside, caption, featured card and footer fade in. Gated by the `intro` class, which is only added when reduced motion is off, so the no-JS page renders at rest.
3. **Arrivals.** `data-arrival` elements rise about 22px over about 1.1s; siblings stagger by 80ms (capped). Anything already visible on load is never hidden.
4. **Scroll.** Hero copy drifts up and fades via CSS scroll-driven animation (compositor only, no JS; unsupported browsers stay still). Layers below the hero translate only, they do not fade, so frosted glass keeps working.
5. **Theme change is an event.** A circular View Transition opens from the toggle button. The wave jumps to the new palette while the reveal acts as the transition, and is paused during it. Falls back to a colour cross-fade.
6. **Pointer responses are local.** Only the surface under the pointer lights up; the featured file lifts slightly. Nothing animates on its own except designed ambient loops.
7. **Ambient loops run only while visible.** Experiment thumbnails (`.in-view`), the optical study float (11s, about 6px) and the wave pause when off-screen or when the tab is hidden.
8. **The visitor can stop it.** A visible Pause motion control sets `.motion-paused` on `<html>`, which every ambient effect must honour, alongside `prefers-reduced-motion`.
9. **Interaction beats ambience.** Dragging the light, choosing a specimen and pointer tilt are always available, even when ambient motion is paused or reduced.

## 5. Reusable components

The lab is also a component testbed. Components should be copyable into another page with their CSS and JS, needing only the host tokens above.

### Light study (`light-study.css` / `light-study.js`)

A display case with swappable specimens (Lens, Layers, Prism), a light-angle slider, and an editorial index. Full contract in [docs/discovery/lab-light-study-pattern.md](../docs/discovery/lab-light-study-pattern.md). Key points:

- All copy lives in HTML; JS contains no text. Specimens are `data-study-art="key"` containers matched to `data-study-choice="key"` buttons.
- Layout follows the block's own width via container queries, not the viewport.
- Initialise with `enhanceLightStudies(root)` or `createLightStudy(section)`; dispose with `instance.dispose()`.
- Light is shared through CSS variables; new specimens should use them so they react to the slider and dragging.
- Without JavaScript, the first specimen shows statically and unusable controls stay hidden.

### Wave scene (`wave-scene.js`)

`createAcrylicPainter(canvas)` is the painter (also used to export posters at a fixed phase); `createWaveScene(canvas, stage, options)` adds the loop, pointer, theme and lifecycle. It exposes `setTheme`, `setPaused`, `dispose`, and an `onFallback` hook.

### Surface (`[data-surface]`)

Any card can opt in to the pointer reflection by adding the attribute. The behaviour is in `lab.js`, the look in `lab.css`.

### Arrival (`data-arrival`)

Opt-in reveal with automatic sibling stagger.

When adding a component: define its own tokens with fallbacks to host tokens, keep text in HTML, make it independent of the wave canvas, give it a dispose path, and add it to a check script.

## 6. Performance, legibility, and accessibility: relaxed, not abandoned

The lab may spend more than the index (canvas blur layers, backdrop filters, large gradients). It must still hold a line:

- **Reading text stays readable.** Body copy and labels must keep sufficient contrast against whatever light is behind them. Prefer moving the highlight to moving the text.
- **Idle cost is capped.** Ambient wave frames are limited (about 30fps when idle, 60fps while interacting), pixel ratio is limited, expensive layers are rendered at half resolution and upscaled, background layers are cached, and everything stops off-screen or in a hidden tab. A new effect should say what it costs and when it stops.
- **Degrade, don't break.** Static posters, no-JS rendering, reduced motion, failed canvas, and coarse pointers each need a working state.
- **Mobile is real.** Layouts hold from 320px to desktop with no horizontal overflow; wave work reduces on mobile.
- **Keyboard and screen readers.** Visible focus outlines, native controls where possible (range input), `aria-hidden` on decorative scenes, correct tab semantics for specimen choosers.
- **Measure on a real device before adding load.** Software-rendered headless runs only show ratios. Use `scripts/bench-wave.cjs` and `powermetrics` (see [docs/discovery/lab-wave-performance.md](../docs/discovery/lab-wave-performance.md)).

## 7. Do

- Make the light the point: start a new piece by deciding where the light comes from and what material it passes through.
- Try the ambitious version first, then pull back only what harms reading or battery.
- Label, number and date things like lab notes. Write what was learned, not only what was made.
- Reuse the tokens, the two easing curves, `data-surface`, `data-arrival` and the light-study variables.
- Provide a still, no-JS and reduced-motion state for every effect.
- Keep components independent of the page: host tokens in, no hard-coded copy in JS.
- Before merging, check that no Unicode arrow or symbol glyph slipped in: `grep -nP "[↑↓←→↗↘↔↵↺↳›＋◐▷Ⅱ]" lab/index.html lab/*.js`.
- Test in light and dark, at 320 / 480 / 1100 / 1440px, with pause on and off.
- Run `node scripts/check-lab.cjs` and `node scripts/check-light-study.cjs` against `python3 server.py` before merging lab work.
- Write up significant decisions and measurements in `docs/discovery/`.

## 8. Don't

- Don't make it a standard card grid with a gradient background. If a section could be on any template site, rework it.
- Don't fake physics claims, and don't add real 3D or WebGL for its own sake. The Three.js version is archived (`archive/lab-v1-threejs/`) for a reason.
- Don't put reading text over a hot highlight, or blur text with the wave.
- Don't let a decorative loop run off-screen, in a background tab, or after the visitor pressed Pause.
- Don't add a second easing system, a bouncy spring on ordinary UI, or confetti-like particle effects.
- Don't rely on hover or on motion to convey information.
- Don't hard-code palette values or copy inside a reusable component.
- Don't use Unicode arrows or symbol glyphs as icons (`→ ↓ ↑ ↺ ＋ ◐ ▷ Ⅱ`); iOS may render them as emoji or in a fallback font. Use `.i-arrow` SVG, in HTML and in JS-set text.
- Don't ship an effect without a poster or static fallback.
- Don't publish the lab by accident. To publish, remove `lab` from `_config.yml` `exclude` and restore the nav link in `index.html` together, after replacing placeholder copy.

## 9. Content direction (planned)

Future entries are personal engineering and hobby write-ups, for example homelab builds, networking and storage, self-hosting, automation, small tools. Suggested entry shape, reusing existing patterns:

- A specimen or figure (diagram, photo, rack render, or a lit study object) with `FIG.` number and status.
- A short plain-language summary, tags, and links (repo, source download).
- Field notes: what was tried, what broke, what was measured, what is next.

Placeholder copy ("Liquid archive", "Threads of curiosity", "From the workbench") will be replaced; keep the structure and numbering so the design survives the content change.

## 10. Where things live

| File | Role |
| --- | --- |
| `lab/index.html` | Page markup and placeholder copy. |
| `lab/lab.css` | Page styles, tokens, motion vocabulary, surfaces, arrivals. |
| `lab/lab.js` | Theme (View Transition reveal), pause control, wave lifecycle, surfaces, arrivals. |
| `lab/wave-scene.js` | Acrylic painter and wave scene (canvas 2D). |
| `lab/light-study.css`, `lab/light-study.js` | Reusable optical display case. |
| `lab/assets/` | Wave posters used as fallback and first paint. |
| `scripts/check-lab.cjs`, `scripts/check-light-study.cjs`, `scripts/bench-wave.cjs` | Playwright checks and render benchmark. |
| `docs/discovery/` | Plans, implementation notes, performance and motion records. |
| `archive/` | Superseded Three.js implementation and reference snapshots. |
| `design/index.md` | Companion guide for the index page. |
