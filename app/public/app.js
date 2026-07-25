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

/* estado da CENA ao vivo (trilha de agentes + filmstrip + cronômetro) */
let sceneTotal = 0;              // nº de slides do roteiro
let sceneTitles = [];            // título por slide
let sceneStatus = [];            // '' | 'building' | 'fixing' | 'done' por slide
let sceneStageIdx = -1;          // etapa ativa (0 roteiro · 1 direção · 2 construção · 3 montagem)
let sceneDone = false;
let sceneElapsed = 0;            // segundos totais congelados no fim
let clockTimer = null;
let clockFrozen = false;

/* refs de layout resolvidas no boot (script no fim do body) */
const main = $('main');
const chatCol = $('chatCol');
const chatScroll = $('chatScroll');
const chatInput = $('chatInput');
const chatSend = $('chatSend');
const viewerFrameA = $('viewerFrame');
const viewerFrameB = $('viewerFrameB');
let frontFrame = viewerFrameA;          // iframe atualmente visível (dois alternam p/ crossfade)
const CURSOR = '<span class="stream-cursor" aria-hidden="true"></span>';
/* trilha fixa de 4 etapas; eventos SSE (stage/outline/slide) dirigem o estágio ativo */
const AGENT_STEPS = [
  { label: 'Roteirista', icon: '✍︎' },
  { label: 'Direção', icon: '◫' },
  { label: 'Construção', icon: '⚙' },
  { label: 'Montagem', icon: '▣' },
];
const STAGE_INDEX = { roteiro: 0, design: 1, construcao: 2, 'construção': 2, montagem: 3 };
const PLACEHOLDERS = {
  briefing: 'Descreva a apresentação que você precisa…',
  generating: 'Pode continuar conversando enquanto eu gero…',
  editing: 'Peça qualquer ajuste na apresentação…',
  ready: 'Peça qualquer ajuste na apresentação…',
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
  /* st.done precisa ser checado no paint: um rAF agendado antes do finalize
     repintaria o cursor depois da mensagem pronta */
  const paint = () => { st.scheduled = false; if (st.done || !st.bodyEl) return; st.bodyEl.innerHTML = renderMd(st.acc) + CURSOR; scrollChat(); };
  const schedule = () => { if (st.scheduled) return; st.scheduled = true; requestAnimationFrame(paint); };
  const finalize = () => { st.done = true; if (st.bodyEl) { st.bodyEl.classList.remove('streaming'); st.bodyEl.innerHTML = renderMd(st.acc); scrollChat(); } };

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

/* ================= visualizador ao vivo (split view, contrato §5) =================
   O painel direito é uma CENA dirigida pelos eventos SSE do job:
     · palco — dois iframes alternando p/ entrada cinematográfica sem flash branco
     · trilha de agentes — 4 etapas fixas (roteiro→direção→construção→montagem)
     · filmstrip — um quadro 16:9 por slide do roteiro, preenchendo um a um
     · cronômetro — mono no header, congela no deck_ready
   A verdade continua sendo o iframe (/api/jobs/:id/preview?v=N e depois /deck/:id). */
function showViewer() { hasViewer = true; main.classList.add('split'); viewerOpen = true; updateViewerTab(); }
function openViewer() { showViewer(); }
function closeViewer() { viewerOpen = false; main.classList.remove('split'); updateViewerTab(); }

function setViewerTitle(t) { $('viewerTitle').textContent = t || 'Prévia ao vivo'; }
function setViewerBadge() {
  const badge = $('viewerBadge');
  const map = { generating: ['gerando', 'badge-gen'], editing: ['editando', 'badge-gen'], ready: ['pronto', 'badge-ready'], briefing: ['', ''] };
  const [txt, cls] = map[convState] || ['', ''];
  badge.textContent = txt;
  badge.className = 'viewer-badge' + (cls ? ' ' + cls : '');
  const live = $('viewerLive');
  if (live) live.className = 'viewer-live' + (convState === 'ready' ? ' is-ready' : (convState === 'briefing' ? ' is-idle' : ''));
}

function setConvState(s) {
  convState = s || 'briefing';
  chatInput.placeholder = PLACEHOLDERS[convState] || PLACEHOLDERS.briefing;
  setViewerBadge();
}

/* ---- palco: crossfade entre dois iframes (o iframe em si não anima bem) ---- */
function hideStagePlaceholder() { const p = $('stagePlaceholder'); if (p) p.classList.add('is-hidden'); }
function showStagePlaceholder() { const p = $('stagePlaceholder'); if (p) p.classList.remove('is-hidden'); }

function loadViewerUrl(url) {
  if (!url) return;
  const back = (frontFrame === viewerFrameA) ? viewerFrameB : viewerFrameA;
  back.onload = () => {
    back.onload = null;
    hideStagePlaceholder();
    back.classList.remove('is-back'); back.classList.add('is-front'); back.removeAttribute('aria-hidden');
    frontFrame.classList.remove('is-front'); frontFrame.classList.add('is-back'); frontFrame.setAttribute('aria-hidden', 'true');
    frontFrame = back;
  };
  back.classList.add('is-back');
  back.src = url;
}

function blankFrames() {
  [viewerFrameA, viewerFrameB].forEach((f) => { f.onload = null; f.removeAttribute('src'); });
  viewerFrameA.classList.add('is-front'); viewerFrameA.classList.remove('is-back'); viewerFrameA.removeAttribute('aria-hidden');
  viewerFrameB.classList.add('is-back'); viewerFrameB.classList.remove('is-front'); viewerFrameB.setAttribute('aria-hidden', 'true');
  frontFrame = viewerFrameA;
  showStagePlaceholder();
}

/* base de URL atual do palco: preview parcial durante a geração, deck final depois */
function currentStageBase() {
  if (currentJobId && !sceneDone) return '/api/jobs/' + currentJobId + '/preview?v=' + previewVer;
  if (currentDeckId) return '/deck/' + currentDeckId;
  return null;
}

/* ---- cronômetro (mono, discreto no header; congela no fim) ---- */
function setClockVisible(v) { const c = $('viewerClock'); if (c) c.hidden = !v; }
function fmtClock(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); }
function tickClock() { if (clockFrozen) return; const c = $('viewerClock'); if (c) c.textContent = fmtClock(Date.now() - jobStartAt); }
function startClock() { stopClock(); clockFrozen = false; setClockVisible(true); tickClock(); clockTimer = setInterval(tickClock, 250); }
function stopClock() { if (clockTimer) { clearInterval(clockTimer); clockTimer = null; } }
function freezeClock() { clockFrozen = true; stopClock(); const c = $('viewerClock'); if (c && jobStartAt) c.textContent = fmtClock(Date.now() - jobStartAt); }

