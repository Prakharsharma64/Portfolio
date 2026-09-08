(function () {
  var term = document.getElementById('term');
  var out = document.getElementById('term-out');
  var input = document.getElementById('term-in');
  var lastFocus = null;

  /* all data mirrors the page copy; nothing invented */
  var projects = [
    ['Dharwin', 'https://github.com/Developerodin/dharwinone_backend'],
    ['Religence', 'https://github.com/Prakhartheodin/religence-backend'],
    ['PROWPLUS', 'https://github.com/Developerodin/Project-help-support'],
    ['Legal document generator', 'https://github.com/Prakharsharma64/Legal-Document-Generator']
  ];
  var stack = [
    'LLM and generative AI: OpenAI API (GPT-4o), Google Gemini, LangChain, LlamaIndex, HuggingFace Transformers, fine-tuning and evaluation, AI agents, function calling, structured outputs, prompt engineering, guardrails',
    'Retrieval and RAG: RAG pipelines, Pinecone, vector embeddings, chunking and ingestion, semantic search, query caching',
    'Backend and cloud: Python, FastAPI, Node.js, Express, TypeScript, MongoDB, Redis, REST APIs, microservices, Docker, AWS, Azure and Microsoft Graph, CI/CD',
    'Reliability and real-time: dead-letter queues, transactional outbox, idempotency, distributed schedulers, RBAC, audit logging, Bolna voice AI, LiveKit, WebRTC, Socket.IO, Next.js, React'
  ];

  function print(text, cls) {
    var d = document.createElement('div');
    if (cls) d.className = cls;
    d.textContent = text;
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }

  function printLink(label, href) {
    var d = document.createElement('div');
    if (label) d.appendChild(document.createTextNode(label + '  '));
    var a = document.createElement('a');
    a.href = href;
    a.textContent = href.replace(/^https:\/\/|^mailto:/, '');
    if (href.indexOf('http') === 0) { a.target = '_blank'; a.rel = 'noopener'; }
    d.appendChild(a);
    out.appendChild(d);
    out.scrollTop = out.scrollHeight;
  }

  function openTerm() {
    if (window.closePalette) window.closePalette();
    lastFocus = document.activeElement;
    term.hidden = false;
    if (!out.childNodes.length) print("type 'help' for commands");
    input.focus();
  }

  function closeTerm() {
    if (term.hidden) return;
    input.blur();
    term.hidden = true;
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  window.closeTerminal = closeTerm;
  window.openTerminal = openTerm;

  function scrollBehavior() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var off = false;
    try { off = localStorage.getItem('motion-off') === '1'; } catch (e) { }
    return (reduce || off) ? 'auto' : 'smooth';
  }

  function fly(name) {
    var el = name === 'hero' ? document.querySelector('.hero') : document.getElementById(name);
    if (!el) { print("unknown station: " + name + ". stations: hero, work, experience, skills, contact"); return; }
    el.scrollIntoView({ behavior: scrollBehavior() });
    print('flying to ' + name);
  }

  function run(raw) {
    var cmd = raw.toLowerCase().replace(/^prakhar\s+/, '').replace(/^--/, '');
    if (cmd === 'help') {
      ['help            this list',
        'projects        shipped work, with GitHub links',
        'stack           what I build with',
        'contact         email, LinkedIn, WhatsApp',
        'resume          download the PDF',
        'whoami          one line',
        'fly <station>   hero | work | experience | skills | contact',
        'clear           wipe the log',
        'exit            close the terminal'].forEach(function (l) { print(l); });
    } else if (cmd === 'projects') {
      projects.forEach(function (p) { printLink(p[0], p[1]); });
    } else if (cmd === 'stack') {
      stack.forEach(function (s) { print(s); });
    } else if (cmd === 'contact') {
      printLink('email    ', 'mailto:sharmaprakhar00o07@gmail.com');
      printLink('LinkedIn ', 'https://www.linkedin.com/in/prakhar-sharma-42584723a/');
      printLink('WhatsApp ', 'https://wa.me/918755887760');
    } else if (cmd === 'resume') {
      var a = document.createElement('a');
      a.href = './assets/resume.pdf';
      a.download = '';
      document.body.appendChild(a);
      a.click();
      a.remove();
      print('downloading resume.pdf');
    } else if (cmd === 'whoami') {
      print('AI Engineer at The Odin. I make LLMs behave in production.');
    } else if (cmd.indexOf('fly ') === 0) {
      fly(cmd.slice(4).trim());
    } else if (cmd === 'clear') {
      out.textContent = '';
    } else if (cmd === 'sudo hire prakhar') {
      print('permission granted.');
      location.href = 'mailto:sharmaprakhar00o07@gmail.com';
    } else if (cmd === 'exit') {
      closeTerm();
    } else {
      print("command not found: " + raw + ". try 'help'");
    }
  }

  input.addEventListener('keydown', function (e) {
    if (e.key !== 'Enter') return;
    var raw = input.value.trim();
    input.value = '';
    if (!raw) return;
    print('> ' + raw, 'term-echo');
    run(raw);
  });

  document.getElementById('term-open').addEventListener('click', openTerm);

  /* Ctrl+backquote: a bare printable key would violate WCAG 2.1.4
     (speech input and tremor users can fire it accidentally) */
  document.addEventListener('keydown', function (e) {
    var tag = document.activeElement && document.activeElement.tagName;
    if ((e.key === '`' || e.key === '~') && e.ctrlKey && tag !== 'INPUT' && tag !== 'TEXTAREA') {
      e.preventDefault();
      term.hidden ? openTerm() : closeTerm();
    } else if (e.key === 'Escape' && !term.hidden) {
      closeTerm();
    }
  });

  /* keep Tab inside the dialog while it is open */
  term.addEventListener('keydown', function (e) {
    if (e.key !== 'Tab') return;
    var f = term.querySelectorAll('a, input');
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
