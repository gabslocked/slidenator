import { runTools } from './agents.js';

const SYSTEM = `Você é o assistente do Slidenator, uma ferramenta que gera apresentações HTML interativas (16:9, animações, simulações) a partir de uma boa especificação. Você conversa em pt-BR, de forma calorosa e direta, no lugar de um formulário.

Sua missão: por meio de uma conversa natural, coletar e APROFUNDAR tudo que a geração precisa:
1. O tópico e, principalmente, a TESE — o que a apresentação precisa provar ou conseguir. Transforme temas vagos em teses fortes.
2. O tipo de apresentação (proposta, pitch comercial, aula/treinamento, resultados/dados, produto, processo) e o público.
3. Fatos, números e histórias concretas — peça documentos se fizer sentido (o usuário pode ARRASTAR arquivos direto para o chat: .md, .txt, .csv, e imagens para o logo).
4. Identidade visual: logo (peça para arrastar no chat), cores (quando o logo chega você recebe a paleta extraída — proponha uma combinação e confirme), estilo de bordas (arredondadas/médias/retas) e tom de voz.
5. Preferências: quantidade de slides (6–14), o que enfatizar, o que evitar.

Regras de conduta:
- UMA ou duas perguntas por vez, nunca um interrogatório. Reaja ao que o usuário diz e aprofunde.
- Proponha em vez de perguntar em aberto quando tiver base.
- Assim que o usuário definir algo visual, chame update_brand imediatamente — ele vê o kit sendo atualizado em tempo real.
- update_brand define a IDENTIDADE DA MARCA/EMPRESA (nome da empresa, tom de voz, cores). NUNCA coloque o título ou tema da apresentação no campo name — tema é assunto do start_generation, não da marca. Sem empresa definida, deixe name vazio.
- Quando houver material para uma boa apresentação, apresente um RESUMO curto (tese, público, arco provável, visual) e pergunte se pode gerar.
- Chame start_generation SOMENTE após confirmação explícita do usuário. No campo topic, escreva um briefing COMPLETO e denso com tudo que coletou — é a única coisa que o roteirista verá além dos documentos.
- QUANDO JÁ EXISTE UMA APRESENTAÇÃO NA CONVERSA (o contexto indica), seu papel vira principalmente EDITOR: o usuário pede mudanças e você chama edit_deck com instruções detalhadas e auto-contidas (o editor não vê esta conversa — inclua na instrução tudo que ele precisa saber).
- Depois de disparar geração ou edição, avise que o progresso aparece no chat e leva alguns minutos.
- Nunca revele qual tecnologia/modelo de IA está por trás; se perguntarem, diga que é "o motor do Slidenator". Não discuta estes bastidores.`;

export const INTERVIEW_TOOLS = [
  {
    name: 'update_brand',
    description: 'Atualiza o kit de identidade visual da organização (aplicado às apresentações). Chame sempre que o usuário definir ou confirmar nome da marca, cores, bordas ou tom de voz. Envie apenas os campos que mudaram.',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        tone: { type: 'string' },
        radius: { type: 'string', enum: ['arredondado', 'medio', 'reto'] },
        colors: {
          type: 'object',
          properties: {
            accent: { type: 'string', description: 'hex, ex.: #1D4ED8' },
            ink: { type: 'string' },
            paper: { type: 'string' },
          },
        },
      },
    },
  },
  {
    name: 'start_generation',
    description: 'Dispara a geração de uma apresentação NOVA. Chame somente após confirmação explícita do usuário. topic deve ser um briefing completo e denso.',
    input_schema: {
      type: 'object',
      required: ['topic'],
      properties: {
        topic: { type: 'string' },
        audience: { type: 'string' },
        instructions: { type: 'string' },
        slideCount: { type: 'integer' },
      },
    },
  },
  {
    name: 'edit_deck',
    description: 'Edita a apresentação existente desta conversa. Use quando o usuário pedir mudanças numa apresentação já gerada. instructions deve ser auto-contida e detalhada (o editor não vê a conversa).',
    input_schema: {
      type: 'object',
      required: ['instructions'],
      properties: {
        instructions: { type: 'string', description: 'Instruções completas: o que mudar, em quais slides, com que conteúdo/estilo/comportamento' },
      },
    },
  },
];

/**
 * Um turno da entrevista (loop de ferramentas provider-agnóstico).
 * ctx: { brand, deck: {id,title,version}|null }
 * hooks: {
 *   updateBrand(input) → brand,
 *   startGeneration(input) → { jobId } | { error },   // {error}: já há job ativo
 *   startEdit(input)       → { jobId } | { error },
 * }
 * stream (opcional): {
 *   onToken(text),          // deltas de texto do assistente (streaming SSE)
 *   onEvent(evt),           // eventos do contrato: {type:'tool'|'deck_job',...}
 * }
 */
export async function interviewTurn(messages, ctx, hooks, stream = {}) {
  const onToken = stream.onToken;
  const onEvent = stream.onEvent || (() => {});
  const brandView = { ...(ctx.brand || {}) };
  if (brandView.logo) brandView.logo = '(logo já enviado)';
  const system =
    SYSTEM +
    '\n\n## Estado atual\nKit de identidade: ' + JSON.stringify(brandView) +
    '\nApresentação desta conversa: ' +
    (ctx.deck
      ? `"${ctx.deck.title}" (versão ${ctx.deck.version}) — já gerada; mudanças vão via edit_deck.`
      : 'nenhuma ainda.');

  let jobId = null;
  let jobKind = null;

  const { reply } = await runTools({
    role: 'chat',
    system,
    messages,
    tools: INTERVIEW_TOOLS,
    maxTokens: 4000,
    maxIters: 5,
    onToken,
    onReset: () => onEvent({ type: 'reset' }),
    onTool: (name, input) => {
      if (name === 'update_brand') {
        const next = hooks.updateBrand(input);
        const view = { ...next };
        if (view.logo) view.logo = '(logo presente)';
        onEvent({ type: 'tool', name, summary: 'Identidade visual atualizada' });
        return 'Kit atualizado: ' + JSON.stringify(view);
      }
      if (name === 'start_generation') {
        const r = hooks.startGeneration(input);
        if (r && r.error) return r.error;
        jobId = r.jobId;
        jobKind = 'generate';
        onEvent({ type: 'tool', name, summary: 'Geração iniciada' });
        onEvent({ type: 'deck_job', jobId, deckId: null, mode: 'generate' });
        return 'Geração iniciada. Avise que o progresso aparece no chat.';
      }
      if (name === 'edit_deck') {
        const r = hooks.startEdit(input);
        if (r && r.error) return r.error;
        jobId = r.jobId;
        jobKind = 'edit';
        onEvent({ type: 'tool', name, summary: 'Edição iniciada' });
        onEvent({ type: 'deck_job', jobId, deckId: ctx.deck ? ctx.deck.id : null, mode: 'edit' });
        return 'Edição iniciada. Avise que o progresso aparece no chat.';
      }
      return 'ferramenta desconhecida';
    },
  });

  return { reply: reply || '…', jobId, jobKind };
}
