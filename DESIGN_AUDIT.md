# Design and accessibility audit - 2026-08-23 (implemented 2026-09-08, branch design-audit-fixes)

Two audits run against the working tree (uncommitted changes in `world.js` and `CLAUDE.md`
included). Nothing below has been implemented yet. Sources: bencium `design-audit` skill
(visual/UX, phased plan) and accesslint `accessibility-audit` skill emulated with
axe-core 4.13.0 + puppeteer-core against installed Chrome (WCAG 2.2 AA, WCAG-EM,
8 sampled states). Six axe runs: 0 violations; everything below came from the manual
tiers and hand-computed contrast.

---

# Part 1 - Design audit (phased plan)

Overall: the committed design world is executed with discipline (single amber accent,
no em-dashes/eyebrows/section numbers, facts consistent across index.html / terminal.js /
ask.js / palette.js, zero console errors, no horizontal overflow at 390 or 1280).
The systemic failure: 3D world geometry collides with body copy at four of five stations.

## Phase 1 - Critical

### 3D geometry overlaps text (one systemic defect, four stations)

- Skills: robot head + amber eye slabs render behind the "Retrieval and RAG" heading;
  grey orbit satellites sit on "LLM and generative AI", "pipelines", "query caching",
  "Redis" at 1280px; at 390px satellites overlap "Retrieval and RAG".
  Fix: `world.js:172` offset `(-4.2, 0.5, 0)` -> approx `(-7.5, 0.5, -2)`;
  `world.js:152` orbit radii `[3.4, 4.4, 5.4]` -> approx `[2.4, 3.2, 4.0]`.
- Experience: amber queue cubes and the queue curve pass through "transcript capture";
  an orbit ellipse crosses "BullMQ queues".
  Fix: `world.js:126` offset `(-4.5, 0, 0)` -> approx `(-8, 0, -2)`;
  optionally `world.js:96-99` qCurve x values -6/-2/2/6 -> -4.5/-1.5/1.5/4.5.
- Work: graphite stage boxes sit under the "99 data models, 77 REST modules" facts line,
  muddying the lowest-contrast text on the page.
  Fix: `world.js:90` offset `(-4.5, 0, 0)` -> approx `(-7, -1, -3)`.
- Contact: expanding amber ring crosses "If you're building..." and the cone crosses
  the Search button at 1280px.
  Fix: `world.js:195` offset `(4.5, -0.5, 0)` -> approx `(7, -0.5, -2)`;
  `world.js:328` ring scale `0.4 + ph * 4` -> `0.4 + ph * 2.6`.
- These are placement values on a curved camera path: after changing, run the CLAUDE.md
  verification loop (serve, screenshot 1280 and 390 at all five stations) and nudge until
  no geometry intersects `.wrap` content.

### Reduced-motion drift (hard-rule violation)

- `main.css:24` sets `scroll-behavior: smooth` unconditionally.
  Fix: add `@media (prefers-reduced-motion: reduce) { html { scroll-behavior: auto; } }`.
- `rail.js:37`, `palette.js:18`, `terminal.js:61` call
  `scrollIntoView({ behavior: 'smooth' })` unconditionally.
  Fix: behavior `'auto'` when `prefers-reduced-motion: reduce` matches or the site's
  motion-off flag is set (wrap localStorage read in the standard try/catch).

### Mobile has zero jump navigation

- Below 640px nav links are hidden (`main.css:1134-1136`); rail hidden below 860px
  (`main.css:969-973`); palette button hidden below 860px (`main.css:886-890`).
  Scroll is the only wayfinding on phones.
  Fix: keep the four links on a compact wrapping nav row at small widths:
  `.nav { flex-wrap: wrap; height: auto; padding: 10px 0; row-gap: 2px; }
  .nav__links { flex-wrap: wrap; gap: 14px; } .nav__links a { font-size: .88rem; }`
  (verify two-row height stays under ~96px at 390px).

### Command palette accessibility (also Part 2 findings, same fix)

- `palette.js:106` sets `aria-activedescendant` on the listbox; it must be on the
  focused `role="combobox"` input `#pal-in` (clear it in `closePal`).
- `#pal-in` has `outline: none` (`main.css:844`) with no compensating focus indicator.
  Fix: add `.pal__panel:focus-within { border-color: var(--amber-deep); }` mirroring
  the terminal treatment at `main.css:997-999`.
- Neither `#pal` (`index.html:308`) nor `#term` (`index.html:316`) declares
  `aria-modal="true"`. Add it to both.

### Hero pipeline demo jolts its own layout

- The log grows line-by-line; `.hero__grid` is `align-items: center` (`main.css:182`),
  so the h1 shifts ~90px during a run, and the log lands below the fold at 800px height.
  Fix: reserve final height up front on `.diagram__log` (`main.css:303-311`), approx
  `min-height: 10.5em` (head + 6 lines at line-height 1.7, font-size .8rem); verify the
  h1 no longer moves and the log head is visible after click.

## Phase 2 - Refinement

