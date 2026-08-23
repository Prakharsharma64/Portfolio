document.addEventListener('DOMContentLoaded', function () {
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasAnime = typeof anime !== 'undefined';
  try { reduce = reduce || localStorage.getItem('motion-off') === '1'; } catch (e) { }

  function clearLoader() {
    document.documentElement.classList.remove('js-loading');
  }

  /* no motion available: show everything immediately */
  if (reduce || !hasAnime) {
    clearLoader();
    document.querySelectorAll('h2').forEach(function (h) { h.classList.add('seen'); });
    return;
  }

  /* ============ hidden initial states ============ */
  anime.set(['.hero h1', '.hero__sub', '.hero__cta'], { opacity: 0, translateY: 16 });
  anime.set('.diagram', { opacity: 0 });
  document.querySelectorAll('.d-flow').forEach(function (p) {
    var l = p.getTotalLength();
    p.style.strokeDasharray = l;
    p.style.strokeDashoffset = l;
  });

  /* ============ branded preloader: bar tracks real page load ============ */
  var bar = document.querySelector('.loader__bar');
  var loaderDone = false;

  // creep while assets genuinely load
  var creep = anime({
    targets: bar, scaleX: [0, 0.8], duration: 1600, easing: 'easeOutQuad'
  });

  function exitLoader() {
    if (loaderDone) return;
    loaderDone = true;
    creep.pause();
    anime.timeline()
      .add({ targets: bar, scaleX: 1, duration: 220, easing: 'easeOutQuad' })
      .add({
        targets: '#loader', translateY: '-100%', duration: 650,
        easing: 'cubicBezier(.7,0,.3,1)',
        complete: function () {
          document.getElementById('loader').style.display = 'none';
          clearLoader();
        }
      }, '+=80')
      .add({ targets: '.hero h1', opacity: [0, 1], translateY: [16, 0], duration: 700, easing: 'cubicBezier(.16,1,.3,1)' }, '-=250')
      .add({ targets: '.hero__sub', opacity: [0, 1], translateY: [16, 0], duration: 600, easing: 'cubicBezier(.16,1,.3,1)' }, '-=520')
      .add({ targets: '.hero__cta', opacity: [0, 1], translateY: [16, 0], duration: 600, easing: 'cubicBezier(.16,1,.3,1)' }, '-=460')
      .add({ targets: '.diagram', opacity: [0, 1], duration: 700, easing: 'easeOutQuad' }, '-=350')
      .add({
        targets: '.d-flow', strokeDashoffset: 0, duration: 700,
        delay: anime.stagger(140), easing: 'easeInOutSine'
      }, '-=400');

    // the pulse: one request travelling the pipeline, forever
    // (pipeline.js pauses it while a simulated run plays)
    window.pulseAnim = anime({
      targets: '.d-pulse',
      translateY: [0, 316],
      opacity: [
        { value: 1, duration: 250 },
        { value: 1, duration: 2300 },
        { value: 0, duration: 450 }
      ],
      duration: 3000,
      delay: 3400,
      loop: true,
      easing: 'linear'
    });
  }

  if (document.readyState === 'complete') { exitLoader(); }
  else { window.addEventListener('load', exitLoader); }
  setTimeout(exitLoader, 2600); // never hold the page hostage

  /* ============ scroll reveals, once per element ============ */
  var targets = document.querySelectorAll(
    '.feature, .more__grid article, .xp__meta, .xp__body p, .skills__row, .contact__inner'
  );
  targets.forEach(function (el) { el.classList.add('reveal-target'); });
  anime.set(targets, { opacity: 0, translateY: 18 });
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        anime({
          targets: e.target, opacity: [0, 1], translateY: [18, 0],
          duration: 650, easing: 'cubicBezier(.16,1,.3,1)'
        });
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  targets.forEach(function (t) { io.observe(t); });

  /* section heading underlines */
  var h2io = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) { e.target.classList.add('seen'); h2io.unobserve(e.target); }
    });
  }, { threshold: 0.6 });
  document.querySelectorAll('h2').forEach(function (h) { h2io.observe(h); });

  /* ============ scroll-driven ui: progress bar + diagram drift ============ */
  var pb = document.getElementById('progress');
  var diagram = document.querySelector('.diagram');
  var hero = document.querySelector('.hero');
  var uiDead = false;
  (function uiTick() {
    if (uiDead) return;
    requestAnimationFrame(uiTick);
    if (document.hidden) return;
    var doc = document.documentElement;
    var max = doc.scrollHeight - window.innerHeight;
    pb.style.transform = 'scaleX(' + (max > 0 ? window.scrollY / max : 0) + ')';
    var heroH = hero.offsetHeight || 1;
    if (window.scrollY < heroH && diagram) {
      diagram.style.transform = 'translateY(' + (window.scrollY * 0.08) + 'px)';
    }
  })();

  /* palette's motion toggle: stop everything, show everything, like reduced motion */
  window.killReveals = function () {
    uiDead = true;
    io.disconnect();
    h2io.disconnect();
    anime.set(targets, { opacity: 1, translateY: 0 });
    document.querySelectorAll('h2').forEach(function (h) { h.classList.add('seen'); });
    if (window.pulseAnim) window.pulseAnim.pause();
    pb.style.transform = '';
    if (diagram) diagram.style.transform = '';
  };
});
