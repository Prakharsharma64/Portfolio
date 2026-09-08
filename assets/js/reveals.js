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
  anime.set(['.hero h1', '.hero__sub', '.hero__cta', '.hero__hint'], { opacity: 0, translateY: 16 });
  anime.set('.diagram', { opacity: 0 });
  document.querySelectorAll('.d-flow').forEach(function (p) {
    var l = p.getTotalLength();
    p.style.strokeDasharray = l;
    p.style.strokeDashoffset = l;
  });

  /* ============ branded preloader: bar tracks real page load ============ */
  var bar = document.querySelector('.loader__bar');
  var loaderDone = false;

  /* the amber word settles out of raw glyphs; width is locked first so the
     headline never reflows, and the h1's accessible name never changes */
  function decodeWord() {
    var h1 = document.querySelector('.hero h1');
    var em = h1 && h1.querySelector('em');
    if (!em) return;
    h1.setAttribute('aria-label', h1.textContent);
    var word = em.textContent;
    var glyphs = '<>[]{}#$%&*+=/\\|~^';
    em.style.display = 'inline-block';
    em.style.width = em.offsetWidth + 'px';
    var start = null;
    var DUR = 620;
    requestAnimationFrame(function scramble(ts) {
      if (start === null) start = ts;
      var p = (ts - start) / DUR;
      if (p >= 1) {
        em.textContent = word;
        em.style.width = '';
        em.style.display = '';
        return;
      }
      var settled = Math.floor(p * word.length);
      var s = word.slice(0, settled);
      for (var i = settled; i < word.length; i++) {
        s += glyphs[Math.floor(Math.random() * glyphs.length)];
      }
      em.textContent = s;
      requestAnimationFrame(scramble);
    });
  }

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
      .add({
        targets: '.hero h1', opacity: [0, 1], translateY: [16, 0], duration: 700,
        easing: 'cubicBezier(.16,1,.3,1)', begin: decodeWord
      }, '-=250')
      .add({ targets: '.hero__sub', opacity: [0, 1], translateY: [16, 0], duration: 600, easing: 'cubicBezier(.16,1,.3,1)' }, '-=520')
      .add({ targets: '.hero__cta', opacity: [0, 1], translateY: [16, 0], duration: 600, easing: 'cubicBezier(.16,1,.3,1)' }, '-=460')
      .add({ targets: '.hero__hint', opacity: [0, 1], translateY: [16, 0], duration: 600, easing: 'cubicBezier(.16,1,.3,1)' }, '-=420')
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

  /* the bar completes when the page has genuinely loaded AND the 3D world has
     rendered its first frame; a blocked CDN or slow GPU only ever costs the
     grace period, and the hard cap below never moves */
  var pageLoaded = document.readyState === 'complete';
  var worldReady = false;
  function maybeExit() { if (pageLoaded && worldReady) exitLoader(); }
  window.addEventListener('load', function () { pageLoaded = true; maybeExit(); });
  window.addEventListener('world-ready', function () { worldReady = true; maybeExit(); }, { once: true });
  setTimeout(function () { worldReady = true; maybeExit(); }, 1800); // world may be absent
  setTimeout(exitLoader, 2600); // never hold the page hostage
  maybeExit();

  /* ============ scroll reveals, once per element ============ */
  var targets = document.querySelectorAll(
    '.feature, .xp__meta, .xp__body p, .skillsfile, .contact__inner'
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

  /* the "Also shipped" cards cascade as one group instead of popping solo */
  var gridItems = document.querySelectorAll('.more__grid article');
  gridItems.forEach(function (el) { el.classList.add('reveal-target'); });
  anime.set(gridItems, { opacity: 0, translateY: 18 });
  var gio = new IntersectionObserver(function (entries) {
    entries.forEach(function (e) {
      if (e.isIntersecting) {
        anime({
          targets: gridItems, opacity: [0, 1], translateY: [18, 0],
          duration: 650, delay: anime.stagger(90), easing: 'cubicBezier(.16,1,.3,1)'
        });
        gio.disconnect();
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  var moreGrid = document.querySelector('.more__grid');
  if (moreGrid) gio.observe(moreGrid);

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
    gio.disconnect();
    anime.set(targets, { opacity: 1, translateY: 0 });
    anime.set(gridItems, { opacity: 1, translateY: 0 });
    document.querySelectorAll('h2').forEach(function (h) { h.classList.add('seen'); });
    if (window.pulseAnim) window.pulseAnim.pause();
    pb.style.transform = '';
    if (diagram) diagram.style.transform = '';
  };
});
