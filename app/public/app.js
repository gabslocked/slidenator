/* Slidenator · interface de chat */
const $ = (id) => document.getElementById(id);

/* ================= estado ================= */
let currentUser = null;
let currentOrg = null;
let conversations = [];          // [{id, title, updatedAt, deckCount}]
let currentConversationId = null;
let currentDecks = [];           // decks da conversa atual
let deckPillState = 'idle';      // 'idle' | 'generating'
let attachedDocNames = [];       // nomes exibidos nos chips (só desta conversa/sessão de UI)
let chatBusy = false;
let brandLogoData = '';

async function api(path, opts) {
  const res = await fetch(path, opts);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || ('HTTP ' + res.status));
  return data;
}
const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const md = (s) => escHtml(s || '').replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');

/* ================= chat: renderização ================= */
function row(kind, html) {
  const d = document.createElement('div');
  d.className = 'row ' + kind;
  d.innerHTML = kind === 'bot'
    ? `<span class="avatar">SL</span><div class="body">${html}</div>`
    : `<div class="body">${html}</div>`;
  $('chatCol').appendChild(d);
  $('chatScroll').scrollTop = $('chatScroll').scrollHeight;
  return d;
}

function setBusy(v) {
  chatBusy = v;
  $('chatSend').disabled = v;
  $('chatInput').disabled = v;
  if (v) window._typing = row('bot', '<span class="typing"><i></i><i></i><i></i></span>');
  else if (window._typing) { window._typing.remove(); window._typing = null; }
}

