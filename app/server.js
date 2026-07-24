import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

import { q, migrate } from './src/db.js';
import {
  registerUser, loginUser, createSession, getSession, destroySession,
  parseCookies, sessionCookie, clearCookie, requireAuth,
} from './src/auth.js';
import { interviewTurn } from './src/interview.js';
import { runPipeline } from './src/pipeline.js';
import { runEditPipeline } from './src/editdeck.js';
import { assemble } from './src/assemble.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = process.env.PORT || 4400;
const MAX_BODY = 25 * 1024 * 1024;

/* ================= util http ================= */
function sendJson(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject({ status: 413, message: 'corpo excede 25 MB' }); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); }
      catch { reject({ status: 400, message: 'JSON inválido' }); }
    });
    req.on('error', (e) => reject({ status: 400, message: e.message }));
  });
}
const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
};
function serveStatic(res, rootDir, rel) {
  const root = path.resolve(rootDir);
  const target = path.resolve(rootDir, '.' + rel);
  if (target !== root && !target.startsWith(root + path.sep)) return sendJson(res, 403, { error: 'acesso negado' });
  fs.readFile(target, (err, data) => {
    if (err) return sendJson(res, 404, { error: 'não encontrado' });
    res.writeHead(200, { 'Content-Type': MIME[path.extname(target).toLowerCase()] || 'application/octet-stream' });
    res.end(data);
  });
}
function servePage(res, name) {
  fs.readFile(path.join(PUBLIC_DIR, name), (err, data) => {
    if (err) return sendJson(res, 404, { error: 'não encontrado' });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(data);
  });
}

/* ================= jobs em memória ================= */
const jobs = new Map();
function newJob(orgId, conversationId, kind) {
  const job = {
    id: crypto.randomUUID(), orgId, conversationId, kind,
    status: 'running', createdAt: Date.now(),
    events: [], listeners: new Set(), deckId: null, error: null,
    // preview parcial ao vivo
    outline: null, slides: [], previewVersion: 0,
  };
  jobs.set(job.id, job);
  return job;
}
function pushEvent(job, ev) {
  ev.ts = Date.now();
  job.events.push(ev);
  const line = `data: ${JSON.stringify(ev)}\n\n`;
  for (const l of job.listeners) l.write(line);
}
// narração compatível: superset de {type:'stage',stage,msg,data} + campos legados
function emitJob(job, stage, message, extra) {
  pushEvent(job, { type: 'stage', stage, msg: message, message, data: extra, extra });
}
// eventos tipados do contrato (outline/slide/preview/deck_ready/error)
function emitTyped(job, ev) {
  pushEvent(job, ev);
}
function activeJobFor(conversationId) {
  for (const job of jobs.values()) {
    if (job.conversationId === conversationId && job.status === 'running') return job;
  }
  return null;
}

async function getOrg(orgId) {
  const r = await q('SELECT * FROM orgs WHERE id = $1', [orgId]);
  return r.rows[0] || null;
}
async function latestDeck(conversationId) {
  const r = await q(
    'SELECT id, title, version, updated_at FROM decks WHERE conversation_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [conversationId],
  );
  return r.rows[0] || null;
}

// Mensagem amigável ao modelo quando já há geração/edição em andamento na conversa.
const BUSY_MSG =
  'já há uma geração em andamento nesta conversa — avise o usuário e continue conversando; não dispare outra.';

// callbacks de preview parcial ao vivo → alimentam job.slides/outline e emitem eventos tipados
function previewHooks(job) {
  return {
    onOutline: (outline) => {
      job.outline = outline;
      emitTyped(job, { type: 'outline', title: outline.title, slides: outline.slides.map((s) => s.title) });
    },
    onSlide: (slide, index, total, status) => {
      const title = job.outline && job.outline.slides[index] ? job.outline.slides[index].title : '';
      if (status === 'done') {
        job.slides[index] = slide;
        job.previewVersion += 1;
      }
      emitTyped(job, { type: 'slide', index, total, title, status });
      if (status === 'done') emitTyped(job, { type: 'preview', version: job.previewVersion });
    },
  };
}

