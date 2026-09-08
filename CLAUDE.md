# Portfolio project - Claude Code instructions

## Context tooling - lean-ctx ONLY

lean-ctx (https://github.com/yvgude/lean-ctx) is installed and wraps this agent
(MCP server + shadow mode). For ALL context work in this repo use only its
`ctx_*` MCP tools; do not fall back to native tools:

- Reads and exploration: `ctx_read` (native `Read` only as the read-before-edit gate)
- Search: `ctx_search` (never Grep or rg), files: `ctx_glob`, directories: `ctx_tree`
- Shell: `ctx_shell` (its allowlist is enforced; add a command with `lean-ctx allow <cmd>`)
- Edits: `ctx_read(mode="anchored")` then `ctx_patch`

Do not disable or work around the lean-ctx shell gate, path jail, or shadow mode.

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
- Grey ramp tokens (use these, never raw hex): `--ink-faint #7A808A`, `--ink-soft #9AA0A9`,
  `--line-strong #3A3F48`, `--underline #454A53`, `--flow #7A808A` (lifted for SC 1.4.11),
  `--on-amber #17120A`
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
- `assets/js/reveals.js` - loader (anime timeline; exits when window load AND the
  world's first frame have both happened, 1.8s grace if the world never appears,
  2.6s hard cap), the hero decode-in on the h1 em (width-locked, aria-label pinned
  first), reveals, progress bar, h2 underlines (IntersectionObserver + rAF)
- `assets/js/rail.js` - `window.scrollParam()` (the section-anchor scroll mapping,
  shared source of truth) + the station dot rail
- `assets/js/terminal.js` - the terminal easter egg (`#term`, Ctrl+backquote toggle -
  the modifier is a WCAG 2.1.4 requirement, do not remove it)
- `assets/js/palette.js` - Ctrl+K / Cmd+K command palette (`#pal`, fuzzy filter,
  fly-to-station, copy email, motion toggle that calls the kill switches)
- `assets/js/pipeline.js` - "Run a simulated dispatch": steps the hero diagram and
  writes the labeled log; pauses/resumes `window.pulseAnim` around a run
- `assets/js/ask.js` - "Ask my portfolio": two deterministic engines, no LLM; every
  answer restates copy already on the page. Engine 1: precomputed MiniLM word vectors
  (`assets/data/ask-index.json`, lazy-fetched on first input focus) scored as
  mean-over-query-words of max cosine to each entry's word cloud, threshold 0.55.
  Engine 2 (fallback): the original keyword overlap. A meta line under each answer
  names the engine that produced it. When `INDEX` changes, mirror the change in
  `tools/build-ask-index.js` and rerun it (offline, npm lives outside this repo)
- `assets/js/heartbeat.js` - latest public push across both GitHub accounts, written
  to the footer AND the `#heartbeat-work` chip beside the Work heading; any failure
  or rate limit leaves both untouched
- `assets/js/world.js` - the 3D world (ES module)
  - `W[]` - five station anchor positions (hero, work, experience, skills, contact)
  - `s0..s4` - station groups: particle field / pipeline / job queue / robot / beacon
  - Robot parts: `bot`, `head`, `eyeL`, `eyeR`, `antenna`, `tip`, `torso`, `orbits[]`
  - Camera: CatmullRomCurve3 through `W[i] + camOffset`; uses `window.scrollParam()`;
    `smooth()` eases arrivals; robot poke raycaster on a window listener
  - Dust field scattered along the whole camera path so travel never shows an empty
    frame; on mobile the tick dims `#world` to 0.45 opacity past the hero; the first
    rendered frame dispatches `world-ready` (reveals.js holds the loader for it)
- `404.html` - GitHub Pages 404 styled as a dead-letter queue; every path in it is
  site-absolute (`/Portfolio/...`) because Pages serves it at arbitrary depths
- `llms.txt` - plain-text site summary for LLM crawlers; facts mirror the page copy
- `assets/og-card.png` - 1200x630 share card referenced by the og:/twitter: meta in
  index.html; JSON-LD Person schema also lives in the head
- `tools/build-ask-index.js` - offline generator for `assets/data/ask-index.json`
  (see ask.js above); node-only, never loaded by the site
- SVG diagram: `.diagram` in the hero; boxes `.d-box`, flow `.d-flow`, pulse `.d-pulse`

### The `window.*` contract (the only cross-file API)

- `scrollParam` (rail.js) -> world.js camera; the shared scroll mapping
- `pulseAnim` (reveals.js) -> pipeline.js pauses/plays it during a simulated run
- `killReveals` (reveals.js), `killWorld` (world.js) -> palette.js motion toggle
- `closePalette` (palette.js) <-> `closeTerminal` / `openTerminal` (terminal.js) -
  mutual exclusion between the two overlays; every consumer guards with `if (window.X)`

## Verification loop

After UI changes: open a local server (`python -m http.server`), screenshot desktop
(1280px) AND mobile (390px), check console for errors, run the impeccable detector
(`node .claude/skills/impeccable/scripts/detect.mjs --json index.html`) and the
design-taste-frontend pre-flight checklist. Fix in one batch; confirm with at most
one more round.

## Intentional behaviors (documented so future audits don't re-litigate)

- heartbeat.js fails silently: any GitHub API error leaves the footer untouched
- Palette "No matching command" empty state is deliberate (no suggestion engine)
- Ask fallback ("No indexed answer. Ask the human: ...") is the designed dead end
- The hero dispatch run is labeled "simulated run" on purpose
- Dark-only theme: no light mode is planned
- Ask vectors lazy-load on first input focus (nobody pays 72KB who never asks); the
  tag under "Ask my portfolio" upgrades from keyword to embedding wording only after
  the JSON actually loads, and the meta line under each answer names the real engine
- The hero hint line is keyboard-only affordances, so it is hidden under 860px
- Terminal `guardrails` and the stat row restate page copy; nothing is invented

## Truth rules

Never invent metrics, projects, or claims. Real facts only: they live in README.md
and the copy already on the page. Simulated demos must be labeled simulated.

### Duplicated facts - one change, many files

`index.html` is static markup, so page facts are intentionally repeated in JS
(no shared data file; a build step is off the table). When one of these changes,
update every listed file in the same commit or the copies drift:

- Contact (email, LinkedIn, WhatsApp): `index.html`, `palette.js`, `terminal.js`, `ask.js`
- Skills / stack copy: `index.html`, `terminal.js` (`stack`), `ask.js` (`INDEX`)
- Project list and GitHub links: `index.html`, `terminal.js` (`projects`), `ask.js`
- The five stations (count AND order must agree everywhere): `index.html` (rail
  buttons + nav), `rail.js` (selector list), `world.js` (`W[]`), `palette.js`
  (fly actions), `terminal.js` (fly help text)
- Ask `INDEX` answers: `ask.js` and `tools/build-ask-index.js` (rerun it so
  `assets/data/ask-index.json` matches)
- Positioning copy (headline, description): `index.html` (meta + og: + JSON-LD),
  `llms.txt`, and the rendered `assets/og-card.png`

## Git

No Claude co-author trailers or "Generated with Claude" lines in commit
messages or PR bodies. Ever.

## Publish

Push `index.html` + `assets/` to `main` of `github.com/Prakharsharma64/Portfolio`
(GitHub Pages). Resume served from `assets/resume.pdf`.
