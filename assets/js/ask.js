/* Feature: deterministic Q&A over the page's real facts. Token overlap, no LLM. */
(function () {
  var form = document.getElementById('ask-form');
  if (!form) return;
  var input = document.getElementById('ask-in');
  var out = document.getElementById('ask-out');

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

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var tokens = input.value.toLowerCase().split(/[^a-z0-9+-]+/).filter(Boolean);
    if (!tokens.length) return;
    var best = null, bestScore = 0;
    INDEX.forEach(function (entry) {
      var score = 0;
      tokens.forEach(function (t) { if (entry.k.indexOf(t) >= 0) score++; });
      if (score > bestScore) { bestScore = score; best = entry; }
    });
    out.textContent = best ? best.a
      : 'No indexed answer. Ask the human: sharmaprakhar00o07@gmail.com';
  });
})();