function launchGenerate(input, ctx) {
  if (activeJobFor(ctx.conversationId)) return { error: BUSY_MSG };
  const job = newJob(ctx.orgId, ctx.conversationId, 'generate');
  (async () => {
    try {
      const brandKit = ctx.org.brand || {};
      const result = await runPipeline(
        { ...input, ...previewHooks(job) },
        brandKit,
        (s, m, e) => emitJob(job, s, m, e),
      );
      const deckId = crypto.randomUUID();
      await q(
        `INSERT INTO decks (id, org_id, conversation_id, title, outline, slides, html, version)
         VALUES ($1,$2,$3,$4,$5,$6,$7,1)`,
        [deckId, ctx.orgId, ctx.conversationId, result.title,
          JSON.stringify(result.outline), JSON.stringify(result.slides), result.html],
      );
      job.deckId = deckId;
      job.status = 'done';
      emitJob(job, 'done', 'Apresentação pronta', { deckId });
      emitTyped(job, { type: 'deck_ready', deckId, url: '/deck/' + deckId });
    } catch (err) {
      job.status = 'error';
      job.error = err.message;
      emitJob(job, 'error', err.message);
      emitTyped(job, { type: 'error', error: err.message });
    }
  })();
  return { jobId: job.id };
}

function launchEdit(input, ctx) {
  if (activeJobFor(ctx.conversationId)) return { error: BUSY_MSG };
  const job = newJob(ctx.orgId, ctx.conversationId, 'edit');
  (async () => {
    try {
      const r = await q('SELECT * FROM decks WHERE conversation_id = $1 ORDER BY updated_at DESC LIMIT 1', [ctx.conversationId]);
      const row = r.rows[0];
      if (!row) throw new Error('esta conversa ainda não tem apresentação para editar');
      const deck = { title: row.title, outline: row.outline, slides: row.slides, brand: (ctx.org.brand || {}).name || '' };
      // preview parte do deck atual e vai atualizando os slides tocados
      job.slides = (row.slides || []).map((s) => ({ ...s }));
      const result = await runEditPipeline(
        { deck, instructions: input.instructions, brandKit: ctx.org.brand || {}, ...previewHooks(job) },
        (s, m, e) => emitJob(job, s, m, e),
      );
      await q(
        'UPDATE decks SET slides = $1, html = $2, version = version + 1, updated_at = now() WHERE id = $3',
        [JSON.stringify(result.slides), result.html, row.id],
      );
      job.deckId = row.id;
      job.status = 'done';
      emitJob(job, 'done', 'Edição aplicada: ' + result.summary, { deckId: row.id });
      emitTyped(job, { type: 'deck_ready', deckId: row.id, url: '/deck/' + row.id });
    } catch (err) {
      job.status = 'error';
      job.error = err.message;
      emitJob(job, 'error', err.message);
      emitTyped(job, { type: 'error', error: err.message });
    }
  })();
  return { jobId: job.id };
}

/* ================= handlers ================= */
async function handleRegister(req, res) {
  const body = await readBody(req);
  const { user, orgId } = await registerUser({ name: body.name, email: body.email, password: body.password });
  const token = await createSession(user.id, orgId);
  res.setHeader('Set-Cookie', sessionCookie(token));
  sendJson(res, 200, { user });
}
async function handleLogin(req, res) {
  const body = await readBody(req);
  const { user, orgId } = await loginUser({ email: body.email, password: body.password });
  const token = await createSession(user.id, orgId);
  res.setHeader('Set-Cookie', sessionCookie(token));
  sendJson(res, 200, { user });
}
async function handleLogout(req, res) {
  const cookies = parseCookies(req);
  if (cookies.snsess) await destroySession(cookies.snsess);
  res.setHeader('Set-Cookie', clearCookie());
  sendJson(res, 200, { ok: true });
}
async function handleMe(res, sess) {
  const u = await q('SELECT id, name, email FROM users WHERE id = $1', [sess.userId]);
  const o = await q('SELECT id, name, plan FROM orgs WHERE id = $1', [sess.orgId]);
  sendJson(res, 200, { user: u.rows[0], org: o.rows[0] });
}

// deriva o estado da conversa: briefing | generating | editing | ready
function deriveState(conversationId, hasDeck) {
  const job = activeJobFor(conversationId);
  if (job) return { state: job.kind === 'edit' ? 'editing' : 'generating', jobId: job.id };
  if (hasDeck) return { state: 'ready' };
  return { state: 'briefing' };
}