/* ---- trilha de agentes ---- */
function doneCount() { let n = 0; for (const s of sceneStatus) if (s === 'done') n++; return n; }

function renderRail() {
  const rail = $('agentRail');
  if (!rail) return;
  rail.classList.remove('is-error');
  if (sceneDone) {
    rail.classList.add('is-summary');
    const n = sceneTotal || doneCount();
    const t = sceneElapsed ? ('pronto em ' + sceneElapsed + 's') : 'pronto';
    rail.innerHTML = `<span class="rail-summary"><span class="rail-check">✓</span><span>${escHtml(t)}${n ? ' · ' + n + ' slide' + (n > 1 ? 's' : '') : ''}</span></span>`;
    return;
  }
  rail.classList.remove('is-summary');
  const cur = sceneStageIdx;
  rail.innerHTML = AGENT_STEPS.map((step, i) => {
    const done = i < cur, active = i === cur;
    let label = step.label;
    if (i === 2 && (active || done) && sceneTotal) label += ' ' + Math.min(doneCount(), sceneTotal) + '/' + sceneTotal;
    const cls = done ? 'is-done' : active ? 'is-active' : 'is-pending';
    const dot = done
      ? '<span class="rail-check">✓</span>'
      : `<span class="rail-ico">${escHtml(step.icon)}</span>${active ? '<span class="rail-halo"></span>' : ''}`;
    const conn = i < AGENT_STEPS.length - 1 ? `<span class="rail-conn${i < cur ? ' is-full' : ''}"></span>` : '';
    return `<span class="rail-step ${cls}"><span class="rail-dot">${dot}</span><span class="rail-label">${escHtml(label)}</span></span>${conn}`;
  }).join('');
}

/* ---- linha única de status com crossfade (não acumula lista) ---- */
function setStatusLine(text) {
  const st = $('stageStatus');
  if (!st) return;
  const t = text || '';
  if (st.dataset.t === t) return;
  st.dataset.t = t;
  st.classList.remove('show');
  requestAnimationFrame(() => requestAnimationFrame(() => { st.textContent = t; if (t) st.classList.add('show'); }));
}

/* ---- filmstrip: um quadro 16:9 por slide do roteiro ---- */
function heroFrameIdx() {
  let building = -1, lastDone = -1;
  sceneStatus.forEach((s, i) => { if (s === 'building' || s === 'fixing') building = i; if (s === 'done') lastDone = i; });
  return building >= 0 ? building : lastDone;
}

