import Anthropic from '@anthropic-ai/sdk';

/**
 * Roteador de providers de IA — roteável por função via variáveis de ambiente.
 *
 *   AI_PROVIDER          provider padrão: kimi | cerebras | anthropic   (padrão: kimi)
 *   CHAT_PROVIDER        override do provider do conversacional
 *   PIPELINE_PROVIDER    override do provider dos agents de design/construção
 *   MODEL_CHAT           override do modelo do conversacional
 *   MODEL_PIPELINE       override do modelo da pipeline
 *
 *   KIMI_API_KEY (ou AI_API_KEY)   chave do Kimi for Coding (sk-kimi-…)
 *   CEREBRAS_API_KEY               chave da Cerebras (csk-…)
 *   ANTHROPIC_API_KEY              chave da Anthropic (recursos nativos)
 */
const PROVIDERS = {
  kimi: {
    style: 'anthropic',
    baseURL: 'https://api.kimi.com/coding',
    keys: ['KIMI_API_KEY', 'AI_API_KEY'],
    defaults: { chat: 'kimi-for-coding', pipeline: 'k3' },
    // gateway rejeita o User-Agent padrão do SDK; auth é Bearer
    bearer: true,
    userAgent: 'slidenator/1.0',
    thinking: 'enabled',
  },
  anthropic: {
    style: 'anthropic',
    baseURL: null,
    keys: ['ANTHROPIC_API_KEY'],
    defaults: { chat: 'claude-sonnet-5', pipeline: 'claude-opus-4-8' },
    native: true,
    thinking: 'adaptive',
  },
  cerebras: {
    style: 'openai',
    baseURL: 'https://api.cerebras.ai/v1',
    keys: ['CEREBRAS_API_KEY'],
    // gpt-oss-120b: barato/rápido com tool calls sólidos; zai-glm-4.7: forte em HTML/código
    defaults: { chat: 'gpt-oss-120b', pipeline: 'zai-glm-4.7' },
  },
};

export function resolveRole(role /* 'chat' | 'pipeline' */) {
  const upper = role.toUpperCase();
  const name = process.env[`${upper}_PROVIDER`] || process.env.AI_PROVIDER || 'kimi';
  const p = PROVIDERS[name];
  if (!p) throw new Error(`Provider desconhecido: ${name}`);
  const key = p.keys.map((k) => process.env[k]).find(Boolean) || '';
  if (!key) throw new Error(`Nenhuma chave configurada para o provider "${name}" (${p.keys.join(' ou ')})`);
  const model = process.env[`MODEL_${upper}`] || p.defaults[role];
  return { name, model, key, ...p };
}

/** Extrai o primeiro objeto JSON válido de um texto (tolera cercas de código e prosa). */
export function extractJSON(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [];
  if (fenced) candidates.push(fenced[1]);
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start !== -1 && end > start) candidates.push(text.slice(start, end + 1));
  candidates.push(text);
  for (const c of candidates) {
    try { return JSON.parse(c); } catch {}
  }
  throw new Error('Resposta não contém JSON válido');
}

const SCHEMA_SUFFIX = (schema) =>
  '\n\n## FORMATO DE SAÍDA (OBRIGATÓRIO)\nResponda com UM ÚNICO objeto JSON válido, sem nenhum texto antes ou depois, sem cercas de código, obedecendo exatamente a este JSON Schema:\n' +
  JSON.stringify(schema);

/* ============================================================
 * Backend estilo Anthropic (Kimi for Coding, Anthropic nativa)
 * ============================================================ */
function anthropicClient(p) {
  if (p.native) return new Anthropic({ apiKey: p.key, maxRetries: 3, timeout: 600000 });
  return new Anthropic({
    authToken: p.key,
    baseURL: p.baseURL,
    maxRetries: 3,
    timeout: 600000,
    defaultHeaders: p.userAgent ? { 'user-agent': p.userAgent } : undefined,
  });
}

