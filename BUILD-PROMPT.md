# Build prompt for Claude Code

Copy-paste the block below as your first message to Claude Code (run it inside this
project folder). It implements every planned feature that needs no LLM API and no
backend, in priority order. CLAUDE.md and `.claude/skills/` carry the design rules;
Claude Code will pick them up automatically.

---

Step 0, before anything else: extract claude-skills.zip in this folder into
.claude/skills/ so that .claude/skills/frontend-design/SKILL.md,
.claude/skills/impeccable/SKILL.md, .claude/skills/ui-ux-pro-max/SKILL.md and
.claude/skills/design-taste-frontend/SKILL.md all exist, then delete the zip.
Also run `git init` and make an initial commit if this folder is not a repo yet.

Then read CLAUDE.md and the four skills in .claude/skills/, and implement the
features below in index.html, in this order. One feature per commit. After each
feature, run the verification loop from CLAUDE.md (desktop + mobile screenshot,
console check, impeccable detector, pre-flight checklist). Keep the committed
design world: graphite + single amber accent, no em-dashes anywhere, all features
degrade gracefully with reduced motion or a blocked CDN, and the page stays one
self-contained file.

## Feature A: robot eyes track the cursor + poke reaction (quick win)

In the module script, station s3 holds the robot (`bot`, `eyeL`, `eyeR`, `tip`).

1. Eye tracking: each frame, when the camera is near the skills station
   (scrollParam segment 2-3), rotate `bot` a small amount toward the pointer:
   target yaw = existing idle sway + tx * 0.6, target pitch = -ty * 0.35,
   lerped at 0.06 per frame so it feels alive, not instant. Also offset
   `eyeL.position.x/y` and `eyeR.position.x/y` by up to 0.06 toward the pointer
   for a parallax pupil effect.
2. Poke: raycast on pointerdown against the robot head's meshes (build a
   THREE.Raycaster; listen on window, not the canvas, since the canvas is
   pointer-events: none). On hit: a 700ms anime-style reaction implemented with
   plain rAF or a small keyframe helper in the module - bob amplitude doubles,
   antenna `tip` scales to 1.8 and back, both eyes squash to scaleY 0.15 and
   back (a blink), and the robot does one full happy spin (rotation.y += 2*PI,
   eased out). Throttle: ignore pokes while a reaction is playing.
3. Cursor affordance: when the pointer ray hits the robot, set
   document.body.style.cursor = 'pointer', reset otherwise (check only near the
   skills station to avoid constant raycasts).
4. Reduced motion: no tracking, no reaction (the whole module already skips).

## Feature B: terminal easter egg (quick win)

A mini terminal overlay, ~120 lines, no dependencies.

1. Open with the backquote/tilde key (` or ~) or by clicking a subtle
   `terminal` link added to the footer (plain text link, no icon). Close with
   Escape or the `exit` command.
2. Panel: fixed, bottom-left, max-width 520px, graphite `#14161B` surface,
   1px `#24272E` border, IBM Plex Mono 0.85rem, amber prompt glyph `>`.
   z-index above content, below the loader. Focus-trapped input; restores
   focus on close; `role="dialog"` `aria-label="Terminal"`.
3. Commands (case-insensitive, ignore leading `prakhar`):
   - `help` - list commands
   - `--projects` / `projects` - one line per project with its GitHub URL
   - `--stack` / `stack` - the skills groups as plain text
   - `--contact` / `contact` - email, LinkedIn, WhatsApp links
   - `--resume` / `resume` - triggers the assets/resume.pdf download
   - `whoami` - "AI Engineer at The Odin. I make LLMs behave in production."
   - `fly <hero|work|experience|skills|contact>` - smooth-scrolls to that
     section (the camera flight follows automatically)
   - `clear` - clears output
   - `sudo hire prakhar` - hidden: prints "permission granted." then opens
     mailto:sharmaprakhar00o07@gmail.com
   - unknown input - `command not found: <input>. try 'help'`
4. All command data comes from the real page content. No invented facts.

## Feature C: station map navigation (quick win)

1. A fixed vertical rail, right edge, vertically centered, desktop only
   (hide below 860px). Five 8px dots with 1px `#24272E` borders; the active
   station's dot is amber and slightly larger. Labels (Hero, Work, Experience,
   Skills, Contact) appear as small text on hover/focus only.
