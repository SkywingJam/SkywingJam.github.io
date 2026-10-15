# Lab Design Guide

This document captures the design thinking behind the lab (`lab/`) and the rules for extending it. It is the counterpart to [index.md](index.md): the index page is a calm gallery, the lab is a workshop with the lights on. Read both, because the two pages share one thread, the wave.

> **Status.** The lab is published at `/lab/`: `_config.yml` no longer excludes it and the portfolio nav links to it. Copy is real content as of October 2026 (homelab, builds, field notes, trade-offs); facts are kept in a local reference file that is not committed. The page also grows a set of reusable components.

## 1. Core idea: a personal lab

The lab is where personal engineering and hobby work lives: the homelab, small layers of code on top of other software, visual studies, and notes on what worked and what did not.

**Theme: things that run out of sight.** The hero says it ("Things that run *out of sight.*"), and every section answers it: the homelab keeps a second copy and stays out of the way, the extension layer sits behind a host app, the wave is literally the page's background, and the field notes ("Back in *sight.*") are the times something surfaced. **Layers** carry the theme visually: three acrylic layers in the wave, three tabs of the homelab (hardware, services, network), a thin layer of scripts over a host in FIG. 002. New entries should fit one of those two readings, or the theme should be revised here first.

- **A workbench, not a brochure.** The index page presents finished work in frames. The lab presents work in progress, with specimen labels (`FIG. 001`, `004 / DESIGN STUDY`), status markers (`In use`, `Running above`, `4 merged`), field notes and trade-offs.
- **Light and material carry the design.** Quality comes from how things are lit: transmission through frosted acrylic in the wave, objects sculpted out of the ground in the figures, edge highlights, soft shadows, a warm daylight palette and a cool moonlight palette. Flat blocks and generic cards are the exception, not the default.
- **Not bound by conventional graphic design.** Grid regularity, uniform spacing and a minimal palette are tools, not rules. It is fine for the hero to be a full-bleed light study, for a component to break the layout, or for an object to be the layout.
- **Technique is allowed to be expensive, within reason.** The lab may use canvas rendering, backdrop blur, layered gradients, View Transitions and scroll-driven animation where they make the material convincing. It should not be held back by "what is cheapest" as the first question. It must still be usable (see section 6).
- **Honest approximation.** Materials are artistic approximations (CSS gradients, SVG, 2D canvas), not physical simulations. Do not claim or chase physical accuracy; chase the feeling of a lit object.
- **Personal, a little less polished.** Copy is first person and plain.
- **Honest about limits.** Every claim is something observed or done, dated where possible. Figures are labelled as observations, not benchmarks. Field notes end with a `LIMITS` line saying what the evidence does not show, and limits go in Trade-offs, split into accepted on purpose, deferred, and not yet proven, rather than being implied as solved. Never publish addresses, credentials, endpoints, private media or personal paths.

## 2. Wave: the thread through index and lab

The wave links the two pages and is the lab's signature.

