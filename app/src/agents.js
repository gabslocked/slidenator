import Anthropic from '@anthropic-ai/sdk';

/**
 * Provider de IA — endpoint Anthropic-compatível configurável por env.
 * Padrão: Kimi for Coding (chaves sk-kimi-…), que expõe uma Messages API compatível.
 *   AI_API_KEY     chave (fallbacks: KIMI_API_KEY, ANTHROPIC_API_KEY)
 *   AI_BASE_URL    base do endpoint (padrão: https://api.kimi.com/anthropic)
 *   MODEL_PIPELINE modelo dos agents de design/construção (padrão: kimi-k3)
 *   MODEL_CHAT     modelo do conversacional (padrão: kimi-k2.7)
 *   AI_NATIVE=1    liga recursos exclusivos da API da Anthropic (thinking/effort/structured outputs)
 */
export function envAI() {
  return {
    apiKey: process.env.AI_API_KEY || process.env.KIMI_API_KEY || process.env.ANTHROPIC_API_KEY || '',
    baseURL: process.env.AI_BASE_URL || 'https://api.kimi.com/coding',
    modelPipeline: process.env.MODEL_PIPELINE || 'k3',
    modelChat: process.env.MODEL_CHAT || 'kimi-for-coding',
    native: process.env.AI_NATIVE === '1',
  };
}

export function makeClient() {
  const ai = envAI();
  if (!ai.apiKey) throw new Error('Nenhuma chave de IA configurada (AI_API_KEY)');
  if (ai.native) return new Anthropic({ apiKey: ai.apiKey, maxRetries: 3, timeout: 600000 });
  // Kimi for Coding: auth via Bearer e User-Agent custom (o gateway rejeita UA "Anthropic/…")
  return new Anthropic({
    authToken: ai.apiKey,
    baseURL: ai.baseURL,
    maxRetries: 3,
    timeout: 600000,
    defaultHeaders: { 'user-agent': 'slidenator/1.0' },
  });
}


/** Config de thinking adequada ao provider (Kimi exige/enche via enabled+budget; Anthropic usa adaptive). */
export function thinkingParam(maxTokens) {
  const ai = envAI();
  if (ai.native) return { type: 'adaptive' };
  return { type: 'enabled', budget_tokens: Math.max(1024, Math.min(8192, Math.floor((maxTokens || 8000) / 2))) };
}

async function finalMessage(client, params) {
  const stream = client.messages.stream(params);
  return await stream.finalMessage();
}

/** Extrai o primeiro objeto JSON válido de um texto (tolerante a cercas de código e prosa em volta). */
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

/**
 * Chamada que retorna um objeto no formato do schema.
 * Com AI_NATIVE=1 usa structured outputs nativos; caso contrário (Kimi),
 * injeta o schema no prompt e extrai o JSON da resposta.
 */
export async function callJSON(client, { model, system, user, schema, maxTokens, effort }) {
  const ai = envAI();
  const params = {
    model: model || ai.modelPipeline,
    max_tokens: maxTokens || 32000,
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  };
  params.thinking = thinkingParam(params.max_tokens);
  if (ai.native) {
    params.output_config = { effort: effort || 'high', format: { type: 'json_schema', schema } };
  } else {
    params.system[0].text +=
      '\n\n## FORMATO DE SAÍDA (OBRIGATÓRIO)\nResponda com UM ÚNICO objeto JSON válido, sem nenhum texto antes ou depois, sem cercas de código, obedecendo exatamente a este JSON Schema:\n' +
      JSON.stringify(schema);
  }
  const msg = await finalMessage(client, params);
  if (msg.stop_reason === 'refusal') throw new Error('O modelo recusou a solicitação');
  if (msg.stop_reason === 'max_tokens') throw new Error('Resposta truncada (max_tokens)');
  const text = msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return extractJSON(text);
}

/** Chamada de texto livre. */
export async function callText(client, { model, system, user, maxTokens }) {
  const ai = envAI();
  const msg = await finalMessage(client, {
    model: model || ai.modelPipeline,
    max_tokens: maxTokens || 8000,
    thinking: thinkingParam(maxTokens || 8000),
    system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: user }],
  });
  if (msg.stop_reason === 'refusal') throw new Error('O modelo recusou a solicitação');
  return msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
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