2. Active state derives from the same section-anchor math as `scrollParam()`
   (reuse it - do not duplicate the mapping).
3. Each dot is a real <button> with an aria-label ("Fly to Skills"); click
   smooth-scrolls to the section; keyboard focusable with the amber focus ring.
4. The rail must not overlap content at 1280px (the content max-width is
   1100px, so the gutter is safe) - verify at 1100-1400px widths.

## Feature D: run the pipeline (the showpiece)

Make the hero SVG diagram executable as a labeled simulation.

1. Add a small ghost button under the diagram caption: `Run a simulated
   dispatch`. One CTA intent, one label - do not duplicate it elsewhere.
2. On press: disable the button while running, then play a state machine
   (pure JS + the existing anime.js) stepping through the diagram:
   - chat message box highlights (amber border sweep), log line 1 appears
   - versioned contract: log `contract accepted, v-hash stored`
   - grounding validator: log `validator: figures match retrieval`
   - boundary flash: the dashed line pulses once, log `LLM handoff complete.
     deterministic from here`
   - claim/lease scheduler: log `lease claimed. idempotency key issued`
   - Microsoft Graph send: log `sent. retry class: none`
3. Log lines render in a small mono log panel that appears below the caption
   (max 6 lines, oldest lines stay, panel has a subtle top hairline). Each
   line fades in staggered ~450ms. Header of the panel: `simulated run` in
   muted text - the honesty label is required.
4. A second press replays it; log resets. The looping ambient pulse pauses
   during a run and resumes after.
5. Keyboard + screen readers: button is focusable; the log panel is
   aria-live="polite".
6. Reduced motion: pressing the button prints all log lines at once, no
   animation.

## Feature E: Cmd+K command palette

1. Cmd+K / Ctrl+K opens a centered palette (max-width 560px, top 20vh),
   backdrop rgba(12,13,16,0.7). Also add a `⌘K` hint chip in the nav on
   desktop (plain bordered text, not a new accent color).
2. Fuzzy-filter input over these actions: the five fly-to-section actions,
   Download resume, Copy email (writes to clipboard, shows "copied" inline),
   Open GitHub (work), Open GitHub (personal), Open LinkedIn, Toggle motion
   (persists a 'motion-off' preference in a JS variable and localStorage
   try/catch; when off, kill the 3D loop and reveals exactly like
   prefers-reduced-motion).
3. Full keyboard support: arrows, Enter, Escape; focus trapped; restores
   focus; role="dialog" with aria-activedescendant on the listbox.
4. The terminal (Feature B) and palette share zero code paths but must not
   both be open at once - opening one closes the other.

## Feature F: live GitHub heartbeat

1. In the footer, left side, add one muted mono line: latest public push,
   e.g. `last commit: religence-backend, 3 days ago`. Data from
   https://api.github.com/users/Prakhartheodin/events/public (fetch,
   no auth, in the classic script after load).
2. Merge with a second fetch for Prakharsharma64; show the most recent
   PushEvent across both. Relative time formatted client-side.
3. Failure handling is silent: any error, rate limit, or empty result
   leaves the footer exactly as it is today (render only on success).
   Timeout the fetch at 4s with AbortController.
4. No spinners, no layout shift: reserve no space; the line simply appears.

## Stretch (only if everything above is green): no-LLM "ask my portfolio"

A deterministic Q&A box in the contact section labeled `keyword search, no
LLM - I right-size architectures`. Client-side index: an array of
{keywords[], answer} built from the real resume facts in README/page copy.
Match on token overlap; on no match, reply "No indexed answer. Ask me the
human: sharmaprakhar00o07@gmail.com". This is a feature AND a joke that
lands with engineers - keep the copy dry.

## Acceptance (all features)

- [ ] Desktop 1280 and mobile 390 screenshots clean; no console errors
- [ ] Keyboard-only pass: every new control reachable, visible amber focus
- [ ] prefers-reduced-motion: no 3D, no animations, all content readable
- [ ] CDN blocked: page fully readable, new features either work (B, C, E,
      F need no libraries) or hide cleanly (A, D degrade)
- [ ] impeccable detector + design-taste pre-flight: no new findings
- [ ] Zero em-dashes; single amber accent; no new fonts