- On **index** it is a quiet contour field (`ambient-field.js`): single hue, slow, low contrast.
- On **lab** it is the full expression (`lab/wave-scene.js`): three layers of frosted acrylic lit by daylight or moonlight, with transmission, bevels, edge highlights, layer shadows, and a liquid pointer response.
- The design study (`FIG. 004` acrylic wave / `FIG. 005` ambient field) presents both as one theme at two volumes: loud on the lab, quiet on the index. Keep that relationship visible.

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
| Type | Serif italic (`<em>`) for the emotional half of a title ("Small layers, *added carefully.*"). Sans for reading. Small uppercase mono labels (9–10px) for specimen metadata. |
| Labels | Number everything: `FIG.`, `001 /`, `I. II. III.`. It reinforces the lab-notebook feel. |
| Surfaces | Objects are sculpted out of the ground they sit on (soft neumorphism): `.acrylic` raises an object with a highlight on the lit side and a soft shadow on the far side, a faint frosted grain and a polished bevel hairline; `.recess` presses the same light into the surface (the router log panel, the closed pull request bead). Keep it matte and physical, not glossy glass: no specular hotspot, no strong blur, generous but not bubbly radii. Controls that float over a figure (the network scenario switch) use the frosted panel of the featured file instead, with no relief, and floating UI over the wave keeps frosted panels and `[data-surface]`. Objects that stand for real hardware keep their real finish in both themes (the Mac mini is always silver, with a cool silver midtone and darker far edge in daylight, subdued grain and a neutral shadow rather than a white ceramic finish; its Apple-shaped inlay uses a local SVG mask and is lit in the lid's coordinates so it reads as flat glass, without a circular surround). Figures 001–003 sit on a faint tiled grid (`.bench-grid`) for a workbench ground; the design study keeps its own perspective grid. |
| Light | Drive highlights and shadows from one light direction so objects respond together. Inside a `[data-light-field]` the light always falls from above (`--ly` fixed at −.85); only its left/right lean `--lx` (registered, −1…1) follows the pointer and eases back to centre; `--study-light`, `--study-key`, `--study-angle` inside the light study. |
| Icons and glyphs | Same rule as the index guide ([index.md](index.md)): no Unicode arrows or symbol glyphs (`→ ↓ ↑ ↗ ↺ ＋ ↳ ◐ ▷ Ⅱ`) as icons or in labels, including text set from JavaScript (`lab.js` swaps pause/play as SVG). Use inline SVG `.i-arrow` (16×16 viewBox, 1.5px stroke, `currentColor`, `.86em`; `.i-fill` for solid shapes). `light-study.css` carries its own copy of the rule so the component stays portable. All lab markup follows this today; keep it that way. |
| Themes | Light (day) and dark (moon) are both first-class. Check every new object in both. |

## 4. Motion principles

The lab is allowed more motion than the index, but it follows a clear vocabulary.

1. **Two curves.** `--ease-settle` (`cubic-bezier(.16,1,.3,1)`, long deceleration) for all arrivals and transitions; `--ease-soft` (slight overshoot) only for small controls. Do not add more.
2. **Opening choreography.** Title lines rise in sequence, then eyebrow, aside, caption, featured card and footer fade in. Gated by the `intro` class, which is only added when reduced motion is off, so the no-JS page renders at rest.
3. **Arrivals.** `data-arrival` elements rise about 22px over about 1.1s; siblings stagger by 80ms (capped). Anything already visible on load is never hidden.
4. **Scroll.** Hero copy drifts up and fades via CSS scroll-driven animation (compositor only, no JS; unsupported browsers stay still). Layers below the hero translate only, they do not fade, so frosted glass keeps working.
5. **Theme change is an event.** A circular View Transition opens from the toggle button. The wave jumps to the new palette while the reveal acts as the transition, and is paused during it. Falls back to a colour cross-fade.
6. **Pointer responses are local.** Only the surface under the pointer lights up, and a light field only leans while the pointer is over it; the featured file lifts slightly. Nothing animates on its own except designed ambient loops.
   Navigation arrows follow the index link language: on hover or keyboard focus, Portfolio nudges 2px up and right, and Back to top nudges 2px up, using `--ease-settle`. Reduced motion removes both the transition and the nudge.
7. **Ambient loops run only while visible.** Experiment art and `[data-ambient]` figures (`.in-view`: packet flow on routes, injection pulses, status lights, the open-PR ring when a pull request is open), the light-study float and the wave pause when off-screen or when the tab is hidden. Loops move inside fixed geometry (dashes along a path, a pulse along a connector); they never translate an object across a neighbouring line.
8. **The visitor can stop it.** A visible Pause motion control sets `.motion-paused` on `<html>`, which every ambient effect must honour, alongside `prefers-reduced-motion`.
9. **Interaction beats ambience.** Dragging the light, choosing a specimen and pointer tilt are always available, even when ambient motion is paused or reduced.

## 5. Reusable components

The lab is also a component testbed. Components should be copyable into another page with their CSS and JS, needing only the host tokens above.

### Light study (`light-study.css` / `light-study.js`)

A display case with swappable specimens, a light-angle slider, and an editorial index. Its built-in Lens, Layers and Prism specimens stay in the CSS for reuse; on the page it hosts the design study (`data-study-art="acrylic"` and `"contour"`, specimen styles in `lab.css`) rather than a section of its own. Full contract in [docs/discovery/lab-light-study-pattern.md](../docs/discovery/lab-light-study-pattern.md). Key points:

- All copy lives in HTML; JS contains no text. Specimens are `data-study-art="key"` containers matched to `data-study-choice="key"` buttons.
- Layout follows the block's own width via container queries, not the viewport.
- Initialise with `enhanceLightStudies(root)` or `createLightStudy(section)`; dispose with `instance.dispose()`.
- Light is shared through CSS variables; new specimens should use them so they react to the slider and dragging.
- Without JavaScript, the first specimen shows statically and unusable controls stay hidden.
- Touch dragging uses touch events, not pointer events: once a gesture is mostly horizontal it is claimed with `preventDefault()`, mostly vertical gestures scroll the page. iOS Safari cancels touch pointers as soon as it considers scrolling, which made drags stop after a few pixels.

### Wave scene (`wave-scene.js`)

`createAcrylicPainter(canvas)` is the painter (also used to export posters at a fixed phase); `createWaveScene(canvas, stage, options)` adds the loop, pointer, theme and lifecycle. It exposes `setTheme`, `setPaused`, `dispose`, and an `onFallback` hook.

### Switch (`switcher.js`)

Generic tabs: `[data-switch]` root with `data-active`, a hidden `[data-switch-tabs]` list (optional `[data-switch-indicator]` that slides under the active tab), `[data-switch-tab="key"]` buttons and `[data-switch-panel="key"]` panels; `[data-switch-stagger]` children settle in one after another on change. Without JavaScript every panel shows in order (the static network map says which scenario it shows). Nested switches are independent (the homelab tabs hold the network scenario switch). `enhanceSwitches(root)` / `createSwitch(el)`, `dispose()`.

### Homelab panels and ledger (`lab.css`)

Each tab is a `.layer-panel`: a `.lab-figure` (sculpted objects, decorative and `aria-hidden`; in the network figure only the map is hidden, its scenario switch is a real tablist) beside a `dl.ledger` (name / description / `ledger-run` mono status) that carries every fact. The network figure is a fixed-ratio map: HTML nodes positioned in the SVG's 640×400 space, routes as `.route.dns` / `.route.web` with a `.flow` dash that travels along the path, shown per scenario with `in-home` / `in-away` / `in-exit` classes. `.ledger-compact` is the narrow variant (the pull request list).

### Diagram figures

Both are HTML. FIG. 002: sculpted tiles with SVG icons, an engraved proxy line and the host plate, with spacing that tightens through container queries on narrow figures. FIG. 003: sculpted beads on an engraved groove (merged beads raised in the accent, the closed one pressed in). An open pull request uses `.pr-open`, a bead with a turning dashed ring; none is open right now, so its markup sits commented out next to the figure, ready to reuse. Figure text is decorative (`aria-hidden`); the copy beside says the same thing. Icons are 16×16 `.i-arrow` SVGs, never text abbreviations.

### Loupe (`loupe.js`)

A draggable magnifier over real HTML content: `[data-loupe]` root (focusable, arrow keys move the lens, Shift for larger steps), `[data-loupe-source]`, and a hidden `[data-loupe-lens]` holding `.loupe-clip > .loupe-view`; the view receives a scaled copy. The clip layer is circular with `clip-path`, because WebKit does not clip transformed children with `overflow` and `border-radius` alone. Options: `data-loupe-zoom`, `data-loupe-start="x,y"`. Used on the router log, where the copy highlights the key lines. The log's failing lines are a live feed (`[data-log-feed]` in `lab.js`): new lines arrive at irregular intervals and push the oldest out of a fixed six-line window, every feed (including the loupe's copy) steps together, and it only runs on screen and before Pause. Without JavaScript the content reads as it is.

