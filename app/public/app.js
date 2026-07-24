/* Slidenator · interface de chat */
const $ = (id) => document.getElementById(id);

/* ================= estado ================= */
let currentUser = null;
let currentOrg = null;
let conversations = [];          // [{id, title, updatedAt, deckCount}]
let currentConversationId = null;
let currentDecks = [];           // decks da conversa atual
let currentDeckId = null;        // deck "corrente" (última versão conhecida)
let convState = 'briefing';      // 'briefing' | 'generating' | 'editing' | 'ready'
let attachedDocNames = [];       // nomes exibidos nos chips (só desta conversa/sessão de UI)
let chatBusy = false;
let brandLogoData = '';

/* estado do job / visualizador ao vivo */
let currentJobId = null;
let jobES = null;                // EventSource do job em andamento
let jobStartAt = 0;
let activeGen = null;            // controlador do card-generation atual
let hasViewer = false;          // existe um visualizador reabrível para a conversa
let viewerOpen = false;
let previewTimer = null;
let previewVer = 0;
let typingRow = null;

/* refs de layout resolvidas no boot (script no fim do body) */
const main = $('main');
const chatCol = $('chatCol');
const chatScroll = $('chatScroll');
const chatInput = $('chatInput');
const chatSend = $('chatSend');
const viewerFrame = $('viewerFrame');
const CURSOR = '<span class="stream-cursor" aria-hidden="true"></span>';
const STAGE_ICON = { roteiro: '✍︎', design: '◫', construcao: '⚙', 'construção': '⚙', montagem: '▣' };
const PLACEHOLDERS = {
  briefing: 'Descreva a apresentação que você precisa…',
  generating: 'Pode continuar conversando enquanto eu gero…',
  editing: 'Peça qualquer ajuste no deck…',
  ready: 'Peça qualquer ajuste no deck…',
};

async function api(path, opts) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}
const escHtml = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const escAttr = (s) => escHtml(s).replace(/"/g, '&quot;');
const plainText = (s) => escHtml(s).replace(/\n/g, '<br>');
const el = (tag, cls) => { const n = document.createElement(tag); if (cls) n.className = cls; return n; };

/* ---- markdown seguro (marked + DOMPurify vendorizados) ---- */
if (window.marked && marked.setOptions) marked.setOptions({ gfm: true, breaks: true });
if (window.DOMPurify) {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'A') {
      node.setAttribute('target', '_blank');
      node.setAttribute('rel', 'noopener noreferrer');
    }
  });
}
function renderMd(text) {
  const src = String(text == null ? '' : text);
  if (!window.marked || !window.DOMPurify) return plainText(src);
  try {
    return DOMPurify.sanitize(marked.parse(src), { ADD_ATTR: ['target', 'rel'] });
  } catch {
    return plainText(src);
  }
}

/* ================= chat: renderização ================= */
function scrollChat() { chatScroll.scrollTop = chatScroll.scrollHeight; }

function row(kind, html) {
  const d = el('div', 'row ' + kind);
  d.innerHTML = kind === 'bot'
    ? `<span class="avatar">SL</span><div class="body"><div class="md">${html}</div></div>`
    : `<div class="body">${html}</div>`;
  chatCol.appendChild(d);
  scrollChat();
  return d;
}

function showTyping() { if (!typingRow) typingRow = row('bot', '<span class="typing"><i></i><i></i><i></i></span>'); }
function clearTyping() { if (typingRow) { typingRow.remove(); typingRow = null; } }

function setBusy(v) {
  chatBusy = v;
  chatSend.disabled = v;
  if (v) showTyping(); else clearTyping();
}

function contentToHtml(content, role) {
  const isBot = role === 'assistant';
  if (typeof content === 'string') return isBot ? renderMd(content) : plainText(content);
  if (Array.isArray(content)) {
    return content.map((b) => {
      if (b && b.type === 'text') return isBot ? renderMd(b.text || '') : plainText(b.text || '');
      const label = b && b.type === 'image' ? '🖼 imagem'
        : b && b.type === 'document' ? '📄 documento'
        : '📎 anexo';
      return `<span class="att">${label}</span>`;
    }).join(' ');
  }
  return '';
}

function renderMessages(messages) {
  (messages || []).forEach((m) => {
    row(m.role === 'assistant' ? 'bot' : 'user', contentToHtml(m.content, m.role));
  });
}

