/* one scroll-to-station mapping, shared by the 3D camera and the rail */
window.scrollParam = (function () {
  var els = ['.hero', '#work', '#experience', '#skills', '#contact']
    .map(function (s) { return document.querySelector(s); });
  function smooth(t) { return t * t * (3 - 2 * t); }
  return function () {
    var vh = window.innerHeight, y = window.scrollY;
    var anchors = els.map(function (el) {
      var r = el.getBoundingClientRect();
      return r.top + y + el.offsetHeight / 2 - vh / 2;
    });
    if (y <= anchors[0]) return 0;
    for (var i = 0; i < anchors.length - 1; i++) {
      if (y < anchors[i + 1]) {
        var t = (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
        return (i + smooth(Math.min(Math.max(t, 0), 1))) / (anchors.length - 1);
      }
    }
    return 1;
  };
})();

(function () {
  var dots = document.querySelectorAll('#rail button');
  var current = -1;
  function update() {
    var i = Math.round(window.scrollParam() * (dots.length - 1));
    if (i === current) return;
    if (current >= 0) dots[current].removeAttribute('aria-current');
    dots[i].setAttribute('aria-current', 'true');
    current = i;
  }
  dots.forEach(function (b) {
    b.addEventListener('click', function () {
      var t = b.getAttribute('data-target');
      var el = t === 'hero' ? document.querySelector('.hero') : document.getElementById(t);
      el.scrollIntoView({ behavior: 'smooth' });
    });
  });
  var queued = false;
  window.addEventListener('scroll', function () {
    if (queued) return;
    queued = true;
    requestAnimationFrame(function () { queued = false; update(); });
  }, { passive: true });
  update();
})();