function contentToHtml(content) {
  if (typeof content === 'string') return md(content);
  if (Array.isArray(content)) {
    return content.map((b) => {
      if (b && b.type === 'text') return md(b.text || '');
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
    row(m.role === 'assistant' ? 'bot' : 'user', contentToHtml(m.content));
  });
}

function greet() {
  row('bot', md('Oi! 👋 Eu crio **apresentações interativas** com você.\n\nMe conta: sobre o que é a apresentação e o que ela precisa conseguir? Você também pode **arrastar para cá** o logo da sua empresa e documentos com dados — eu cuido do resto.'));
}

/* ================= chat: envio ================= */
async function sendTurn(blocks, visibleHtml, docsThisTurn) {
  if (chatBusy || !currentConversationId) return;
  row('user', visibleHtml);
  setBusy(true);
  try {
    const body = { conversationId: currentConversationId, blocks };
    if (docsThisTurn && docsThisTurn.length) body.docs = docsThisTurn;
    const data = await api('/api/chat', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    setBusy(false);
    row('bot', md(data.reply || ''));
    loadConversations();
    if (data.jobId) startProgress(data.jobId);
    else if (data.deckId) reloadConversationMeta();
  } catch (e) {
    setBusy(false);
    row('sys', '⚠ ' + escHtml(e.message));
  }
}

$('chatForm').onsubmit = (ev) => {
  ev.preventDefault();
  const text = $('chatInput').value.trim();
  if (!text) return;
  $('chatInput').value = '';
  sendTurn([{ type: 'text', text }], md(text));
};

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

const main = $('main');
['dragenter', 'dragover'].forEach((ev) => main.addEventListener(ev, (e) => { e.preventDefault(); main.classList.add('dragging'); }));
main.addEventListener('dragleave', (e) => { e.preventDefault(); if (!e.relatedTarget || !main.contains(e.relatedTarget)) main.classList.remove('dragging'); });
main.addEventListener('drop', (e) => { e.preventDefault(); main.classList.remove('dragging'); if (e.dataTransfer && e.dataTransfer.files.length) ingestFiles([...e.dataTransfer.files]); });
$('attachBtn').onclick = () => $('chatFiles').click();
$('chatFiles').onchange = (ev) => { ingestFiles([...ev.target.files]); ev.target.value = ''; };

/* ================= progresso (card no chat) ================= */
function startProgress(jobId) {
  deckPillState = 'generating';
  updateDeckPill();
  const holder = row('bot', '<div class="progress-card"></div>');
  const card = holder.querySelector('.progress-card');
  const line = (ev) => {
    const div = document.createElement('div');
    if (ev.stage === 'error') div.innerHTML = `<span class="err">✗ ${escHtml(ev.message)}</span>`;
    else if (ev.stage === 'done') div.innerHTML = `<span class="stage">✓ concluído</span>`;
    else div.innerHTML = `<span class="stage">[${escHtml(ev.stage)}]</span> ${escHtml(ev.message)}`;
    card.appendChild(div);
    if (ev.extra && ev.extra.slides) { const d = document.createElement('div'); d.className = 'detail'; d.textContent = ev.extra.slides.join(' · '); card.appendChild(d); }
    if (ev.extra && ev.extra.issues) { const d = document.createElement('div'); d.className = 'detail'; d.textContent = ev.extra.issues.join(' | '); card.appendChild(d); }
    card.scrollTop = card.scrollHeight;
  };
  const es = new EventSource('/api/jobs/' + jobId + '/stream');
  es.onmessage = (m) => {
    const ev = JSON.parse(m.data);
    line(ev);
    if (ev.stage === 'done') {
      es.close(); deckPillState = 'idle'; reloadConversationMeta();
      row('sys', '🎉 deck pronto — veja o pill acima');
    }
    if (ev.stage === 'error') { es.close(); deckPillState = 'idle'; reloadConversationMeta(); }
  };
  es.onerror = () => { es.close(); deckPillState = 'idle'; reloadConversationMeta(); };
}

/* ================= deck flutuante ================= */
function updateDeckPill() {
  const pill = $('deckPill');
  const spinner = $('deckPillSpinner');
  const text = $('deckPillText');
  const openBtn = $('deckPillOpen');
  if (deckPillState === 'generating') {
    pill.hidden = false;
    spinner.hidden = false;
    text.textContent = 'gerando…';
    openBtn.hidden = true;
    return;
  }
  spinner.hidden = true;
  if (!currentDecks || !currentDecks.length) { pill.hidden = true; return; }
  const deck = [...currentDecks].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
  pill.hidden = false;
  text.textContent = `🎞 ${deck.title || 'Deck'} · v${deck.version || 1}`;
  openBtn.hidden = false;
  openBtn.onclick = () => window.open('/deck/' + deck.id, '_blank');
}

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
    <button class="conv-item ${c.id === currentConversationId ? 'active' : ''}" data-id="${escHtml(c.id)}">
      <span class="t">${escHtml((c.title || '(sem título)').slice(0, 70))}
        <small>${new Date(c.updatedAt).toLocaleString('pt-BR')}${c.deckCount ? ' · ' + c.deckCount + ' deck' + (c.deckCount > 1 ? 's' : '') : ''}</small></span>
    </button>`).join('');
  $('convList').querySelectorAll('.conv-item').forEach((b) => {
    b.onclick = () => selectConversation(b.dataset.id);
  });
}

async function selectConversation(id) {
  if (chatBusy || !id) return;
  currentConversationId = id;
  attachedDocNames = [];
  $('fileChips').innerHTML = '';
  $('chatCol').innerHTML = '';
  renderConvList();
  try {
    const conv = await api('/api/conversations/' + id);
    currentDecks = conv.decks || [];
    if (conv.messages && conv.messages.length) renderMessages(conv.messages);
    else greet();
  } catch (e) {
    currentDecks = [];
    row('sys', '⚠ ' + escHtml(e.message));
  }
  updateDeckPill();
}

async function reloadConversationMeta() {
  if (!currentConversationId) return;
  try {
    const conv = await api('/api/conversations/' + currentConversationId);
    currentDecks = conv.decks || [];
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
  prev.innerHTML = `<img src="${dataUri}" alt="logo">`;
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