function anthropicThinking(p, maxTokens) {
  if (p.thinking === 'adaptive') return { type: 'adaptive' };
  return { type: 'enabled', budget_tokens: Math.max(1024, Math.min(8192, Math.floor(maxTokens / 2))) };
}

async function anthropicMessage(p, { model, system, messages, tools, maxTokens }) {
  const client = anthropicClient(p);
  const params = {
    model,
    max_tokens: maxTokens,
    thinking: anthropicThinking(p, maxTokens),
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages,
  };
  if (tools) params.tools = tools;
  const stream = client.messages.stream(params);
  const msg = await stream.finalMessage();
  if (msg.stop_reason === 'refusal') throw new Error('O modelo recusou a solicitação');
  return msg;
}

async function anthropicRunTools(p, { model, system, messages, tools, onTool, maxTokens, maxIters }) {
  const msgs = [...messages];
  for (let i = 0; i < maxIters; i++) {
    const resp = await anthropicMessage(p, { model, system, messages: msgs, tools, maxTokens });
    if (resp.stop_reason === 'tool_use') {
      msgs.push({ role: 'assistant', content: resp.content });
      const results = [];
      for (const block of resp.content) {
        if (block.type !== 'tool_use') continue;
        let result;
        try { result = await onTool(block.name, block.input); }
        catch (e) { result = 'erro: ' + e.message; }
        results.push({ type: 'tool_result', tool_use_id: block.id, content: String(result) });
      }
      msgs.push({ role: 'user', content: results });
      continue;
    }
    const reply = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return { reply };
  }
  return { reply: 'Me perdi entre as ferramentas — pode repetir a última mensagem?' };
}

/* ============================================================
 * Backend estilo OpenAI (Cerebras)
 * ============================================================ */
function blocksToText(content) {
  if (typeof content === 'string') return content;
  if (!Array.isArray(content)) return String(content ?? '');
  return content
    .map((b) => {
      if (b.type === 'text') return b.text;
      if (b.type === 'image') return '[imagem anexada pelo usuário]';
      if (b.type === 'tool_result') return typeof b.content === 'string' ? b.content : '';
      return '';
    })
    .filter(Boolean)
    .join('\n');
}

function toOpenAIHistory(system, messages) {
  const out = [{ role: 'system', content: system }];
  for (const m of messages) {
    if (m.role !== 'user' && m.role !== 'assistant') continue;
    const text = blocksToText(m.content);
    if (text) out.push({ role: m.role, content: text });
  }
  return out;
}

async function openaiComplete(p, { model, messages, tools, maxTokens, schema }) {
  const body = { model, messages };
  if (schema) {
    body.response_format = { type: 'json_schema', json_schema: { name: 'saida', strict: true, schema } };
  }
  if (tools) {
    body.tools = tools.map((t) => ({
      type: 'function',
      function: { name: t.name, description: t.description, parameters: t.input_schema },
    }));
  }
  let lastErr;
  let budget = maxTokens;
  for (let attempt = 0; attempt < 5; attempt++) {
    body.max_tokens = budget;
    const res = await fetch(p.baseURL + '/chat/completions', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + p.key, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(600000),
    });
    if (res.ok) {
      const data = await res.json();
      const choice = data.choices[0];
      // modelos pensantes (ex.: GLM) gastam o orçamento no raciocínio antes do
      // conteúdo — se truncou, amplia o orçamento e tenta de novo (até 4×)
      if (choice.finish_reason === 'length' && budget < maxTokens * 4) {
        budget *= 2;
        continue;
      }
      if (choice.finish_reason === 'length') {
        throw new Error('Resposta truncada mesmo após ampliar max_tokens para ' + budget);
      }
      return choice.message;
    }
    const errText = await res.text().catch(() => '');
    lastErr = new Error(`Cerebras ${res.status}: ${errText.slice(0, 200)}`);
    if (res.status !== 429 && res.status < 500) break;
    await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
  }
  throw lastErr;
}