function greet() {
  row('bot', renderMd('Oi! 👋 Eu crio **apresentações interativas** com você.\n\nMe conta: sobre o que é a apresentação e o que ela precisa conseguir? Você também pode **arrastar para cá** o logo da sua empresa e documentos com dados — eu cuido do resto.'));
}

/* ================= chat: envio com streaming (SSE via fetch) ================= */
function parseSSE(frame) {
  const lines = frame.split('\n');
  let data = '';
  for (const ln of lines) {
    if (ln.startsWith(':')) continue;              // comentário SSE
    if (!ln.startsWith('data:')) continue;
    data += (data ? '\n' : '') + ln.slice(5).replace(/^ /, '');
  }
  if (!data) return null;
  try { return JSON.parse(data); } catch { return null; }
}

async function consumeChatStream(res) {
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const st = { bodyEl: null, acc: '', done: false, scheduled: false };

  const ensureBot = () => {
    if (!st.bodyEl) { clearTyping(); const r = row('bot', ''); const b = r.querySelector('.md'); b.classList.add('streaming'); st.bodyEl = b; }
  };
  const paint = () => { st.scheduled = false; if (st.bodyEl) { st.bodyEl.innerHTML = renderMd(st.acc) + CURSOR; scrollChat(); } };
  const schedule = () => { if (st.scheduled) return; st.scheduled = true; requestAnimationFrame(paint); };
  const finalize = () => { if (st.bodyEl) { st.bodyEl.classList.remove('streaming'); st.bodyEl.innerHTML = renderMd(st.acc); scrollChat(); } };

  const handle = (ev) => {
    switch (ev.type) {
      case 'start': break;
      case 'token': ensureBot(); st.acc += (ev.text || ''); schedule(); break;
      case 'tool': handleToolEvent(ev); break;
      case 'deck_job': handleDeckJob(ev.jobId, ev.deckId, ev.mode || 'generate'); break;
      case 'done':
        ensureBot();
        if (ev.message != null) st.acc = ev.message;
        finalize();
        st.done = true;
        loadConversations();
        break;
      case 'error':
        clearTyping();
        spawnCard(cardError(ev.error));
        st.done = true;
        break;
      default: break;
    }
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let i;
    while ((i = buf.indexOf('\n\n')) >= 0) {
      const frame = buf.slice(0, i);
      buf = buf.slice(i + 2);
      const ev = parseSSE(frame);
      if (ev) handle(ev);
    }
  }
  buf += decoder.decode();
  if (buf.trim()) { const ev = parseSSE(buf); if (ev) handle(ev); }
  if (!st.done) finalize();          // stream cortado: remove o cursor mesmo assim
}

async function sendTurn(blocks, visibleHtml, docsThisTurn) {
  if (chatBusy || !currentConversationId) return;
  row('user', visibleHtml);
  setBusy(true);
  try {
    const body = { conversationId: currentConversationId, blocks };
    if (docsThisTurn && docsThisTurn.length) body.docs = docsThisTurn;
    const res = await fetch('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const ct = res.headers.get('content-type') || '';

    if (res.ok && ct.includes('text/event-stream')) {
      await consumeChatStream(res);
    } else if (res.ok) {
      // fallback: backend antigo respondendo JSON normal
      const data = await res.json().catch(() => ({}));
      clearTyping();
      row('bot', renderMd(data.reply || ''));
      loadConversations();
      if (data.jobId) handleDeckJob(data.jobId, data.deckId, data.mode || 'generate');
      else if (data.deckId) reloadConversationMeta();
    } else {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || ('HTTP ' + res.status));
    }
  } catch (e) {
    clearTyping();
    row('sys', '⚠ ' + escHtml(e.message || 'falha na conexão'));
  } finally {
    setBusy(false);
  }
}

$('chatForm').onsubmit = (ev) => {
  ev.preventDefault();
  if (chatBusy) return;
  const text = chatInput.value.trim();
  if (!text) return;
  chatInput.value = '';
  sendTurn([{ type: 'text', text }], plainText(text));
};

/* ================= componentes spawnáveis no chat (contrato §4) ================= */
function spawnCard(node) { chatCol.appendChild(node); scrollChat(); return node; }

