/* Feature: latest public push across both GitHub accounts, shown in the
   footer and as the chip beside the Work heading. Any failure, rate limit,
   or empty result leaves both untouched. */
(function () {
  var el = document.getElementById('heartbeat');
  var chip = document.getElementById('heartbeat-work');
  if ((!el && !chip) || !window.fetch || !window.AbortController) return;

  function rel(date) {
    var s = (Date.now() - date.getTime()) / 1000;
    var u = s < 3600 ? [s / 60, 'minute'] : s < 86400 ? [s / 3600, 'hour'] : [s / 86400, 'day'];
    var n = Math.max(1, Math.round(u[0]));
    return n + ' ' + u[1] + (n === 1 ? '' : 's') + ' ago';
  }

  window.addEventListener('load', function () {
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 4000);
    Promise.all(['Prakhartheodin', 'Prakharsharma64'].map(function (u) {
      return fetch('https://api.github.com/users/' + u + '/events/public', { signal: ctrl.signal })
        .then(function (r) { return r.ok ? r.json() : []; })
        .catch(function () { return []; });
    })).then(function (lists) {
      clearTimeout(timer);
      var pushes = [].concat.apply([], lists).filter(function (e) { return e && e.type === 'PushEvent'; });
      if (!pushes.length) return;
      pushes.sort(function (a, b) { return new Date(b.created_at) - new Date(a.created_at); });
      var repo = pushes[0].repo.name.split('/')[1];
      var when = rel(new Date(pushes[0].created_at));
      if (el) el.textContent = 'last commit: ' + repo + ', ' + when;
      if (chip) chip.textContent = 'last push: ' + repo + ', ' + when;
    });
  });
})();