async function handleListConversations(res, sess) {
  const r = await q(
    `SELECT c.id, c.title, c.updated_at AS "updatedAt",
            (SELECT count(*)::int FROM decks d WHERE d.conversation_id = c.id) AS "deckCount"
     FROM conversations c WHERE c.org_id = $1 ORDER BY c.updated_at DESC LIMIT 100`,
    [sess.orgId],
  );
  const rows = r.rows.map((c) => ({ ...c, ...deriveState(c.id, c.deckCount > 0) }));
  sendJson(res, 200, rows);
}
async function handleCreateConversation(res, sess) {
  const id = crypto.randomUUID();
  await q('INSERT INTO conversations (id, org_id, user_id) VALUES ($1,$2,$3)', [id, sess.orgId, sess.userId]);
  sendJson(res, 200, { id });
}
async function handleGetConversation(res, sess, id) {
  const c = await q('SELECT * FROM conversations WHERE id = $1 AND org_id = $2', [id, sess.orgId]);
  if (!c.rows.length) return sendJson(res, 404, { error: 'conversa não encontrada' });
  const msgs = await q('SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY id', [id]);
  const decks = await q(
    'SELECT id, title, version, updated_at AS "updatedAt" FROM decks WHERE conversation_id = $1 ORDER BY updated_at DESC',
    [id],
  );
  // estado derivado + campos associados (jobId quando gerando/editando; deck quando ready)
  const derived = deriveState(id, decks.rows.length > 0);
  const latest = decks.rows[0];
  if (latest) {
    derived.deckId = latest.id;
    derived.deckUrl = '/deck/' + latest.id;
    derived.version = latest.version;
  }
  sendJson(res, 200, {
    id, title: c.rows[0].title,
    messages: msgs.rows,
    decks: decks.rows,
    docs: (c.rows[0].docs || []).map((d) => d.name),
    ...derived,
  });
}

async function handleConversationDecks(res, sess, id) {
  const c = await q('SELECT id FROM conversations WHERE id = $1 AND org_id = $2', [id, sess.orgId]);
  if (!c.rows.length) return sendJson(res, 404, { error: 'conversa não encontrada' });
  const decks = await q(
    'SELECT id, version, title, created_at AS "createdAt" FROM decks WHERE conversation_id = $1 ORDER BY version DESC',
    [id],
  );
  sendJson(res, 200, decks.rows);
}