### Field note figures and limits

`dl.note-figures` puts a few key numbers in a row inside a note; `p.note-bound` with a `LIMITS` eyebrow closes a note with what the evidence does not show. Log lines and commands go in `<code>`.

### Surface (`[data-surface]`)

Any card can opt in to the pointer reflection by adding the attribute (today: the featured file). The behaviour is in `lab.js`, the look in `lab.css`.

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
- Run `node scripts/check-lab.cjs` and `node scripts/check-light-study.cjs` against `python3 server.py` before merging lab work. Any Chromium works as the browser: `BROWSER_EXECUTABLE="/Applications/Brave Browser.app/Contents/MacOS/Brave Browser"`, with `PLAYWRIGHT_MODULE` pointing at an existing Playwright install if it is not resolvable from the repo.
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
- Don't let the published copy drift from the facts. The lab and the portfolio's Lab link go out together; before each push, review dated status (pull requests, "as of" lines) against the facts. To take the lab down, add `lab` back to `_config.yml` `exclude` and remove the nav link in `index.html` in the same commit.

## 9. Content structure

| Section | Content | Pattern |
| --- | --- | --- |
| Hero | Theme line, wave, featured link to the homelab | Wave scene, featured file |
| 01 / The homelab | (tabs) hardware, services, network with Home / Away / Public Wi-Fi scenarios | Switch, sculpted figures, ledger |
| 02 / Builds and studies | FIG. 002 extension layer, FIG. 003 open-source PRs, FIG. 004–005 design study | `.experiment`; light study for the design study |
| 03 / Field notes | Incidents and decisions, newest first, each with limits; figures count up on arrival | `.note` list with figures, loupe |
| 04 / Trade-offs | Limits accepted on purpose, deferred, and not yet proven | Three-column grid |
| About | Who and why | About block |

Adding an entry: give it the next `FIG.` number, a status, a plain summary, tags and links; write what was learned and what is not claimed. Status that changes (pull requests, trade-offs) carries an "as of" date in the copy; update it rather than letting it go stale.

## 10. Where things live

| File | Role |
| --- | --- |
| `lab/index.html` | Page markup and all copy. |
| `lab/lab.css` | Page styles, tokens, motion vocabulary, surfaces, arrivals. |
| `lab/lab.js` | Theme (View Transition reveal), pause control, wave lifecycle, surfaces, light fields, arrivals and count-up figures, the live router log. |
| `lab/wave-scene.js` | Acrylic painter and wave scene (canvas 2D). |
| `lab/light-study.css`, `lab/light-study.js` | Reusable display case (design study). |
| `lab/switcher.js` | Reusable tabs (homelab layers, network scenarios). |
| `lab/loupe.js` | Reusable magnifier (router log). |
| `lab/assets/` | Wave posters used as fallback and first paint. |
| `scripts/check-lab.cjs`, `scripts/check-light-study.cjs`, `scripts/bench-wave.cjs` | Playwright checks and render benchmark. |
| `docs/discovery/` | Plans, implementation notes, performance and motion records. |
| `archive/` | Superseded Three.js implementation and reference snapshots. |
| `design/index.md` | Companion guide for the index page. |
