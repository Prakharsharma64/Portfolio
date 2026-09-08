/* Feature: Ctrl+K / Cmd+K command palette. No libraries. */
(function () {
  var pal = document.getElementById('pal');
  var input = document.getElementById('pal-in');
  var list = document.getElementById('pal-list');
  var lastFocus = null;
  var active = 0;
  var shown = [];

  function motionOff() {
    try { return localStorage.getItem('motion-off') === '1'; } catch (e) { return false; }
  }

  function scrollBehavior() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    return (reduce || motionOff()) ? 'auto' : 'smooth';
  }

  function fly(name) {
    return function () {
      closePal();
      var el = name === 'hero' ? document.querySelector('.hero') : document.getElementById(name);
      el.scrollIntoView({ behavior: scrollBehavior() });
    };
  }

  var actions = [
    { label: 'Fly to Hero', run: fly('hero') },
    { label: 'Fly to Work', run: fly('work') },
    { label: 'Fly to Experience', run: fly('experience') },
    { label: 'Fly to Skills', run: fly('skills') },
    { label: 'Fly to Contact', run: fly('contact') },
    {
      label: 'Open terminal', run: function () {
        closePal();
        if (window.openTerminal) window.openTerminal();
      }
    },
    {
      label: 'Download resume', run: function () {
        var a = document.createElement('a');
        a.href = './assets/resume.pdf';
        a.download = '';
        document.body.appendChild(a);
        a.click();
        a.remove();
        closePal();
      }
    },
    {
      label: 'Copy email', run: function (li) {
        navigator.clipboard.writeText('sharmaprakhar00o07@gmail.com').then(
          function () { note(li, 'copied'); },
          function () { note(li, 'sharmaprakhar00o07@gmail.com'); }
        );
      }
    },
    { label: 'Open GitHub (work)', url: 'https://github.com/Prakhartheodin' },
    { label: 'Open GitHub (personal)', url: 'https://github.com/Prakharsharma64' },
    { label: 'Open LinkedIn', url: 'https://www.linkedin.com/in/prakhar-sharma-42584723a/' },
    {
      label: 'Toggle motion', run: function (li) {
        var off = !motionOff();
        try { localStorage.setItem('motion-off', off ? '1' : '0'); } catch (e) { }
        if (off) {
          if (window.killWorld) window.killWorld();
          if (window.killReveals) window.killReveals();
          if (window.killWork) window.killWork();
          note(li, 'motion off');
        } else {
          location.reload();
        }
      }
    }
  ];

  function note(li, text) {
    var s = li.querySelector('.pal__note') || li.appendChild(document.createElement('span'));
    s.className = 'pal__note';
    s.setAttribute('role', 'status');
    s.textContent = text;
    setTimeout(function () { s.remove(); }, 1400);
  }

  /* subsequence match: every query char appears in order */
  function fuzzy(q, s) {
    q = q.toLowerCase(); s = s.toLowerCase();
    var i = 0;
    for (var j = 0; j < s.length && i < q.length; j++) if (s[j] === q[i]) i++;
    return i === q.length;
  }

  function render(q) {
    shown = actions.filter(function (a) { return !q || fuzzy(q, a.label); });
    list.textContent = '';
    active = 0;
    shown.forEach(function (a, i) {
      var li = document.createElement('li');
      li.id = 'pal-i-' + i;
      li.setAttribute('role', 'option');
      li.textContent = a.label;
      li.addEventListener('click', function () { run(a, li); });
      list.appendChild(li);
    });
    if (!shown.length) {
      var d = document.createElement('li');
      d.className = 'pal__empty';
      d.setAttribute('role', 'option');
      d.setAttribute('aria-disabled', 'true');
      d.textContent = 'No matching command';
      list.appendChild(d);
    }
    mark();
  }

  function mark() {
    Array.prototype.forEach.call(list.children, function (li, i) {
      li.classList.toggle('act', i === active && shown.length > 0);
      if (shown.length) li.setAttribute('aria-selected', i === active ? 'true' : 'false');
    });
    /* the combobox input holds focus, so it carries aria-activedescendant */
    if (shown.length) input.setAttribute('aria-activedescendant', 'pal-i-' + active);
    else input.removeAttribute('aria-activedescendant');
    var el = list.children[active];
    if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
  }

  function run(a, li) {
    if (a.url) {
      window.open(a.url, '_blank', 'noopener');
      closePal();
    } else {
      a.run(li);
    }
  }

  function openPal() {
    if (window.closeTerminal) window.closeTerminal();
    lastFocus = document.activeElement;
    pal.hidden = false;
    input.value = '';
    render('');
    input.focus();
  }

  function closePal() {
    if (pal.hidden) return;
    input.blur();
    input.removeAttribute('aria-activedescendant');
    pal.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.closePalette = closePal;

  /* the visible shortcut label defaults to "Ctrl K"; swap to the command
     glyph on Mac-like platforms and keep the accessible name in sync */
  var opener = document.getElementById('pal-open');
  if (/Mac|iPhone|iPad|iPod/.test(navigator.platform)) {
    opener.textContent = '⌘K';
    opener.setAttribute('aria-label', 'Open command palette (⌘K)');
  }

  input.addEventListener('input', function () { render(input.value.trim()); });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { e.preventDefault(); if (active < shown.length - 1) { active++; mark(); } }
    else if (e.key === 'ArrowUp') { e.preventDefault(); if (active > 0) { active--; mark(); } }
    else if (e.key === 'Enter') { if (shown[active]) run(shown[active], list.children[active]); }
    else if (e.key === 'Tab') { e.preventDefault(); }
  });

  pal.addEventListener('click', function (e) { if (e.target === pal) closePal(); });

  document.getElementById('pal-open').addEventListener('click', openPal);

  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      pal.hidden ? openPal() : closePal();
    } else if (e.key === 'Escape' && !pal.hidden) {
      closePal();
    }
  });
})();