async function openaiRunTools(p, { model, system, messages, tools, onTool, maxTokens, maxIters }) {
  const msgs = toOpenAIHistory(system, messages);
  for (let i = 0; i < maxIters; i++) {
    const msg = await openaiComplete(p, { model, messages: msgs, tools, maxTokens });
    const calls = msg.tool_calls || [];
    if (calls.length) {
      msgs.push({ role: 'assistant', content: msg.content || '', tool_calls: calls });
      for (const call of calls) {
        let result;
        try {
          const input = JSON.parse(call.function.arguments || '{}');
          result = await onTool(call.function.name, input);
        } catch (e) {
          result = 'erro: ' + e.message;
        }
        msgs.push({ role: 'tool', tool_call_id: call.id, content: String(result) });
      }
      continue;
    }
    return { reply: (msg.content || '').trim() };
  }
  return { reply: 'Me perdi entre as ferramentas — pode repetir a última mensagem?' };
}

/* ============================================================
 * API unificada
 * ============================================================ */

/** Texto livre. */
export async function aiText({ role, system, user, maxTokens = 8000 }) {
  const p = resolveRole(role);
  if (p.style === 'openai') {
    const msg = await openaiComplete(p, {
      model: p.model,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
      maxTokens,
    });
    return (msg.content || '').trim();
  }
  const msg = await anthropicMessage(p, {
    model: p.model, system, maxTokens,
    messages: [{ role: 'user', content: user }],
  });
  return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
}

/** Objeto no formato do schema (structured outputs nativos quando o provider suporta; senão schema no prompt + extração). */
export async function aiJSON({ role, system, user, schema, maxTokens = 32000 }) {
  const p = resolveRole(role);
  if (p.style === 'openai') {
    try {
      const msg = await openaiComplete(p, {
        model: p.model,
        messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
        maxTokens,
        schema,
      });
      return extractJSON(msg.content || '');
    } catch (e) {
      // schema recusado pelo servidor → volta ao modo schema-no-prompt
      if (!/response_format|json_schema|schema/i.test(e.message)) throw e;
      const msg = await openaiComplete(p, {
        model: p.model,
        messages: [{ role: 'system', content: system + SCHEMA_SUFFIX(schema) }, { role: 'user', content: user }],
        maxTokens,
      });
      return extractJSON(msg.content || '');
    }
  }
  if (p.native) {
    const client = anthropicClient(p);
    const stream = client.messages.stream({
      model: p.model,
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      output_config: { effort: 'high', format: { type: 'json_schema', schema } },
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: user }],
    });
    const msg = await stream.finalMessage();
    if (msg.stop_reason === 'refusal') throw new Error('O modelo recusou a solicitação');
    return JSON.parse(msg.content.find((b) => b.type === 'text')?.text ?? '');
  }
  const msg = await anthropicMessage(p, {
    model: p.model,
    system: system + SCHEMA_SUFFIX(schema),
    maxTokens,
    messages: [{ role: 'user', content: user }],
  });
  if (msg.stop_reason === 'max_tokens') throw new Error('Resposta truncada (max_tokens)');
  return extractJSON(msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'));
}

/**
 * Loop de ferramentas provider-agnóstico.
 * tools no formato Anthropic ({name, description, input_schema}); o backend converte se preciso.
 * messages: [{role:'user'|'assistant', content: string | blocos}] (histórico da conversa).
 * onTool(name, input) → string com o resultado.
 */
export async function runTools({ role, system, messages, tools, onTool, maxTokens = 4000, maxIters = 5 }) {
  const p = resolveRole(role);
  const args = { model: p.model, system, messages, tools, onTool, maxTokens, maxIters };
  return p.style === 'openai' ? openaiRunTools(p, args) : anthropicRunTools(p, args);
}

/** Executa tarefas com concorrência limitada preservando a ordem. */
export async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
