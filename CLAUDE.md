# Portfolio project - Claude Code instructions

Portfolio for Prakhar Sharma, AI Engineer. Static site, no build step, no npm:
`index.html` (markup only) plus small per-feature files under `assets/css/` and
`assets/js/`. anime.js (UMD via cdnjs) and Three.js (ES module via cdnjs) render a
five-station 3D world driven by scroll. Each feature lives in its own JS file;
keep it that way instead of growing any one file.

## Design skills - use them

This repo ships four design skills in `.claude/skills/`. Before ANY visual or UX change,
read and follow them:

- `frontend-design` - distinctive, non-templated visual direction
- `impeccable` - craft floor, verification passes, refinement commands
- `design-taste-frontend` - anti-slop rules, AI-tell bans, pre-flight checklist
- `ui-ux-pro-max` - searchable UX/accessibility/typography database (run its `scripts/search.py`)

## Committed design world (do not drift)

- Graphite base `#0C0D10`, raised `#14161B`, hairlines `#24272E` / `#1B1E24`
- ONE accent: amber `#F2A33C` (deep variant `#C77E1F`). No second accent, ever.
- Type: Bricolage Grotesque (display), Instrument Sans (body), IBM Plex Mono
  (data/measurement only - never as decoration)
- Signature element: the mail-agent boundary diagram ("the LLM stops here")

## Hard rules (from the skills; violations = not done)

- Zero em-dashes in visible copy. No uppercase eyebrow labels. No section numbers.
- No stat-tile hero rows, no glyph icons (draw SVG or CSS), no gradient text.
- All motion honors `prefers-reduced-motion`; page must be fully readable with JS off
  or CDN blocked (anime.set hides elements only after JS confirms availability).
- WCAG AA contrast minimum. Visible focus rings (amber). Keyboard operable.
- Canvas stays `pointer-events: none` EXCEPT where a feature needs picking - then use
  a raycaster on a separate listener, never block text/link clicks.
- No build step. No npm. Libraries only from cdnjs. Plain `<script src>` / `<link>`
  tags; one small file per feature under `assets/js/`.

## Code map

- `index.html` - markup only, plus two tiny inline scripts (gtag, js-loading class)
- `assets/css/main.css` - all styles
- `assets/js/reveals.js` - loader (anime timeline, exits on window load, 2.6s cap),
  reveals, progress bar, h2 underlines (IntersectionObserver + rAF)
- `assets/js/rail.js` - `window.scrollParam()` (the section-anchor scroll mapping,
  shared source of truth) + the station dot rail
- `assets/js/terminal.js` - the terminal easter egg (`#term`, backquote toggle)
- `assets/js/world.js` - the 3D world (ES module)
  - `W[]` - five station anchor positions (hero, work, experience, skills, contact)
  - `s0..s4` - station groups: particle field / pipeline / job queue / robot / beacon
  - Robot parts: `bot`, `head`, `eyeL`, `eyeR`, `antenna`, `tip`, `torso`, `orbits[]`
  - Camera: CatmullRomCurve3 through `W[i] + camOffset`; uses `window.scrollParam()`;
    `smooth()` eases arrivals; robot poke raycaster on a window listener
- SVG diagram: `.diagram` in the hero; boxes `.d-box`, flow `.d-flow`, pulse `.d-pulse`

## Verification loop

After UI changes: open a local server (`python -m http.server`), screenshot desktop
(1280px) AND mobile (390px), check console for errors, run the impeccable detector
(`node .claude/skills/impeccable/scripts/detect.mjs --json index.html`) and the
design-taste-frontend pre-flight checklist. Fix in one batch; confirm with at most
one more round.

## Truth rules

Never invent metrics, projects, or claims. Real facts only: they live in README.md
and the copy already on the page. Simulated demos must be labeled simulated.

## Publish

Push `index.html` + `assets/` to `main` of `github.com/Prakharsharma64/Portfolio`
(GitHub Pages). Resume served from `assets/resume.pdf`.
