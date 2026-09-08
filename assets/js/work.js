/* Work section life: traveling pulses on the two feature diagrams, amber
   breathing on their LLM stages, a one-shot count-up on the stats row.
   Needs anime.js and motion; without either the section stays static. */
document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { reduce = reduce || localStorage.getItem('motion-off') === '1'; } catch (e) { }
  if (reduce || typeof anime === 'undefined') return;

  /* ============ feature diagram pulses (loop only while on screen) ============ */
  var pulses = [];
  document.querySelectorAll('.feature__diagram svg').forEach(function (svg, i) {
    var dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    dot.setAttribute('class', 'd-pulse');
    dot.setAttribute('cx', '120');
    dot.setAttribute('cy', '14');
    dot.setAttribute('r', '3');
    dot.setAttribute('opacity', '0');
    svg.appendChild(dot);
    pulses.push({
      svg: svg,
      anim: anime({
        targets: dot,
        translateY: [0, 184],
        opacity: [
          { value: 1, duration: 250 },
          { value: 1, duration: 2000 },
          { value: 0, duration: 350 }
        ],
        duration: 2600,
        delay: 400 + i * 900,
        loop: true,
        easing: 'linear',
        autoplay: false
      })
    });
  });
  var pio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      pulses.forEach(function (p) {
        if (p.svg === e.target) { e.isIntersecting ? p.anim.play() : p.anim.pause(); }
      });
    });
  }, { threshold: 0.25 });
  pulses.forEach(function (p) { pio.observe(p.svg); });

  /* the LLM stages breathe amber, echoing "the LLM stops here"
     (hexes mirror --line-strong / --amber-deep, as world.js mirrors the tokens) */
  var breath = anime({
    targets: '#work .d-box--llm',
    stroke: ['#3A3F48', '#C77E1F'],
    duration: 2200,
    direction: 'alternate',
    loop: true,
    easing: 'easeInOutSine'
  });

  /* ============ stats count up once, width-locked so nothing reflows ============ */
  var counts = [];
  var sio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (!e.isIntersecting) return;
      sio.unobserve(e.target);
      var el = e.target;
      var raw = el.textContent;
      var num = parseInt(raw.replace(/[^0-9]/g, ''), 10);
      if (!num) return;
      var suffix = raw.indexOf('+') >= 0 ? '+' : '';
      el.style.minWidth = el.offsetWidth + 'px';
      var o = { v: 0 };
      counts.push(anime({
        targets: o, v: num, round: 1, duration: 1100, easing: 'easeOutCubic',
        update: function () { el.textContent = o.v.toLocaleString('en-US') + suffix; },
        complete: function () { el.textContent = raw; el.style.minWidth = ''; }
      }));
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('.stats__n').forEach(function (el) { sio.observe(el); });

  /* palette's motion toggle */
  window.killWork = function () {
    pio.disconnect();
    sio.disconnect();
    breath.pause();
    pulses.forEach(function (p) { p.anim.pause(); });
    counts.forEach(function (a) { a.pause(); a.seek(a.duration); });
  };
});
