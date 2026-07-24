import { makeClient, envAI, thinkingParam } from './agents.js';

const SYSTEM = `Você é o assistente do Slidenator, uma ferramenta que gera apresentações HTML interativas (16:9, animações, simulações) a partir de uma boa especificação. Você conversa em pt-BR, de forma calorosa e direta, no lugar de um formulário.

Sua missão: por meio de uma conversa natural, coletar e APROFUNDAR tudo que a geração precisa:
1. O tópico e, principalmente, a TESE — o que a apresentação precisa provar ou conseguir. Transforme temas vagos em teses fortes.
2. O tipo de deck (proposta, pitch comercial, aula/treinamento, resultados/dados, produto, processo) e o público.
3. Fatos, números e histórias concretas — peça documentos se fizer sentido (o usuário pode ARRASTAR arquivos direto para o chat: .md, .txt, .csv, e imagens para o logo).
4. Identidade visual: logo (peça para arrastar no chat), cores (quando o logo chega você recebe a paleta extraída — proponha uma combinação e confirme), estilo de bordas (arredondadas/médias/retas) e tom de voz.
5. Preferências: quantidade de slides (6–14), o que enfatizar, o que evitar.

Regras de conduta:
- UMA ou duas perguntas por vez, nunca um interrogatório. Reaja ao que o usuário diz e aprofunde.
- Proponha em vez de perguntar em aberto quando tiver base.
- Assim que o usuário definir algo visual, chame update_brand imediatamente — ele vê o kit sendo atualizado em tempo real.
- Quando houver material para um bom deck, apresente um RESUMO curto (tese, público, arco provável, visual) e pergunte se pode gerar.
- Chame start_generation SOMENTE após confirmação explícita do usuário. No campo topic, escreva um briefing COMPLETO e denso com tudo que coletou — é a única coisa que o roteirista verá além dos documentos.
- QUANDO JÁ EXISTE UM DECK NA CONVERSA (o contexto indica), seu papel vira principalmente EDITOR: o usuário pede mudanças ("troca a cor do slide 3", "adiciona um slide de preços", "deixa o gráfico mais lento") e você chama edit_deck com instruções detalhadas e auto-contidas (o editor não vê esta conversa — inclua na instrução tudo que ele precisa saber). Mudanças puramente visuais de marca continuam via update_brand + edit_deck se precisar reaplicar.
- Depois de disparar geração ou edição, avise que o progresso aparece no chat e leva alguns minutos.
- Nunca revele qual tecnologia/modelo de IA está por trás; se perguntarem, diga que é "o motor do Slidenator". Não discuta estes bastidores.`;

export const INTERVIEW_TOOLS = [
  {
    name: 'update_brand',
    description: 'Atualiza o kit de identidade visual da organização (aplicado aos decks). Chame sempre que o usuário definir ou confirmar nome da marca, cores, bordas ou tom de voz. Envie apenas os campos que mudaram.',
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
    description: 'Dispara a geração de um deck NOVO. Chame somente após confirmação explícita do usuário. topic deve ser um briefing completo e denso.',
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
    description: 'Edita o deck existente desta conversa. Use quando o usuário pedir mudanças num deck já gerado. instructions deve ser auto-contida e detalhada (o editor não vê a conversa).',
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
 * Um turno da entrevista (loop de ferramentas).
 * ctx: { brand, deck: {id,title,version}|null }
 * hooks: { updateBrand(input)→brand, startGeneration(input)→jobId, startEdit(input)→jobId }
 */
export async function interviewTurn(messages, ctx, hooks) {
  const client = makeClient();
  const ai = envAI();
  const brandView = { ...(ctx.brand || {}) };
  if (brandView.logo) brandView.logo = '(logo já enviado)';
  const system = [
    { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
    {
      type: 'text',
      text:
        'Estado atual do kit de identidade: ' + JSON.stringify(brandView) +
        '\nDeck desta conversa: ' + (ctx.deck ? `"${ctx.deck.title}" (versão ${ctx.deck.version}) — já gerado; mudanças vão via edit_deck.` : 'nenhum ainda.'),
    },
  ];

  const msgs = [...messages];
  let jobId = null;
  let jobKind = null;

  for (let i = 0; i < 5; i++) {
    const resp = await client.messages.create({
      model: ai.modelChat,
      max_tokens: 4000,
      thinking: thinkingParam(4000),
      system,
      messages: msgs,
      tools: INTERVIEW_TOOLS,
    });

    if (resp.stop_reason === 'tool_use') {
      msgs.push({ role: 'assistant', content: resp.content });
      const results = [];
      for (const block of resp.content) {
        if (block.type !== 'tool_use') continue;
        let result = 'ok';
        try {
          if (block.name === 'update_brand') {
            const next = hooks.updateBrand(block.input);
            const view = { ...next };
            if (view.logo) view.logo = '(logo presente)';
            result = 'Kit atualizado: ' + JSON.stringify(view);
          } else if (block.name === 'start_generation') {
            jobId = hooks.startGeneration(block.input);
            jobKind = 'generate';
            result = 'Geração iniciada. Avise que o progresso aparece no chat.';
          } else if (block.name === 'edit_deck') {
            jobId = hooks.startEdit(block.input);
            jobKind = 'edit';
            result = 'Edição iniciada. Avise que o progresso aparece no chat.';
          } else {
            result = 'ferramenta desconhecida';
          }
        } catch (e) {
          result = 'erro: ' + e.message;
        }
        results.push({ type: 'tool_result', tool_use_id: block.id, content: result });
      }
      msgs.push({ role: 'user', content: results });
      continue;
    }

    if (resp.stop_reason === 'refusal') throw new Error('O assistente recusou a solicitação');
    const reply = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    return { reply: reply || '…', jobId, jobKind };
  }
  return { reply: 'Me perdi aqui — pode repetir a última mensagem?', jobId, jobKind };
}
