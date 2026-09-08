/* Builds assets/data/ask-index.json for the portfolio's "ask" feature.
   MiniLM runs HERE, once, offline. The site ships only quantized vectors.

   This is an offline asset generator, NOT part of the site (the site has no
   build step and no npm). Run it from any folder with node + npm available:
     npm i @xenova/transformers@2.17.2
     node tools/build-ask-index.js
   Rerun it whenever INDEX in assets/js/ask.js changes, keep the two INDEX
   copies identical, and check the calibration table it prints (in-domain
   queries should score >= ~0.65; the runtime threshold is 0.55). */
const fs = require('fs');
const path = require('path');

const OUT = require('path').join(__dirname, '..', 'assets', 'data', 'ask-index.json');
const DIMS = 128; // JL projection 384 -> 128, seeded

// mirror of INDEX in ask.js (answers + keywords)
const INDEX = [
  { k: ['rag', 'retrieval', 'pinecone', 'hallucination', 'hallucinations', 'hallucinate', 'grounding', 'grounded', 'validator', 'figures', 'embeddings', 'chunking', 'semantic', 'vector'], a: 'RAG pipelines on OpenAI and Pinecone: automated ingestion, chunking, and embeddings, semantic search with a query cache, and a post-LLM grounding validator that corrects any figure disagreeing with the retrieval layer before it reaches the user.' },
  { k: ['voice', 'call', 'calls', 'screening', 'interview', 'interviews', 'candidates', 'candidate', 'bolna', 'transcript'], a: 'Autonomous voice agents call candidates, run screening interviews, and write schema-constrained results back into the ATS: webhook-driven call lifecycle, transcript capture, structured-output extraction.' },
  { k: ['mail', 'scheduler', 'scheduling', 'idempotency', 'idempotent', 'exactly', 'once', 'lease', 'claim', 'contract', 'boundary'], a: 'The mail-scheduling agent: chat becomes a versioned command contract, and a deterministic Mongo claim/lease scheduler executes each run exactly once with per-run idempotency keys and classified retries. The LLM never sends mail.' },
  { k: ['reliability', 'reliable', 'queue', 'queues', 'bullmq', 'dead-letter', 'dlq', 'outbox', 'retries', 'retry', 'webhook', 'webhooks', 'fail', 'fails', 'failure', 'failures'], a: 'Reliability in every AI pipeline: BullMQ queues, dead-letter queues for failed LLM jobs, the transactional outbox pattern, and webhook idempotency guards.' },
  { k: ['prompt', 'prompts', 'guardrails', 'guardrail', 'system', 'templates', 'behave', 'behavior'], a: 'I author and version the system prompts, guardrails, and prompt templates governing assistant behavior across chat, recruitment, and voice workflows.' },
  { k: ['dharwin', 'ats', 'hrm', 'saas', 'lms', 'multi-tenant', 'tenant'], a: 'Dharwin: a multi-tenant ATS/HRM SaaS in production. 99 data models, 77 REST modules, 1,200+ commits in six months. Pinecone RAG chat assistants plus autonomous voice screening agents.' },
  { k: ['religence', 'pharma', 'crm', 'crawler', 'outlook', 'graph', 'leads', 'lead'], a: 'Religence: pharma lead discovery and CRM. A containerized FastAPI crawler classifies prospect sites with OpenAI structured outputs; the CRM adds verification queues, an in-app Outlook inbox over Microsoft Graph delta sync, and the mail-scheduling agent.' },
  { k: ['stack', 'skills', 'tech', 'tools', 'languages', 'technologies', 'python', 'node', 'typescript', 'fastapi', 'mongodb'], a: 'Python, FastAPI, Node.js, Express, TypeScript, MongoDB, Redis, Docker, AWS, Azure and Microsoft Graph on the backend; OpenAI, Gemini, LangChain, LlamaIndex, Pinecone on the AI side; Next.js and React up front.' },
  { k: ['experience', 'job', 'work', 'odin', 'role', 'engineer', 'title'], a: 'AI Engineer at The Odin, Jaipur, since Nov 2025. Production RAG pipelines, voice agents, and the LLM mail-scheduling agent.' },
  { k: ['hire', 'hiring', 'contact', 'reach', 'email', 'linkedin', 'whatsapp', 'available', 'open'], a: 'Open to AI engineering roles in Bengaluru or remote. Email sharmaprakhar00o07@gmail.com, or use the LinkedIn and WhatsApp links above.' },
  { k: ['resume', 'cv', 'pdf', 'download'], a: 'The Resume button in the nav downloads assets/resume.pdf.' },
  { k: ['location', 'where', 'based', 'bengaluru', 'remote', 'jaipur', 'relocate'], a: 'Based in Jaipur, open to Bengaluru or remote.' }
];