async function handleToolEvent(ev) {
  if (ev && ev.name === 'update_brand') return spawnBrandCard(ev.summary);
  // demais tools: refletidas no texto do assistente; sem card dedicado
}

async function spawnBrandCard(summary) {
  const node = el('div', 'chat-card card-brand');
  node.innerHTML = `<div class="cb-head"><span class="cb-dot">✓</span><span>Identidade visual aplicada</span></div><div class="cb-body"></div>`;
  spawnCard(node);
  try {
    const b = await api('/api/brand');
    const swatches = b.colors ? ['accent', 'ink', 'paper'].map((k) => b.colors[k]).filter(Boolean) : [];
    const swHtml = swatches.map((c) => `<span class="cb-swatch" style="background:${escAttr(c)}" title="${escAttr(c)}"></span>`).join('');
    node.querySelector('.cb-body').innerHTML =
      `${b.logo ? `<img class="cb-logo" src="${escAttr(b.logo)}" alt="logo da marca">` : ''}` +
      `<div class="cb-info"><span class="cb-name">${escHtml(b.name || summary || 'Marca')}</span>` +
      `<span class="cb-swatches">${swHtml}</span></div>`;
  } catch {
    node.querySelector('.cb-body').textContent = summary || 'Marca atualizada.';
  }
}

function spawnGenerationCard(jobId, mode) {
  const node = el('div', 'chat-card card-generation');
  const label = mode === 'edit' ? 'Ajustando a apresentação' : 'Montando a apresentação';
  node.innerHTML =
    `<div class="cg-head"><span class="cg-title">${escHtml(label)}</span><span class="cg-status">iniciando…</span></div>` +
    `<div class="cg-slides"></div>` +
    `<button type="button" class="cg-watch">acompanhar ao vivo</button>`;
  const statusEl = node.querySelector('.cg-status');
  const slidesEl = node.querySelector('.cg-slides');
  node.querySelector('.cg-watch').onclick = () => { if (currentJobId) openViewer(); };
  spawnCard(node);

  const rows = new Map();      // index -> element
  const rowFor = (i, title) => {
    let r = rows.get(i);
    if (!r) {
      r = el('div', 'cg-slide');
      r.innerHTML = `<span class="cg-ico"></span><span class="cg-name"></span><span class="cg-badge"></span>`;
      slidesEl.appendChild(r);
      rows.set(i, r);
    }
    if (title) r.querySelector('.cg-name').textContent = title;
    else if (!r.querySelector('.cg-name').textContent) r.querySelector('.cg-name').textContent = 'Slide ' + (i + 1);
    return r;
  };
  const applyStatus = (r, status) => {
    r.classList.remove('is-building', 'is-fixing', 'is-done');
    const badge = r.querySelector('.cg-badge');
    badge.textContent = '';
    if (status === 'building') { r.classList.add('is-building'); }
    else if (status === 'fixing') { r.classList.add('is-fixing'); badge.textContent = 'corrigindo'; }
    else if (status === 'done') { r.classList.add('is-done'); }
  };

  return {
    node,
    setStage(stage, msg) { statusEl.textContent = msg || stage || ''; },
    setOutline(title, slides) {
      (slides || []).forEach((t, i) => rowFor(i, t));
    },
    setSlide(index, total, title, status) {
      if (typeof index !== 'number') return;
      const r = rowFor(index, title);
      applyStatus(r, status);
      if (total) statusEl.textContent = `slide ${index + 1}/${total}`;
    },
    setDone() {
      statusEl.textContent = 'concluído';
      node.classList.add('is-done');
      rows.forEach((r) => { if (!r.classList.contains('is-done')) applyStatus(r, 'done'); });
    },
    setError(msg) { statusEl.textContent = msg ? ('erro — ' + msg) : 'falhou'; node.classList.add('is-error'); },
  };
}

function cardDeck(deck, deckId) {
  const id = deckId || (deck && deck.id);
  const node = el('div', 'chat-card card-deck');
  const title = (deck && deck.title) || 'Apresentação';
  const ver = (deck && deck.version) || 1;
  node.innerHTML =
    `<div class="cd-main"><span class="cd-ico">🎞</span><div class="cd-txt">` +
    `<span class="cd-title">${escHtml(title)}</span><span class="cd-sub">versão ${escHtml(ver)}</span></div></div>` +
    `<div class="cd-actions"><button type="button" class="cd-open">Abrir</button>` +
    `<button type="button" class="cd-present">Apresentar</button></div>`;
  node.querySelector('.cd-open').onclick = () => { if (id) window.open('/deck/' + id, '_blank'); };
  node.querySelector('.cd-present').onclick = () => { if (id) window.open('/deck/' + id + '#present', '_blank'); };
  return node;
}

