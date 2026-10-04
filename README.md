# SkywingJam.github.io

Personal website of Haochen Zhou, a software engineer in Melbourne, live at [skywingjam.com](https://skywingjam.com).

- **Index**: a quiet, gallery-style portfolio with a slow contour-field background.
- **Lab** (unpublished): a personal workshop for light, material and small experiments, built around a frosted-acrylic wave.

Plain HTML, CSS and JavaScript, served by GitHub Pages (Jekyll). No build step.

## Structure

| Path | Contents |
| --- | --- |
| `index.html`, `ambient-field.js` | Portfolio page and its background |
| `lab/` | Lab page and reusable components (excluded from the published site) |
| `design/` | Design guides: [index](design/index.md), [lab](design/lab.md) |
| `docs/discovery/` | Lab design notes and measurements |
| `archive/` | Superseded Lab studies |
| `scripts/` | Playwright checks and benchmarks |

## Run locally

```bash
python3 server.py
```

Then open http://localhost:8001. To publish the lab, remove `lab` from `exclude` in `_config.yml` and restore its nav link in `index.html`.

Co-create with: ChatGPT Codex and Claude Code
