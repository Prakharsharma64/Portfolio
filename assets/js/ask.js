/* Feature: deterministic Q&A over the page's real facts. Two engines, no LLM:
   1. embedding search: MiniLM vectors precomputed offline and shipped as a
      static JSON asset (assets/data/ask-index.json); the browser only does
      cosine similarity. Loads lazily on first focus; nothing leaves the tab.
   2. keyword overlap: the original engine, instant, and the fallback whenever
      the vectors are missing, still loading, or score below threshold. */
(function () {
  var form = document.getElementById('ask-form');
  if (!form) return;
  var input = document.getElementById('ask-in');
  var out = document.getElementById('ask-out');
  var tag = document.getElementById('ask-tag');

  /* every answer restates copy already on this page */
  var INDEX = [
    {
      k: ['rag', 'retrieval', 'pinecone', 'hallucination', 'hallucinations', 'hallucinate', 'grounding', 'grounded', 'validator', 'figures', 'embeddings', 'chunking', 'semantic', 'vector'],
      a: 'RAG pipelines on OpenAI and Pinecone: automated ingestion, chunking, and embeddings, semantic search with a query cache, and a post-LLM grounding validator that corrects any figure disagreeing with the retrieval layer before it reaches the user.'
    },
    {
      k: ['voice', 'call', 'calls', 'screening', 'interview', 'interviews', 'candidates', 'candidate', 'bolna', 'transcript'],
      a: 'Autonomous voice agents call candidates, run screening interviews, and write schema-constrained results back into the ATS: webhook-driven call lifecycle, transcript capture, structured-output extraction.'
    },
    {
      k: ['mail', 'scheduler', 'scheduling', 'idempotency', 'idempotent', 'exactly', 'once', 'lease', 'claim', 'contract', 'boundary'],
      a: 'The mail-scheduling agent: chat becomes a versioned command contract, and a deterministic Mongo claim/lease scheduler executes each run exactly once with per-run idempotency keys and classified retries. The LLM never sends mail.'
    },
    {
      k: ['reliability', 'reliable', 'queue', 'queues', 'bullmq', 'dead-letter', 'dlq', 'outbox', 'retries', 'retry', 'webhook', 'webhooks', 'fail', 'fails', 'failure', 'failures'],
      a: 'Reliability in every AI pipeline: BullMQ queues, dead-letter queues for failed LLM jobs, the transactional outbox pattern, and webhook idempotency guards.'
    },
    {
      k: ['prompt', 'prompts', 'guardrails', 'guardrail', 'system', 'templates', 'behave', 'behavior'],
      a: 'I author and version the system prompts, guardrails, and prompt templates governing assistant behavior across chat, recruitment, and voice workflows.'
    },
    {
      k: ['dharwin', 'ats', 'hrm', 'saas', 'lms', 'multi-tenant', 'tenant'],
      a: 'Dharwin: a multi-tenant ATS/HRM SaaS in production. 99 data models, 77 REST modules, 1,200+ commits in six months. Pinecone RAG chat assistants plus autonomous voice screening agents.'
    },
    {
      k: ['religence', 'pharma', 'crm', 'crawler', 'outlook', 'graph', 'leads', 'lead'],
      a: 'Religence: pharma lead discovery and CRM. A containerized FastAPI crawler classifies prospect sites with OpenAI structured outputs; the CRM adds verification queues, an in-app Outlook inbox over Microsoft Graph delta sync, and the mail-scheduling agent.'
    },
    {
      k: ['stack', 'skills', 'tech', 'tools', 'languages', 'technologies', 'python', 'node', 'typescript', 'fastapi', 'mongodb'],
      a: 'Python, FastAPI, Node.js, Express, TypeScript, MongoDB, Redis, Docker, AWS, Azure and Microsoft Graph on the backend; OpenAI, Gemini, LangChain, LlamaIndex, Pinecone on the AI side; Next.js and React up front.'
    },
    {
      k: ['experience', 'job', 'work', 'odin', 'role', 'engineer', 'title'],
      a: 'AI Engineer at The Odin, Jaipur, since Nov 2025. Production RAG pipelines, voice agents, and the LLM mail-scheduling agent.'
    },
    {
      k: ['hire', 'hiring', 'contact', 'reach', 'email', 'linkedin', 'whatsapp', 'available', 'open'],
      a: 'Open to AI engineering roles in Bengaluru or remote. Email sharmaprakhar00o07@gmail.com, or use the LinkedIn and WhatsApp links above.'
    },
    {
      k: ['resume', 'cv', 'pdf', 'download'],
      a: 'The Resume button in the nav downloads assets/resume.pdf.'
    },
    {
      k: ['location', 'where', 'based', 'bengaluru', 'remote', 'jaipur', 'relocate'],
      a: 'Based in Jaipur, open to Bengaluru or remote.'
    }
  ];

  var FALLBACK = 'No indexed answer. Ask the human: sharmaprakhar00o07@gmail.com';
  var THRESHOLD = 0.55;

  /* ---------- engine 1: precomputed embeddings ---------- */
  var VEC = null;
  var loading = false;

  /* vectors are stored as base64 int8 (byte = component + 128); cosine is
     scale-invariant, so normalizing after decode restores full precision */
  function b64ToVec(b64) {
    var bin = atob(b64);
    var v = new Float32Array(bin.length);
    var norm = 0;
    for (var i = 0; i < bin.length; i++) {
      var x = bin.charCodeAt(i) - 128;
      v[i] = x;
      norm += x * x;
    }
    norm = Math.sqrt(norm) || 1;
    for (i = 0; i < v.length; i++) v[i] /= norm;
    return v;
  }

  function loadVectors() {
    if (loading || VEC || !window.fetch) return;
    loading = true;
    fetch('./assets/data/ask-index.json')
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.words || !d.entries || d.entries.length !== INDEX.length) return;
        var words = {};
        Object.keys(d.words).forEach(function (w) { words[w] = b64ToVec(d.words[w]); });
        /* each entry ships as a word cloud; resolve it to vectors once */
        var entries = d.entries.map(function (ws) {
          return ws.map(function (w) { return words[w]; }).filter(Boolean);
        });
        VEC = { words: words, entries: entries };
        if (tag) tag.textContent = 'embedding search, no LLM, no server';
      })
      .catch(function () { /* keyword engine keeps working */ });
  }
  input.addEventListener('focus', loadVectors, { once: true });

  function toks(q) {
    return q.toLowerCase().split(/[^a-z0-9+-]+/).filter(Boolean);
  }

  function wordVec(t) {
    var w = VEC.words;
    return w[t] || w[t.replace(/s$/, '')] || w[t + 's'] || null;
  }

  /* soft keyword match: score(entry) = mean over the query's known words of
     the max cosine to that entry's word cloud. Synonyms land ("phone" finds
     "call"), function words are simply absent from the vocabulary, and a
     query with no known words falls through to the keyword engine */
  function semantic(q) {
    if (!VEC) return null;
    var qv = [];
    toks(q).forEach(function (t) {
      var v = wordVec(t);
      if (v) qv.push(v);
    });
    if (!qv.length) return null;
    var best = -1, bi = -1;
    VEC.entries.forEach(function (ws, j) {
      var total = 0;
      qv.forEach(function (v) {
        var mx = -1;
        ws.forEach(function (ev) {
          var d = 0;
          for (var i = 0; i < ev.length; i++) d += ev[i] * v[i];
          if (d > mx) mx = d;
        });
        total += mx;
      });
      var score = total / qv.length;
      if (score > best) { best = score; bi = j; }
    });
    if (best < THRESHOLD) return null;
    return { text: INDEX[bi].a, meta: 'engine: precomputed MiniLM vectors, score ' + best.toFixed(2) };
  }

  /* ---------- engine 2: keyword overlap ---------- */
  function keyword(q) {
    var tokens = toks(q);
    if (!tokens.length) return null;
    var best = null, bestScore = 0;
    INDEX.forEach(function (entry) {
      var score = 0;
      tokens.forEach(function (t) { if (entry.k.indexOf(t) >= 0) score++; });
      if (score > bestScore) { bestScore = score; best = entry; }
    });
    if (!best) return null;
    return { text: best.a, meta: 'engine: keyword overlap' };
  }

  /* shared entry point; the terminal's `ask` command reuses it */
  function answer(q) {
    return semantic(q) || keyword(q) || { text: FALLBACK, meta: null };
  }
  window.askPortfolio = answer;

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!toks(input.value).length) return;
    var r = answer(input.value);
    out.textContent = '';
    var p = document.createElement('p');
    p.textContent = r.text;
    out.appendChild(p);
    if (r.meta) {
      var m = document.createElement('p');
      m.className = 'ask__meta';
      m.textContent = r.meta;
      out.appendChild(m);
    }
  });
})();