function cardError(msg) {
  const node = el('div', 'chat-card card-error');
  node.innerHTML = `<span class="ce-ico">⚠</span><div class="ce-msg"></div>`;
  node.querySelector('.ce-msg').textContent = msg || 'Ocorreu um erro.';
  return node;
}

/* ================= visualizador ao vivo (split view, contrato §5) ================= */
function showViewer() { hasViewer = true; main.classList.add('split'); viewerOpen = true; updateDeckPill(); }
function openViewer() { showViewer(); }
function closeViewer() { viewerOpen = false; main.classList.remove('split'); updateDeckPill(); }

function setViewerTitle(t) { $('viewerTitle').textContent = t || 'Prévia ao vivo'; }
function setViewerBadge() {
  const badge = $('viewerBadge');
  const map = { generating: ['gerando', 'badge-gen'], editing: ['editando', 'badge-gen'], ready: ['pronto', 'badge-ready'], briefing: ['', ''] };
  const [txt, cls] = map[convState] || ['', ''];
  badge.textContent = txt;
  badge.className = 'viewer-badge' + (cls ? ' ' + cls : '');
}

function setConvState(s) {
  convState = s || 'briefing';
  chatInput.placeholder = PLACEHOLDERS[convState] || PLACEHOLDERS.briefing;
  setViewerBadge();
}

function loadDeckIntoViewer(deck) {
  if (!deck) return;
  setViewerTitle(deck.title || 'Apresentação');
  if (viewerFrame) viewerFrame.src = '/deck/' + deck.id;
}

function relTime() {
  if (!jobStartAt) return '';
  const s = Math.max(0, Math.floor((Date.now() - jobStartAt) / 1000));
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}

function addTimeline(stage, msg) {
  const feed = $('viewerTimeline');
  const item = el('div', 'tl-item');
  const ico = STAGE_ICON[stage] || '•';
  item.innerHTML = `<span class="tl-ico">${escHtml(ico)}</span><span class="tl-body"><span class="tl-msg"></span><span class="tl-time">${escHtml(relTime())}</span></span>`;
  item.querySelector('.tl-msg').textContent = msg || stage || '';
  feed.appendChild(item);
  feed.scrollTop = feed.scrollHeight;
}

function schedulePreview(v) {
  if (v) previewVer = v;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    if (viewerFrame && currentJobId) viewerFrame.src = '/api/jobs/' + currentJobId + '/preview?v=' + previewVer;
  }, 800);
}

function stopJobStream() {
  if (jobES) { jobES.close(); jobES = null; }
  clearTimeout(previewTimer);
}

function startJobStream(jobId) {
  stopJobStream();
  jobStartAt = Date.now();
  jobES = new EventSource('/api/jobs/' + jobId + '/stream');
  jobES.onmessage = (m) => {
    let ev; try { ev = JSON.parse(m.data); } catch { return; }
    handleJobEvent(ev);
  };
  jobES.onerror = () => { /* EventSource tenta reconectar; fechamos em deck_ready/error */ };
}

function handleJobEvent(ev) {
  if (ev && ev.type) {
    switch (ev.type) {
      case 'stage':
        addTimeline(ev.stage, ev.msg);
        if (activeGen) activeGen.setStage(ev.stage, ev.msg);
        break;
      case 'outline':
        if (activeGen) activeGen.setOutline(ev.title, ev.slides || []);
        if (ev.title) setViewerTitle(ev.title);
        addTimeline('roteiro', 'Roteiro pronto · ' + ((ev.slides && ev.slides.length) || 0) + ' slides');
        break;
      case 'slide':
        if (activeGen) activeGen.setSlide(ev.index, ev.total, ev.title, ev.status);
        break;
      case 'preview':
        schedulePreview(ev.version);
        break;
      case 'deck_ready':
        onDeckReady(ev.deckId, ev.url);
        break;
      case 'error':
        onJobError(ev.error);
        break;
      default: break;
    }
    return;
  }
  // formato legado {stage, msg/message, extra}
  const stage = ev.stage;
  const msg = ev.message || ev.msg || '';
  if (stage === 'done') { onDeckReady(currentDeckId, currentDeckId ? ('/deck/' + currentDeckId) : null); return; }
  if (stage === 'error') { onJobError(msg); return; }
  addTimeline(stage, msg);
  if (activeGen) activeGen.setStage(stage, msg);
}

