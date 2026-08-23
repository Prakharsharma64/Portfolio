/* Feature: run the hero diagram as a labeled simulation. No libraries. */
(function () {
  var btn = document.getElementById('run-sim');
  var panel = document.getElementById('sim-log');
  var lines = document.getElementById('sim-log-lines');
  var svg = document.querySelector('.diagram svg');
  if (!btn || !svg) return;
  var boxes = svg.querySelectorAll('.d-box');
  var boundary = svg.querySelector('.d-boundary');
  var pulse = svg.querySelector('.d-pulse');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var steps = [
    { box: 0, log: 'chat message received' },
    { box: 1, log: 'contract accepted, v-hash stored' },
    { box: 2, log: 'validator: figures match retrieval' },
    { boundary: true, log: 'LLM handoff complete. deterministic from here' },
    { box: 3, log: 'lease claimed. idempotency key issued' },
    { box: 4, log: 'sent. retry class: none' }
  ];

  function addLine(text, instant) {
    var p = document.createElement('p');
    p.className = 'diagram__log-line';
    p.textContent = text;
    lines.appendChild(p);
    if (instant) {
      p.classList.add('in');
    } else {
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { p.classList.add('in'); });
      });
    }
  }

  btn.addEventListener('click', function () {
    lines.textContent = '';
    boxes.forEach(function (b) { b.classList.remove('lit', 'sweep'); });
    boundary.classList.remove('pulse');
    panel.hidden = false;

    if (reduce) {
      steps.forEach(function (s) {
        if (s.box != null) boxes[s.box].classList.add('lit');
        addLine(s.log, true);
      });
      return;
    }

    btn.disabled = true;
    if (window.pulseAnim) window.pulseAnim.pause();
    if (pulse) pulse.style.opacity = 0;

    steps.forEach(function (s, i) {
      setTimeout(function () {
        if (s.box != null) boxes[s.box].classList.add('lit', 'sweep');
        if (s.boundary) boundary.classList.add('pulse');
        addLine(s.log);
        if (i === steps.length - 1) {
          setTimeout(function () {
            btn.disabled = false;
            if (pulse) pulse.style.opacity = '';
            if (window.pulseAnim) window.pulseAnim.play();
          }, 800);
        }
      }, 100 + 450 * i);
    });
  });
})();