function renderFilmstrip() {
  const strip = $('filmstrip');
  if (!strip) return;
  if (!sceneTotal) { strip.innerHTML = ''; return; }
  if (strip.childElementCount !== sceneTotal) {
    strip.innerHTML = '';
    for (let i = 0; i < sceneTotal; i++) {
      const item = el('button', 'film-item');
      item.type = 'button';
      item.dataset.i = String(i);
      item.innerHTML =
        `<span class="film-thumb"><span class="film-num">${i + 1}</span>` +
        `<span class="film-shimmer"></span><span class="film-check">✓</span></span>` +
        `<span class="film-label"></span>`;
      item.onclick = () => gotoSlide(Number(item.dataset.i));
      strip.appendChild(item);
    }
  }
  const hero = heroFrameIdx();
  [...strip.children].forEach((item, i) => {
    const status = sceneStatus[i] || '';
    item.className = 'film-item ' + (status ? 'is-' + status : 'is-empty') + (i === hero ? ' is-current' : '');
    const label = item.querySelector('.film-label');
    const title = sceneTitles[i] || ('Slide ' + (i + 1));
    label.textContent = title;
    item.disabled = status !== 'done';
    item.title = status === 'done' ? ('Ir para o slide ' + (i + 1) + ' · ' + title) : title;
  });
}

/* clique num quadro pronto → navega o iframe até o slide (o deck lê #slide-N no load) */
function gotoSlide(index) {
  if (sceneStatus[index] !== 'done') return;
  const base = currentStageBase();
  if (!base) return;
  loadViewerUrl(base.split('#')[0] + '#slide-' + (index + 1));
}

/* ---- transições de cena dirigidas pelos eventos ---- */
function resetScene() {
  sceneTotal = 0; sceneTitles = []; sceneStatus = []; sceneStageIdx = -1; sceneDone = false; sceneElapsed = 0;
  renderRail(); renderFilmstrip();
  const st = $('stageStatus'); if (st) { st.textContent = ''; st.dataset.t = ''; st.classList.remove('show'); }
}

function sceneStage(stageKey, msg) {
  const idx = STAGE_INDEX[stageKey];
  if (idx != null && idx > sceneStageIdx) sceneStageIdx = idx;
  if (msg) setStatusLine(msg);
  renderRail();
}

function sceneOutline(title, titles) {
  titles = titles || [];
  sceneTotal = titles.length;
  sceneTitles = titles.slice();
  sceneStatus = sceneStatus.slice(0, sceneTotal);
  while (sceneStatus.length < sceneTotal) sceneStatus.push('');
  if (sceneStageIdx < 0) sceneStageIdx = 0;
  if (title) setViewerTitle(title);
  setStatusLine('Roteiro pronto · ' + sceneTotal + ' slides');
  renderFilmstrip();
  renderRail();
}

function sceneSlide(index, total, title, status) {
  if (typeof index !== 'number') return;
  if (total && total > sceneTotal) sceneTotal = total;
  while (sceneStatus.length <= index) sceneStatus.push('');
  if (title) sceneTitles[index] = title;
  sceneStatus[index] = status || 'building';
  if (sceneStageIdx < 2) sceneStageIdx = 2;
  const label = title || sceneTitles[index] || ('slide ' + (index + 1));
  if (status === 'fixing') setStatusLine('Ajustando: ' + label);
  else if (status === 'done') setStatusLine('Slide pronto: ' + label);
  else setStatusLine('Construindo: ' + label);
  renderFilmstrip();
  renderRail();
}

/* deck_ready: filmstrip permanece, trilha colapsa num resumo */
function finishScene() {
  sceneDone = true;
  freezeClock();
  sceneElapsed = jobStartAt ? Math.max(0, Math.round((Date.now() - jobStartAt) / 1000)) : sceneElapsed;
  if (!sceneTotal && sceneStatus.length) sceneTotal = sceneStatus.length;
  sceneStatus = sceneStatus.map(() => 'done');
  setStatusLine('');
  renderFilmstrip();
  renderRail();
}

/* resumo estático ao reabrir uma apresentação já pronta (sem info por slide) */
function renderReadyStatic() {
  sceneTotal = 0; sceneTitles = []; sceneStatus = []; sceneStageIdx = 3; sceneDone = true; sceneElapsed = 0;
  const rail = $('agentRail');
  if (rail) { rail.classList.add('is-summary'); rail.classList.remove('is-error'); rail.innerHTML = '<span class="rail-summary"><span class="rail-check">✓</span><span>Apresentação pronta</span></span>'; }
  const st = $('stageStatus'); if (st) { st.textContent = ''; st.dataset.t = ''; st.classList.remove('show'); }
  renderFilmstrip();
}

/* volta o painel ao estado inicial (trocar de conversa) */
function resetViewer() {
  stopClock(); clockFrozen = false;
  const c = $('viewerClock'); if (c) c.textContent = '0:00';
  setClockVisible(false);
  resetScene();
  blankFrames();
  setViewerTitle('Prévia ao vivo');
}