async function onDeckReady(deckId, url) {
  stopJobStream();
  if (deckId) currentDeckId = deckId;
  if (activeGen) activeGen.setDone();
  setConvState('ready');
  const target = url || (currentDeckId ? ('/deck/' + currentDeckId) : null);
  if (target && viewerFrame) viewerFrame.src = target;
  await reloadConversationMeta();
  const deck = latestDeck();
  if (deck && deck.title) setViewerTitle(deck.title);
  spawnCard(cardDeck(deck, currentDeckId));
}

function onJobError(msg) {
  stopJobStream();
  if (activeGen) activeGen.setError(msg);
  spawnCard(cardError(msg));
  setConvState(currentDeckId ? 'ready' : 'briefing');
  reloadConversationMeta();
}

/* disparado por deck_job (stream do chat) ou pelo fallback JSON */
function handleDeckJob(jobId, deckId, mode) {
  if (!jobId) return;
  currentJobId = jobId;
  if (deckId) currentDeckId = deckId;
  setConvState(mode === 'edit' ? 'editing' : 'generating');
  activeGen = spawnGenerationCard(jobId, mode);
  $('viewerTimeline').innerHTML = '';
  startJobStream(jobId);
  showViewer();
}

/* ================= deck flutuante (atalho para reabrir o viewer) ================= */
function latestDeck() {
  if (!currentDecks || !currentDecks.length) return null;
  return [...currentDecks].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
}

function updateDeckPill() {
  const pill = $('deckPill');
  const spinner = $('deckPillSpinner');
  const text = $('deckPillText');
  const openBtn = $('deckPillOpen');
  const generating = convState === 'generating' || convState === 'editing';

  if (generating) {
    pill.hidden = false;
    spinner.hidden = false;
    text.textContent = viewerOpen ? 'gerando…' : 'gerando — ver ao vivo';
    openBtn.hidden = true;
    pill.classList.toggle('clickable', !viewerOpen);
    pill.onclick = () => { if (!viewerOpen && currentJobId) openViewer(); };
    return;
  }

  spinner.hidden = true;
  const deck = latestDeck();
  if (!deck) { pill.hidden = true; pill.onclick = null; pill.classList.remove('clickable'); return; }
  pill.hidden = false;
  text.textContent = `🎞 ${deck.title || 'Deck'} · v${deck.version || 1}`;
  openBtn.hidden = false;
  openBtn.onclick = (e) => { e.stopPropagation(); window.open('/deck/' + deck.id, '_blank'); };
  pill.classList.toggle('clickable', hasViewer && !viewerOpen);
  pill.onclick = () => { if (hasViewer && !viewerOpen) { loadDeckIntoViewer(deck); showViewer(); } };
}

$('viewerClose').onclick = closeViewer;

/* ================= anexos ================= */
function extractPalette(img) {
  const c = document.createElement('canvas');
  const size = 64;
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, size, size);
  const data = ctx.getImageData(0, 0, size, size).data;
  const buckets = new Map();
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]];
    if (a < 128) continue;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max > 235 && min > 225) continue;
    if (max < 28) continue;
    if (max - min < 18) continue;
    const key = `${r >> 5}_${g >> 5}_${b >> 5}`;
    const cur = buckets.get(key) || { n: 0, r: 0, g: 0, b: 0 };
    cur.n++; cur.r += r; cur.g += g; cur.b += b;
    buckets.set(key, cur);
  }
  return [...buckets.values()].sort((a, b) => b.n - a.n).slice(0, 6)
    .map((v) => '#' + [v.r, v.g, v.b].map((x) => Math.round(x / v.n).toString(16).padStart(2, '0')).join(''));
}