// words a recruiter/dev might type that don't literally appear in keywords
const EXTRA = `
ai ml llm llms nlp genai gpt gemini claude openai chatgpt model models agent agents agentic
autonomous automation workflow assistant chatbot bot copilot evals eval testing accuracy
truth honest lying wrong mistakes bugs fix fixing quality latency speed cost tokens costs
context window memory finetune finetuning training embedding search ranking rerank
database databases postgres sql nosql redis mongo mongodb pinecone vector vectors
docker kubernetes cloud aws azure gcp deploy deployment devops infra infrastructure
backend frontend fullstack api apis rest graphql microservices architecture systems
design scalable scale production shipped ship building built develop developer engineer
engineering software code coding programming python javascript typescript node nodejs
nextjs react fastapi express
email emails mail inbox outlook calendar schedule scheduled sending send sent
phone telephony speech audio talking speaking caller dialer transcripts
recruit recruiting recruiter recruitment hr talent hiring candidates applicant applicants
job jobs role roles position opening team startup company salary compensation
years experience senior junior remote onsite hybrid relocate relocation visa
bengaluru bangalore jaipur india indian
github portfolio website resume cv linkedin whatsapp contact reach connect
reliability robust safety safe guardrail guarded deterministic idempotent
queue queues worker workers cron jobs retries backoff failures errors crash
hallucinate hallucinating grounded grounding validate validation verified
prompt prompting prompts instructions
crawler crawling scrape scraping classify classification enrichment
pharma medical legal law documents drafting generator
saas multitenant tenant platform lms ats crm
webhook webhooks realtime websocket socketio livekit webrtc streaming
structured schema json pydantic function tools tooling mcp langchain llamaindex
huggingface transformers pytorch
`.trim().split(/\s+/);

// function words poison the average: they sit in a generic region that
// correlates with every entry. Content words only, in vocab AND at runtime
// (runtime gets this for free: stopwords are simply not in the shipped vocab).
const STOP = new Set(`the a an and or of to in on for with at by from up into as is are was were be
been being do does did done have has had having i you he she it we they me him her them my your his
its our their this that these those there here what which who whom whose when where why how all any
both each few more most other some such no nor not only own same so than too very can will just
should now then once about above after again against before below between during out over under
while since until also if but because while through
tell says say said like want wants need needs know knows make makes get gets use uses using
one two three every never always ever much many lot really
me my mine ask asked question questions
above never every each per run runs`.trim().split(/\s+/));

const toks = (s) => s.toLowerCase().split(/[^a-z0-9+-]+/)
  .filter((w) => w.length > 1 && !/^\d+$/.test(w) && !STOP.has(w));

const vocab = new Set(EXTRA.map((w) => w.toLowerCase()).filter((w) => !STOP.has(w)));
INDEX.forEach((e) => { e.k.forEach((w) => { if (!STOP.has(w)) vocab.add(w); }); toks(e.a).forEach((w) => vocab.add(w)); });