- Color tokens: seven greys hardcoded repeatedly outside `:root`. Promote to tokens and
  replace every occurrence:
  - `--ink-faint: #7A808A` (main.css:265, 313, 553, 615, 635, 641, 763, 785, 849, 1061)
  - `--ink-soft: #9AA0A9` (1043, 1065)
  - `--line-strong: #3A3F48` (164, 253, 817)
  - `--underline: #454A53` (46, 1045)
  - `--flow: #4A505A` (269)
  - `--on-amber: #17120A` (40, 72, 138)
  Add the tokens to CLAUDE.md's "Committed design world" list when approved.
- `index.html:67`: visible "⌘K" shown to all platforms. Default the label to "Ctrl K";
  in `palette.js` init swap to the command glyph only when `navigator.platform` is
  Mac-like, and mirror the platform in the aria-label. (Also fixes the SC 2.5.3
  label-in-name flag: visible text should appear in the accessible name.)
- Focus order: `#rail` markup (`index.html:49-57`) precedes `<header>`, so Tab visits
  five mid-screen dots before the top nav. Move the rail block after `</footer>`
  (selectors in `rail.js` are id-based, no JS change).
- Rail touch targets: below 1200px dots shrink to 16px (`main.css:964-966`), under the
  24px WCAG 2.2 minimum. Keep the visual dot 8px but restore a 24x24 hit area
  (adjust `#rail { right: 0; }` instead of shrinking the button).
- `ask.js:71`: "No indexed answer. Ask me the human: ..." is broken grammar ->
  "No indexed answer. Ask the human: sharmaprakhar00o07@gmail.com".
- `index.html:279` `.ask__tag`: wraps raggedly at 390px. Shorten to
  "keyword search, no LLM" or make the tag `display: block` on its own line below 640px.
- `index.html:300-302`: footer links spaced with `&nbsp;&nbsp;`. Wrap in
  `.foot__links { display: inline-flex; flex-wrap: wrap; gap: 18px; }`.
- `main.css:856`: palette list `max-height: 320px` clips "Copy email" at open ->
  `max-height: min(432px, 55vh)`.

## Phase 3 - Polish

- No-JS state: page is readable (rule met) but `#pal-open`, `.foot__term`, `#run-sim`,
  rail dots, and the ask form render as dead controls. Ship triggers hidden and have each
  feature script reveal its own, or single-point fix: inline script adds `class="js"` to
  `<html>`, CSS hides the five triggers under `html:not(.js)`.
- Loader cap: the 2.6s escape hatch (`reveals.js:77`) lives inside DOMContentLoaded; a
  hanging CDN delays DOMContentLoaded and holds the loader. Add a parallel
  `setTimeout(() => document.documentElement.classList.remove('js-loading'), 3000)` to
  the inline script at `index.html:35-43`.
- `main.css:263-266`: `.d-side` 10.5px is the smallest text on the page -> 11.5px.
- `index.html:283`: ask placeholder truncates at 390px -> "e.g. stop hallucinations?".
- `world.js:17`: `GREY = 0x6E747E` matches nothing in the CSS palette -> `0x7A808A`
  (aligns with `--ink-faint`).
- Document as intentional (so future audits don't re-litigate): heartbeat's silent
  failure mode, palette "No matching command" empty state, ask fallback path, labeled
  simulated run, dark-only theme.

Duplicated-facts guard: the ask-tag copy change touches `index.html` only; the ask
fallback string exists only in `ask.js`; no edits above touch mirrored facts.

---

# Part 2 - Accessibility audit (WCAG 2.2 AA, WCAG-EM)

Sample: 8 states of the single page (loaded desktop 1280, terminal open, palette open,
pipeline run, ask answered, mobile 390 + 320 reflow probe, reduced-motion emulated,
text-spacing override). Axe on states 1-6: 0 violations each; no console errors.

## Conformance ledger

- Pass (verified): 15 - 1.3.1, 1.3.4, 1.4.3, 1.4.5, 2.1.2, 2.3.1, 2.4.1, 2.4.2,
  2.4.11, 2.5.2, 2.5.8, 3.1.1, 3.2.1, 3.2.2, 3.3.2
- Fail (verified): 3 - 2.1.4, 4.1.2, 4.1.3
- Undetermined (needs a person): 16 - content/visual judgment (1.1.1, 1.3.2, 1.3.3,
  1.4.1, 2.4.4, 2.4.6), indicator/graphic sufficiency (1.4.11, 2.4.7), zoom/reflow
  interpretation (1.4.4, 1.4.10, 1.4.12), interaction judgment (2.1.1, 2.2.2, 2.4.3,
  2.5.3, 1.4.13)
- N/A: 21 (no media, no timeouts, no gestures/drag, single page, single language,
  no personal-data/error/legal/auth flows)

Verified contrast math: SVG `.d-label` #EDEEF0 on #14161B = 15.6:1; `.d-boundary-label`
#F2A33C on #0C0D10 = 9.3:1; `.d-side` #7A808A on #0C0D10 = 4.9:1; body #A6ABB4 = 8.4:1;
#7A808A on raised = 4.55:1; #9AA0A9 = 7.4:1; button text #17120A on amber = 8.9:1. All pass.

## Serious (verified)

1. SC 2.1.4 (Level A) - single-character key shortcut, no remap/disable.
   `terminal.js:120-128`: backquote/tilde anywhere outside a text field toggles the
   terminal. Suppression inside inputs is not an accepted mitigation; speech-input users
   and keyboard users with tremors can trigger it accidentally.
   Fix: require a modifier, or provide a disable/remap mechanism.
2. SC 4.1.2 - palette combobox never exposes its active option to AT.
   `palette.js:106` puts `aria-activedescendant` on the list; focus is on the input, so
   the attribute is ignored and the highlighted command is invisible to screen readers.
   Fix: set/move it on `#pal-in` (APG combobox pattern; role/aria-controls already there).

## Moderate

3. SC 4.1.3 (verified) - palette confirmations "copied" / "motion off" (`palette.js:65-70`
   `note()`) have no `role="status"`/`aria-live`. Other dynamic outputs (`#sim-log-lines`,
   `#ask-out`, `#term-out`) already carry `aria-live="polite"`. Fix: `role="status"` on
   the note span.
4. SC 2.2.2 (flagged) - persistent animated background (world rAF loop + hero pulse) with
   no reachable pause on touch: palette button and rail hidden at <=860px, Ctrl+K needs a
   keyboard. Confirm whether OS-level reduced-motion satisfies "mechanism to pause".
   (The Phase 1 mobile-nav fix plus exposing the motion toggle would clear this.)
5. SC 1.4.11 (flagged, computed) - `.d-flow` connectors #4A505A on #0C0D10 = 2.4:1
   (carry sequence meaning; likely fail); non-current rail dots 1.07:1 fill / 1.3:1
   border; `.btn--ghost` and `#ask-in` borders #24272E = 1.3:1 (arguably identified by
   text/placeholder). Consider lifting flow/dot strokes toward the #7A808A range for 3:1.