async function ingestLogoFile(f, announce = true) {
  const dataUri = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); });
  brandLogoData = dataUri;
  showLogoPreview(dataUri);
  try { await api('/api/brand', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ logo: dataUri }) }); } catch {}
  let palette = [];
  if (f.type !== 'image/svg+xml') {
    palette = await new Promise((ok) => {
      const img = new Image();
      img.onload = () => ok(extractPalette(img));
      img.onerror = () => ok([]);
      img.src = dataUri;
    });
  }
  if (!announce) return;
  const note = `(Anexei o logo "${f.name}".` +
    (palette.length ? ` A paleta extraída dele foi: ${palette.join(', ')}. Me proponha uma combinação de cores para o deck.)` : ')');
  const blocks = [];
  if (f.type !== 'image/svg+xml') blocks.push({ type: 'image', source: { type: 'base64', media_type: f.type, data: dataUri.split(',')[1] } });
  blocks.push({ type: 'text', text: note });
  sendTurn(blocks, `<span class="att">🖼 ${escHtml(f.name)}</span> logo enviado${palette.length ? ' · paleta extraída' : ''}`);
}

async function ingestDocFile(f) {
  const text = await f.text();
  attachedDocNames.push(f.name);
  $('fileChips').innerHTML = attachedDocNames.map((n) => `<span>📄 ${escHtml(n)}</span>`).join('');
  const excerpt = text.slice(0, 2500);
  const note = `(Anexei o documento "${f.name}" — ${text.length.toLocaleString('pt-BR')} caracteres; o conteúdo completo será entregue ao roteirista na geração. Começo do documento:\n---\n${excerpt}\n---)`;
  sendTurn([{ type: 'text', text: note }], `<span class="att">📄 ${escHtml(f.name)}</span> documento anexado`, [{ name: f.name, text }]);
}

async function ingestFiles(files) {
  for (const f of files) {
    if (f.type.startsWith('image/')) await ingestLogoFile(f);
    else await ingestDocFile(f);
  }
}

['dragenter', 'dragover'].forEach((ev) => main.addEventListener(ev, (e) => { e.preventDefault(); main.classList.add('dragging'); }));
main.addEventListener('dragleave', (e) => { e.preventDefault(); if (!e.relatedTarget || !main.contains(e.relatedTarget)) main.classList.remove('dragging'); });
main.addEventListener('drop', (e) => { e.preventDefault(); main.classList.remove('dragging'); if (e.dataTransfer && e.dataTransfer.files.length) ingestFiles([...e.dataTransfer.files]); });
$('attachBtn').onclick = () => $('chatFiles').click();
$('chatFiles').onchange = (ev) => { ingestFiles([...ev.target.files]); ev.target.value = ''; };

/* ================= sidebar: conversas ================= */
async function loadConversations() {
  try {
    conversations = await api('/api/conversations');
    conversations.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  } catch { conversations = []; }
  renderConvList();
}

function renderConvList() {
  if (!conversations.length) { $('convList').innerHTML = '<p class="side-empty">nenhuma ainda</p>'; return; }
  $('convList').innerHTML = conversations.map((c) => `
    <button class="conv-item ${c.id === currentConversationId ? 'active' : ''}" data-id="${escAttr(c.id)}">
      <span class="t">${escHtml((c.title || '(sem título)').slice(0, 70))}
        <small>${new Date(c.updatedAt).toLocaleString('pt-BR')}${c.deckCount ? ' · ' + c.deckCount + ' deck' + (c.deckCount > 1 ? 's' : '') : ''}</small></span>
    </button>`).join('');
  $('convList').querySelectorAll('.conv-item').forEach((b) => {
    b.onclick = () => selectConversation(b.dataset.id);
  });
}

async function selectConversation(id) {
  if (chatBusy || !id) return;
  stopJobStream();
  closeViewer();
  hasViewer = false; viewerOpen = false; currentJobId = null; activeGen = null;
  $('viewerTimeline').innerHTML = '';
  if (viewerFrame) viewerFrame.removeAttribute('src');
  currentConversationId = id;
  attachedDocNames = [];
  $('fileChips').innerHTML = '';
  chatCol.innerHTML = '';
  renderConvList();
  try {
    const conv = await api('/api/conversations/' + id);
    currentDecks = conv.decks || [];
    currentDeckId = conv.deckId || (latestDeck() && latestDeck().id) || null;
    if (conv.messages && conv.messages.length) renderMessages(conv.messages);
    else greet();
    const state = conv.state || (currentDecks.length ? 'ready' : 'briefing');
    setConvState(state);
    if ((state === 'generating' || state === 'editing') && conv.jobId) {
      currentJobId = conv.jobId;
      hasViewer = true;
      activeGen = spawnGenerationCard(conv.jobId, state === 'editing' ? 'edit' : 'generate');
      row('sys', 'Retomando a geração em andamento…');
      startJobStream(conv.jobId);
      showViewer();
    } else if (state === 'ready') {
      hasViewer = true;   // pill pode reabrir o viewer com o deck final
    }
  } catch (e) {
    currentDecks = [];
    setConvState('briefing');
    row('sys', '⚠ ' + escHtml(e.message));
  }
  updateDeckPill();
}

