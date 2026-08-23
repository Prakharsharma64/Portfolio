# Portfolio project - Claude Code instructions

Single-file portfolio for Prakhar Sharma, AI Engineer. The entire site is `index.html`:
inline CSS, anime.js (UMD via cdnjs), and Three.js (ES module via cdnjs) rendering a
five-station 3D world driven by scroll.

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
- Single file. No build step. No npm. Libraries only from cdnjs.

## Code map (inside index.html)

- Loader: `#loader` + classic script (anime timeline, exits on window load, 2.6s cap)
- Reveals + progress bar + h2 underlines: classic script, IntersectionObserver + rAF
- 3D world: `<script type="module">` at the bottom
  - `W[]` - five station anchor positions (hero, work, experience, skills, contact)
  - `s0..s4` - station groups: particle field / pipeline / job queue / robot / beacon
  - Robot parts: `bot`, `head`, `eyeL`, `eyeR`, `antenna`, `tip`, `torso`, `orbits[]`
  - Camera: CatmullRomCurve3 through `W[i] + camOffset`; `scrollParam()` maps scroll
    position to curve parameter via section anchors; `smooth()` eases arrivals
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