function loadDeckIntoViewer(deck) {
  if (!deck) return;
  setViewerTitle(deck.title || 'Apresentação');
  setClockVisible(false);
  renderReadyStatic();
  loadViewerUrl('/deck/' + deck.id);
}

function schedulePreview(v) {
  if (v) previewVer = v;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    if (currentJobId) loadViewerUrl('/api/jobs/' + currentJobId + '/preview?v=' + previewVer);
  }, 800);
}

function stopJobStream() {
  if (jobES) { jobES.close(); jobES = null; }
  clearTimeout(previewTimer);
  stopClock();
}

function startJobStream(jobId) {
  stopJobStream();
  jobStartAt = Date.now();
  /* o backend reemite todo o histórico de eventos ao conectar (server.js),
     então resetamos a cena e ela se reconstrói sozinha a partir do replay */
  resetScene();
  blankFrames();
  startClock();
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
        sceneStage(ev.stage, ev.msg);
        if (activeGen) activeGen.setStage(ev.stage, ev.msg);
        break;
      case 'outline':
        sceneOutline(ev.title, ev.slides || []);
        if (activeGen) activeGen.setOutline(ev.title, ev.slides || []);
        break;
      case 'slide':
        sceneSlide(ev.index, ev.total, ev.title, ev.status);
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
  sceneStage(stage, msg);
  if (activeGen) activeGen.setStage(stage, msg);
}

async function onDeckReady(deckId, url) {
  stopJobStream();
  if (deckId) currentDeckId = deckId;
  if (activeGen) activeGen.setDone();
  finishScene();
  setConvState('ready');
  const target = url || (currentDeckId ? ('/deck/' + currentDeckId) : null);
  if (target) loadViewerUrl(target);
  await reloadConversationMeta();
  const deck = latestDeck();
  if (deck && deck.title) setViewerTitle(deck.title);
  spawnCard(cardDeck(deck, currentDeckId));
}

function onJobError(msg) {
  stopJobStream();
  freezeClock();
  if (activeGen) activeGen.setError(msg);
  setStatusLine(msg ? ('Falhou: ' + msg) : 'Falhou');
  const rail = $('agentRail'); if (rail) rail.classList.add('is-error');
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
  startJobStream(jobId);
  showViewer();
}

/* ================= aba lateral (atalho para reabrir o visualizador) ================= */
function latestDeck() {
  if (!currentDecks || !currentDecks.length) return null;
  return [...currentDecks].sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))[0];
}

function updateViewerTab() {
  const tab = $('viewerTab');
  const spinner = $('viewerTabSpinner');
  const text = $('viewerTabText');
  const generating = convState === 'generating' || convState === 'editing';
  const deck = latestDeck();

  /* botão ↗ do cabeçalho do viewer: abre a versão definitiva em nova aba */
  const ext = $('viewerOpenExt');
  ext.hidden = !deck;
  ext.onclick = deck ? () => window.open('/deck/' + deck.id, '_blank') : null;

  /* a aba só existe quando o visualizador está fechado e há algo para ver */
  if (viewerOpen || (!generating && !deck)) { tab.hidden = true; tab.onclick = null; return; }

  tab.hidden = false;
  spinner.hidden = !generating;
  if (generating) {
    text.textContent = 'gerando — acompanhar ao vivo';
    tab.onclick = () => { if (currentJobId) openViewer(); };
  } else {
    text.textContent = `◫ ${deck.title || 'Apresentação'} · v${deck.version || 1}`;
    tab.onclick = () => { loadDeckIntoViewer(deck); showViewer(); };
  }
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
    (palette.length ? ` A paleta extraída dele foi: ${palette.join(', ')}. Me proponha uma combinação de cores para a apresentação.)` : ')');
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
        <small>${new Date(c.updatedAt).toLocaleString('pt-BR')}${c.deckCount ? ' · ' + c.deckCount + ' apresentaç' + (c.deckCount > 1 ? 'ões' : 'ão') : ''}</small></span>
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
  resetViewer();
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
      hasViewer = true;   // a aba lateral pode reabrir o visualizador com a versão final
    }
  } catch (e) {
    currentDecks = [];
    setConvState('briefing');
    row('sys', '⚠ ' + escHtml(e.message));
  }
  updateViewerTab();
}

async function reloadConversationMeta() {
  if (!currentConversationId) return;
  try {
    const conv = await api('/api/conversations/' + currentConversationId);
    currentDecks = conv.decks || [];
    if (conv.deckId) currentDeckId = conv.deckId;
    else { const d = latestDeck(); if (d) currentDeckId = d.id; }
    updateViewerTab();
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