async function handleChat(req, res, sess) {
  const body = await readBody(req);
  const { conversationId, blocks, docs } = body;
  if (!conversationId || !Array.isArray(blocks) || !blocks.length) {
    return sendJson(res, 400, { error: 'conversationId e blocks são obrigatórios' });
  }
  const c = await q('SELECT * FROM conversations WHERE id = $1 AND org_id = $2', [conversationId, sess.orgId]);
  if (!c.rows.length) return sendJson(res, 404, { error: 'conversa não encontrada' });
  const conv = c.rows[0];
  const org = await getOrg(sess.orgId);

  // a partir daqui a resposta é SSE (text/event-stream); erros viram evento `error`
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  const sse = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
  sse({ type: 'start' });

  try {
    // anexos de documento deste turno somam ao acervo da conversa
    let convDocs = conv.docs || [];
    if (Array.isArray(docs) && docs.length) {
      convDocs = convDocs.concat(docs.map((d) => ({ name: String(d.name || 'doc'), text: String(d.text || '') })));
      await q('UPDATE conversations SET docs = $1 WHERE id = $2', [JSON.stringify(convDocs), conversationId]);
    }

    // grava a mensagem do usuário e monta o histórico para o modelo
    await q('INSERT INTO messages (conversation_id, role, content) VALUES ($1,$2,$3)',
      [conversationId, 'user', JSON.stringify(blocks)]);
    let newTitle = null;
    if (conv.title === 'Nova conversa') {
      const firstText = blocks.find((b) => b.type === 'text');
      if (firstText) {
        newTitle = firstText.text.replace(/^\(/, '').slice(0, 64);
        await q('UPDATE conversations SET title = $1 WHERE id = $2', [newTitle, conversationId]);
      }
    }
    const hist = await q('SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY id', [conversationId]);
    const messages = hist.rows.map((m) => ({ role: m.role, content: m.content }));

    const deck = await latestDeck(conversationId);
    const ctx = { orgId: sess.orgId, conversationId, org };
    const { reply } = await interviewTurn(
      messages,
      { brand: org.brand || {}, deck: deck ? { id: deck.id, title: deck.title, version: deck.version } : null },
      {
        updateBrand: (input) => {
          const cur = org.brand || {};
          const next = {
            ...cur,
            ...(input.name !== undefined ? { name: String(input.name) } : {}),
            ...(input.tone !== undefined ? { tone: String(input.tone) } : {}),
            ...(input.radius !== undefined ? { radius: String(input.radius) } : {}),
          };
          if (input.colors) next.colors = { ...(cur.colors || {}), ...input.colors };
          org.brand = next;
          q('UPDATE orgs SET brand = $1 WHERE id = $2', [JSON.stringify(next), sess.orgId]).catch(() => {});
          return next;
        },
        startGeneration: (input) => launchGenerate({ ...input, docs: convDocs }, ctx),
        startEdit: (input) => launchEdit(input, ctx),
      },
      {
        onToken: (text) => sse({ type: 'token', text }),
        onEvent: (evt) => sse(evt),
      },
    );

    await q('INSERT INTO messages (conversation_id, role, content) VALUES ($1,$2,$3)',
      [conversationId, 'assistant', JSON.stringify(reply)]);
    await q('UPDATE conversations SET updated_at = now() WHERE id = $1', [conversationId]);
    sse({ type: 'done', message: reply, conversationId, ...(newTitle ? { title: newTitle } : {}) });
    res.end();
  } catch (err) {
    try { sse({ type: 'error', error: err.message || 'erro interno' }); res.end(); } catch {}
  }
}

function handleStream(req, res, sess, id) {
  const job = jobs.get(id);
  if (!job || job.orgId !== sess.orgId) return sendJson(res, 404, { error: 'não encontrado' });
  res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  for (const ev of job.events) res.write(`data: ${JSON.stringify(ev)}\n\n`);
  if (job.status !== 'running') { res.end(); return; }
  job.listeners.add(res);
  req.on('close', () => job.listeners.delete(res));
}

async function handleDeck(res, sess, id) {
  const r = await q('SELECT html FROM decks WHERE id = $1 AND org_id = $2', [id, sess.orgId]);
  if (!r.rows.length) return sendJson(res, 404, { error: 'apresentação não encontrada' });
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(r.rows[0].html);
}

function escHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
// placeholder simples para slide ainda não construído (título do outline + "construindo…")
function placeholderSlide(title) {
  return {
    html: `<section class="slide"><div class="absolute left-14 top-1/2 -translate-y-1/2 max-w-[62%]">`
      + `<div class="text-mut text-xs font-extrabold tracking-[.22em] mb-4">CONSTRUINDO…</div>`
      + `<h2 class="text-5xl font-extrabold leading-tight">${escHtml(title || 'Slide')}</h2>`
      + `<p class="text-mut mt-5">construindo…</p></div></section>`,
    js: '',
  };
}

// Deck parcial ao vivo: monta com os slides prontos até agora + placeholders.
async function handlePreview(res, sess, id) {
  const job = jobs.get(id);
  if (!job || job.orgId !== sess.orgId) return sendJson(res, 404, { error: 'não encontrado' });
  const outlineSlides = job.outline ? job.outline.slides : [];
  const total = Math.max(job.slides.length, outlineSlides.length);
  const readyCount = job.slides.filter(Boolean).length;
  if (!total || !readyCount) { res.writeHead(204); return res.end(); }
  const slides = [];
  for (let i = 0; i < total; i++) {
    slides.push(job.slides[i] || placeholderSlide(outlineSlides[i] ? outlineSlides[i].title : ''));
  }
  const org = await getOrg(job.orgId);
  const kit = (org && org.brand) || {};
  const title = (job.outline && job.outline.title) || 'Apresentação';
  const brand = kit.name || (job.outline && job.outline.brand) || '';
  const html = assemble({ title, brand, slides, theme: kit });
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
  res.end(html);
}

/* ================= roteamento ================= */
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const p = decodeURIComponent(url.pathname);
    const m = req.method;

    /* público */
    if (m === 'GET' && p === '/api/health') return sendJson(res, 200, { ok: true });
    if (m === 'GET' && p === '/') return servePage(res, 'index.html');
    if (m === 'GET' && p === '/login') return servePage(res, 'login.html');
    if (m === 'GET' && p.startsWith('/public/')) return serveStatic(res, PUBLIC_DIR, p.slice('/public'.length));
    if (m === 'POST' && p === '/api/auth/register') {
      try { return await handleRegister(req, res); }
      catch (e) { return sendJson(res, e.status || 400, { error: e.message }); }
    }
    if (m === 'POST' && p === '/api/auth/login') {
      try { return await handleLogin(req, res); }
      catch (e) { return sendJson(res, e.status || 401, { error: e.message }); }
    }
    if (m === 'POST' && p === '/api/auth/logout') return handleLogout(req, res);

    /* autenticado */
    const sess = await requireAuth(req);
    if (!sess) return sendJson(res, 401, { error: 'não autenticado' });

    if (m === 'GET' && p === '/api/me') return handleMe(res, sess);
    if (m === 'GET' && p === '/api/conversations') return handleListConversations(res, sess);
    if (m === 'POST' && p === '/api/conversations') return handleCreateConversation(res, sess);
    let mm;
    if (m === 'GET' && (mm = p.match(/^\/api\/conversations\/([^/]+)\/decks$/))) return handleConversationDecks(res, sess, mm[1]);
    if (m === 'GET' && (mm = p.match(/^\/api\/conversations\/([^/]+)$/))) return handleGetConversation(res, sess, mm[1]);
    if (m === 'POST' && p === '/api/chat') return handleChat(req, res, sess);
    if (m === 'GET' && (mm = p.match(/^\/api\/jobs\/([^/]+)\/stream$/))) return handleStream(req, res, sess, mm[1]);
    if (m === 'GET' && (mm = p.match(/^\/api\/jobs\/([^/]+)\/preview$/))) return handlePreview(res, sess, mm[1]);
    if (m === 'GET' && (mm = p.match(/^\/deck\/([^/]+)$/))) return handleDeck(res, sess, mm[1]);

    if (m === 'GET' && p === '/api/config') {
      const org = await getOrg(sess.orgId);
      return sendJson(res, 200, { config: { effort: (org.settings || {}).effort || 'high' } });
    }
    if (m === 'POST' && p === '/api/config') {
      const body = await readBody(req);
      const org = await getOrg(sess.orgId);
      const settings = { ...(org.settings || {}) };
      if (body.effort) settings.effort = String(body.effort);
      await q('UPDATE orgs SET settings = $1 WHERE id = $2', [JSON.stringify(settings), sess.orgId]);
      return sendJson(res, 200, { config: settings });
    }
    if (m === 'GET' && p === '/api/brand') {
      const org = await getOrg(sess.orgId);
      return sendJson(res, 200, {
        name: '', tone: '', radius: 'arredondado', logo: '',
        colors: { accent: '#D8E022', ink: '#070808', paper: '#EBEBEB' },
        ...(org.brand || {}),
      });
    }
    if (m === 'POST' && p === '/api/brand') {
      const body = await readBody(req);
      const org = await getOrg(sess.orgId);
      const cur = org.brand || {};
      const next = { ...cur };
      for (const k of ['name', 'tone', 'radius', 'logo']) {
        if (body[k] !== undefined) next[k] = String(body[k]);
      }
      if (next.logo && !/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(next.logo)) {
        return sendJson(res, 400, { error: 'logo deve ser um data URI de imagem' });
      }
      if (body.colors) next.colors = { ...(cur.colors || {}), ...body.colors };
      for (const cor of Object.values(next.colors || {})) {
        if (!/^#[0-9a-fA-F]{3,8}$/.test(cor)) return sendJson(res, 400, { error: 'cor inválida: ' + cor });
      }
      await q('UPDATE orgs SET brand = $1 WHERE id = $2', [JSON.stringify(next), sess.orgId]);
      return sendJson(res, 200, next);
    }

    return sendJson(res, 404, { error: 'não encontrado' });
  } catch (err) {
    try { sendJson(res, err.status || 500, { error: err.message || 'erro interno' }); } catch {}
  }
});

migrate()
  .then(() => {
    server.listen(PORT, () => console.log(`Slidenator rodando em http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Falha na migração do banco:', err.message);
    process.exit(1);
  });