// each entry's matchable word cloud: its keywords plus its answer's content words
const entryWords = INDEX.map((e) => {
  const s = new Set(e.k.filter((w) => !STOP.has(w)));
  toks(e.a).forEach((w) => s.add(w));
  return [...s];
});

// seeded JL projection
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(42);
function gauss() {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

(async () => {
  const { pipeline } = await import('@xenova/transformers');
  const embed = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { quantized: true });

  async function vec(text) {
    const out = await embed(text, { pooling: 'mean', normalize: true });
    return Array.from(out.data);
  }

  const words = [...vocab].sort();
  console.log('vocab size:', words.length);

  const first = await vec(words[0]);
  const SRC = first.length;
  const P = [];
  for (let i = 0; i < DIMS; i++) {
    const row = new Float64Array(SRC);
    for (let j = 0; j < SRC; j++) row[j] = gauss();
    P.push(row);
  }
  function project(v) {
    const o = new Float64Array(DIMS);
    for (let i = 0; i < DIMS; i++) {
      let s = 0;
      const row = P[i];
      for (let j = 0; j < SRC; j++) s += row[j] * v[j];
      o[i] = s;
    }
    let n = 0;
    for (let i = 0; i < DIMS; i++) n += o[i] * o[i];
    n = Math.sqrt(n) || 1;
    for (let i = 0; i < DIMS; i++) o[i] /= n;
    return o;
  }
  function q8(v) {
    let m = 0;
    for (const x of v) m = Math.max(m, Math.abs(x));
    const s = 127 / (m || 1);
    return Buffer.from([...v].map((x) => Math.max(0, Math.min(255, Math.round(x * s) + 128)))).toString('base64');
  }

  const wordVecs = {};   // projected float (for calibration)
  const wordsOut = {};   // quantized b64
  for (const w of words) {
    const p = project(await vec(w));
    wordVecs[w] = p;
    wordsOut[w] = q8(p);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify({
    note: 'Precomputed offline with Xenova/all-MiniLM-L6-v2 (quantized), JL-projected 384->128, int8. The browser only does cosine similarity: score(entry) = mean over query content words of max cosine to the entry word cloud.',
    dims: DIMS, words: wordsOut, entries: entryWords
  }));
  console.log('wrote', OUT, Math.round(fs.statSync(OUT).size / 1024) + 'KB');

  // ---- calibration: emulate the browser engine (soft keyword match) ----
  function browserAnswer(q) {
    const ts = q.toLowerCase().split(/[^a-z0-9+-]+/).filter(Boolean);
    const qv = [];
    for (const t of ts) {
      const v = wordVecs[t] || wordVecs[t.replace(/s$/, '')] || wordVecs[t + 's'];
      if (v) qv.push(v);
    }
    if (!qv.length) return { best: -1, i: -1 };
    let best = -1, bi = -1;
    entryWords.forEach((ws, j) => {
      let total = 0;
      for (const v of qv) {
        let mx = -1;
        for (const w of ws) {
          const ev = wordVecs[w];
          let d = 0;
          for (let i = 0; i < DIMS; i++) d += ev[i] * v[i];
          if (d > mx) mx = d;
        }
        total += mx;
      }
      const score = total / qv.length;
      if (score > best) { best = score; bi = j; }
    });
    return { best, i: bi };
  }

  const tests = [
    'how do you stop hallucinations',
    'phone interviews with candidates',
    'what is your tech stack',
    'where do you live',
    'are you looking for a job',
    'tell me about the email agent',
    'what happens when a job fails',
    'do you know react',
    'kubernetes experience',
    'automating recruitment with ai',
    'pizza recipe',            // off-topic
    'weather in paris today',  // off-topic
    'best football player'     // off-topic
  ];
  console.log('\ncalibration (query -> best entry, cosine):');
  for (const t of tests) {
    const r = browserAnswer(t);
    console.log(`  ${r.best.toFixed(3)}  #${r.i}  ${t}`);
  }
})().catch((e) => { console.error(e); process.exit(1); });