async function reloadConversationMeta() {
  if (!currentConversationId) return;
  try {
    const conv = await api('/api/conversations/' + currentConversationId);
    currentDecks = conv.decks || [];
    if (conv.deckId) currentDeckId = conv.deckId;
    else { const d = latestDeck(); if (d) currentDeckId = d.id; }
    updateDeckPill();
  } catch {}
  loadConversations();
}

$('newChat').onclick = async () => {
  if (chatBusy) return;
  try {
    const { id } = await api('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
    await loadConversations();
    await selectConversation(id);
  } catch (e) {
    row('sys', '⚠ ' + escHtml(e.message));
  }
};

/* ================= sessão ================= */
function renderUserFooter() {
  $('userEmail').textContent = (currentUser && currentUser.email) || '';
}

$('logoutBtn').onclick = async () => {
  try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
  location.href = '/login';
};

/* ================= configurações ================= */
function showLogoPreview(dataUri) {
  const prev = $('logoPreview');
  if (!dataUri) { prev.hidden = true; return; }
  prev.innerHTML = `<img src="${escAttr(dataUri)}" alt="logo">`;
  prev.hidden = false;
}

async function loadSettingsValues() {
  try {
    const { config } = await api('/api/config');
    $('effort').value = (config && config.effort) || 'high';
  } catch {}
  try {
    const b = await api('/api/brand');
    $('brandName').value = b.name || '';
    $('brandTone').value = b.tone || '';
    $('brandRadius').value = b.radius || 'arredondado';
    if (b.colors) {
      $('cAccent').value = b.colors.accent || '#D8E022';
      $('cInk').value = b.colors.ink || '#070808';
      $('cPaper').value = b.colors.paper || '#EBEBEB';
    }
    if (b.logo) { brandLogoData = b.logo; showLogoPreview(b.logo); }
  } catch {}
}

$('openSettings').onclick = () => { loadSettingsValues(); $('settings').showModal(); };
$('closeSettings').onclick = () => $('settings').close();
$('brandLogo').onchange = (ev) => { const f = ev.target.files[0]; if (f) ingestLogoFile(f, false); };
$('saveSettings').onclick = async () => {
  try {
    await api('/api/config', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ effort: $('effort').value }) });
    await api('/api/brand', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: $('brandName').value.trim(), tone: $('brandTone').value.trim(),
        radius: $('brandRadius').value, logo: brandLogoData,
        colors: { accent: $('cAccent').value, ink: $('cInk').value, paper: $('cPaper').value },
      }) });
    $('settings').close();
  } catch (e) { alert('Erro ao salvar: ' + e.message); }
};

/* ================= sidebar recolhível ================= */
$('collapseBtn').onclick = () => { $('sidebar').classList.add('hidden'); $('expandBtn').hidden = false; };
$('expandBtn').onclick = () => { $('sidebar').classList.remove('hidden'); $('expandBtn').hidden = true; };

/* ================= boot ================= */
async function boot() {
  const meRes = await fetch('/api/me');
  if (meRes.status === 401) { location.href = '/login'; return; }
  const me = await meRes.json().catch(() => ({}));
  currentUser = me.user || me;
  currentOrg = me.org || null;
  renderUserFooter();

  await loadConversations();
  if (!conversations.length) {
    try {
      const { id } = await api('/api/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      await loadConversations();
      await selectConversation(id);
    } catch (e) {
      row('sys', '⚠ ' + escHtml(e.message));
    }
  } else {
    await selectConversation(conversations[0].id);
  }
  loadSettingsValues();
}

boot();
