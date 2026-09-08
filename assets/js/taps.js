/* Tap feedback: an expanding amber ring (the beacon's language) whenever a
   link or button is activated. Keyboard activations ring from the control's
   center. Needs anime.js and motion; otherwise the page just clicks. */
document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  try { reduce = reduce || localStorage.getItem('motion-off') === '1'; } catch (e) { }
  if (reduce || typeof anime === 'undefined') return;

  function ring(x, y) {
    var el = document.createElement('span');
    el.className = 'tap-ring';
    el.setAttribute('aria-hidden', 'true');
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    document.body.appendChild(el);
    anime({
      targets: el,
      scale: [0.15, 1.2],
      opacity: [0.65, 0],
      duration: 550,
      easing: 'easeOutCubic',
      complete: function () { el.remove(); }
    });
  }

  function onClick(e) {
    var ctl = e.target.closest && e.target.closest('a, button');
    if (!ctl) return;
    if (e.detail === 0 || (e.clientX === 0 && e.clientY === 0)) {
      var r = ctl.getBoundingClientRect();
      ring(r.left + r.width / 2, r.top + r.height / 2);
    } else {
      ring(e.clientX, e.clientY);
    }
  }
  document.addEventListener('click', onClick);

  /* palette's motion toggle */
  window.killTaps = function () {
    document.removeEventListener('click', onClick);
  };
});
