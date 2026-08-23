# Prakhar Sharma — Portfolio

Static portfolio site (GitHub Pages ready, no build step). `index.html` holds the
markup; styles and per-feature scripts live under `assets/css/` and `assets/js/`:
anime.js choreography and a Three.js "5-station world" driven by scroll.

## Preview locally

```bash
python -m http.server 8000
# open http://localhost:8000
```

## Structure

- `index.html` — markup
- `assets/css/main.css` — all styles
- `assets/js/` — one small file per feature (reveals, rail, terminal, world)
- `assets/resume.pdf` — linked by the Resume buttons
- `assets/icons/favicon.ico` — tab icon

## The 3D world

Five stations along a camera spline (scroll or nav clicks fly between them):

1. Hero — embedding-space particle field
2. Work — 3D pipeline with a traveling pulse
3. Experience — flowing job queue + dead-letter loop
4. Skills — robot with orbiting skill satellites
5. Contact — signal beacon

Station positions are in the `W` array inside the module script; each station's
visuals are grouped as `s0`–`s4`. Camera path = CatmullRomCurve3 through
`W[i] + camOffset`.

## Publishing

Push `index.html` and `assets/` to the `main` branch of
`github.com/Prakharsharma64/Portfolio` — GitHub Pages serves it as-is.

## Safety rails already built in

- `prefers-reduced-motion` disables loader, 3D, and animations
- CDN failure degrades to a fully readable static page
- Canvas is `pointer-events: none`; content always clickable