6. SC 2.4.7 (flagged) - no visible focus outline on `#pal-in` (`main.css:844`) and
   `#term-in` (`main.css:1032`); id-selector specificity beats the global
   `:focus-visible` rule (`main.css:55-59`). Terminal container does shift border on
   focus-within; palette has nothing. Same fix as Phase 1 palette item.
7. SC 2.4.3 (flagged) - focus order: skip link -> 5 rail dots -> header nav -> content.
   Same fix as Phase 2 rail-relocation item.
8. SC 1.4.10 (flagged) - no 2D scroll at 320/390 (clean), but all jump navigation
   disappears on mobile. Same fix as Phase 1 mobile nav.

## Minor (all flagged, a person decides)

9.  SC 1.1.1 - hero diagram is `role="img"` with a one-line label; inner stage texts
    ("chat message" -> "Microsoft Graph send", "the LLM stops here") are hidden from AT.
    Figcaption + simulated-run log narrate most of it; confirm equivalence.
10. SC 2.5.3 - visible "⌘K" not contained in accessible name "Open command palette
    (Ctrl+K)". Cleared by the Phase 2 Ctrl K label change.
11. SC 1.4.13 - rail hover/focus tooltips not dismissable with Esc. Low impact.
12. SC 1.3.1/4.1.2 - palette empty-state `li.pal__empty` (`palette.js:92-97`) lacks
    `role="option"` inside the listbox and `mark()` sets `aria-selected` on it.
13. SC 1.3.3 - "the diagram above" (`index.html:164`), "links above" (`ask.js:48`):
    references also name their targets; likely fine.
14. SC 2.1.1 - robot poke is pointer-only (`world.js:232-235`) with a pointer cursor
    advertising it. Purely decorative; likely exempt; keep it decorative.

## Verified-good (keep; do not regress)

Esc closes each overlay and restores focus to the invoker; terminal Tab wrap holds;
overlay mutual exclusion works; backquote inside inputs does not open the terminal;
run-sim button keeps focus through disable/enable; reduced-motion suppresses loader,
canvas, and reveals with content at opacity 1 and the pipeline log renders instantly;
page fully readable with JS or CDN blocked; 31-stop focus walk all amber 2px outlines;
0px horizontal overflow at 1280/390/320 and under the 1.4.12 spacing override.

## Human/AT testing handoff (cannot be closed from code)

- Live regions actually announcing (`#sim-log-lines`, `#ask-out`, `#term-out`) -
  NVDA and VoiceOver, on the pipeline run / ask question / terminal help flows.
- Palette end-to-end with a screen reader (after fix 2); speech-input (Dragon) session
  on the terminal shortcut and the "⌘K" name.
- Reading order and comprehension top-to-bottom; real browser zoom 200-400 percent
  (1.4.4 was not exercised).

## Suggested fix order

1. One palette pass clears findings 2, 3, 6, 10, 12 plus aria-modal (palette.js + two
   index.html attributes).
2. Terminal shortcut modifier/disable (the only Level A verified fail).
3. World-geometry offsets (Phase 1) with the screenshot verification loop.
4. Reduced-motion scroll gating; mobile nav row; hero log min-height.
5. Phase 2 token work, then Phase 3 polish.
