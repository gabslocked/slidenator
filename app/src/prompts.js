/* ============================================================
 * Prompts e schemas do pipeline spec-fill.
 *
 * Fluxo novo (contrato slidekit §5):
 *   1) ROTEIRISTA (role `outline`)  → outline JSON: título, arco e, por slide,
 *      {title, objetivo, bullets, dados_sugeridos, tem_interatividade}.
 *   2) SPEC-FILL (role `pipeline`)  → 1 chamada por slide que devolve APENAS o
 *      spec JSON do contrato §2 (componentes numa grade 12×12). Sem HTML.
 *
 * O CATALOG_PROMPT (catálogo de componentes + ícones, vindo de src/slidekit) é
 * injetado no system do spec-fill/spec-edit em tempo de execução — por isso esses
 * prompts são builders (funções) e não constantes.
 * ============================================================ */

/* ============================================================
 * Schemas (structured outputs — Cerebras strict / OpenAI-compatível)
 *
 * Regras do strict: todo objeto precisa de additionalProperties:false e listar
 * TODAS as suas props em `required`; props opcionais viram nullable. A ÚNICA
 * exceção é o campo livre `props` dos componentes/demo, permissivo de propósito
 * (additionalProperties:true) — a validação real dele fica no validateSpec do
 * slidekit, não no schema.
 * ============================================================ */

// Objeto livre: chaves/valores dependem do tipo de componente. Validado no slidekit.
const FREE_PROPS = { type: 'object', additionalProperties: true, description: 'Props do componente conforme o catálogo (validadas pelo slidekit)' };

export const OUTLINE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'brand', 'audience', 'arco', 'slides'],
  properties: {
    title: { type: 'string', description: 'Título do deck (usado no <title>)' },
    brand: { type: 'string', description: 'Marca curta em caixa alta para o canto do palco, ex.: "ACME · TECNOLOGIA · 2026"' },
    audience: { type: 'string' },
    arco: { type: 'string', description: 'O arco narrativo do deck em 3-5 frases' },
    slides: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'kind', 'title', 'objetivo', 'bullets', 'dados_sugeridos', 'tem_interatividade'],
        properties: {
          id: { type: 'string', description: 'slug curto, ex.: "capa", "docker", "sql"' },
          kind: { type: 'string', enum: ['capa', 'contexto', 'conceito', 'comparacao', 'dados', 'ganhos', 'proposta', 'fechamento'] },
          title: { type: 'string', description: 'O título enuncia a tese, não o assunto' },
          objetivo: { type: 'string', description: 'A única ideia que o slide precisa provar' },
          bullets: { type: 'array', items: { type: 'string' }, description: '2-5 pontos de conteúdo concretos e curtos' },
          dados_sugeridos: { type: 'string', description: 'Números/fatos dos documentos do usuário relevantes a este slide (vazio se nenhum)' },
          tem_interatividade: { type: 'boolean', description: 'true se o slide pede uma demo interativa (simulação, comparação comutável, feed…)' },
        },
      },
    },
  },
};

// Spec de UM slide (contrato slidekit §2). reveal/layer são opcionais → nullable.
export const SPEC_FILL_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'theme', 'components', 'demo'],
  properties: {
    title: { type: 'string', description: 'Título do slide' },
    theme: { type: 'string', enum: ['light', 'dark'] },
    components: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['type', 'area', 'props', 'reveal', 'layer'],
        properties: {
          type: { type: 'string', description: 'Nome do componente do catálogo' },
          area: {
            type: 'array',
            items: { type: 'integer' },
            description: '[col, row, colSpan, rowSpan] 1-based na grade 12×12 (col+colSpan-1 ≤ 12, row+rowSpan-1 ≤ 12)',
          },
          props: FREE_PROPS,
          reveal: { type: ['integer', 'null'], description: 'Atraso do reveal em ms; null = escalona automático' },
          layer: { type: ['string', 'null'], enum: ['bg', 'normal', null], description: '"bg" permite sobreposição (fundo); senão null/"normal"' },
        },
      },
    },
    demo: {
      type: ['object', 'null'],
      additionalProperties: false,
      required: ['type', 'props'],
      description: 'Componente interativo do slide, ou null se estático',
      properties: {
        type: { type: 'string', description: 'Componente interativo do catálogo (counter-sim, toggle-sim, live-feed…)' },
        props: FREE_PROPS,
      },
    },
  },
};

/* ============================================================
 * System prompts
 * ============================================================ */

export const ROTEIRISTA_SYSTEM = `Você é o ROTEIRISTA de apresentações técnicas excepcionais em pt-BR, no estilo de decks interativos de engenharia.

Sua tarefa: transformar um tópico + documentos do usuário num roteiro de slides com arco narrativo forte. Você NÃO desenha o slide nem escreve HTML — só o roteiro.

Regras do roteiro:
- 8 a 14 slides (respeite a quantidade pedida pelo usuário, se houver).
- UM slide = UMA tese. O título enuncia a tese, não o assunto ("Como uma publicação acontece hoje" > "Processo atual").
- A ferramenta é GENERALISTA: o tópico pode ser proposta técnica, pitch comercial, aula/treinamento, apresentação de resultados, lançamento de produto, processo/onboarding, relatório… Identifique o tipo e escolha o arco adequado:
  · Proposta/mudança: capa → onde estamos (retrato respeitoso do presente) → conceitos demonstráveis → comparações antes/depois → ganhos → proposta gradual → fechamento.
  · Pitch comercial/produto: capa → a dor do cliente (vivida, não listada) → a solução em ação → diferenciais provados → números/resultados → oferta/próximos passos → fechamento.
  · Aula/treinamento: capa → por que isso importa → conceitos um a um, cada um com demo/quiz → erros comuns → recapitulação ativa → fechamento.
  · Resultados/dados: capa → contexto e meta → os números que importam (um insight por slide, com gráfico) → causas → o que faremos → fechamento.
- Por slide, preencha:
  · objetivo: a única ideia que o slide prova.
  · bullets: 2-5 pontos concretos e curtos (viram texto/cards no slide; nada de parágrafos).
  · dados_sugeridos: números e fatos concretos extraídos dos documentos relevantes a este slide (vazio se nenhum). Nunca invente números que contradigam os documentos.
  · tem_interatividade: true quando a tese fica mais forte com uma demo (cargas, filas, fluxos, funis, evolução no tempo, antes/depois comutável, feed ao vivo). Capa e fechamento normalmente false.
- Prefira teses DEMONSTRÁVEIS: que uma simulação, comparação animada, gráfico ou contador consiga provar.
- Tom: respeitoso com o presente, concreto, sem jargão gratuito, pt-BR (adapte ao tom de voz da marca, se informado).
- kind "capa" no primeiro slide, "fechamento" no último.`;

/** System do SPEC-FILL: regras + catálogo do slidekit injetado. */
export function specFillSystem(catalogPrompt) {
  return `Você é o DESIGNER-ENGENHEIRO de slides. Recebe o roteiro de UM slide e devolve APENAS o SPEC JSON dele (contrato §2): você escolhe componentes prontos do catálogo e os posiciona numa grade. Você NÃO escreve HTML — o render é determinístico.

## Grade e posicionamento
- Palco 1280×720 dividido em 12 colunas × 12 linhas. \`area = [col, row, colSpan, rowSpan]\`, 1-based.
- Tudo dentro dos limites: col+colSpan-1 ≤ 12 e row+rowSpan-1 ≤ 12.
- Componentes NÃO podem se sobrepor (exceto os que têm \`layer: "bg"\`, usados como fundo).
- Deixe respiro: nem todo slide precisa ocupar as 12 linhas.

## Regras de composição
- Máximo ~6 componentes por slide. Menos é mais: um herói + apoios.
- SEMPRE use ícones (prop \`icon\` com um nome do catálogo) nos componentes que aceitam — reforçam a leitura.
- Textos CURTOS que cabem na área: quanto menor o colSpan/rowSpan, menos palavras. Nada de parágrafos longos; transforme bullets em cards, kpis, comparações, timelines, gráficos.
- VARIEDADE de layout entre slides: você recebe um resumo dos specs já gerados — NÃO repita a mesma composição (não faça heading+bullet-list slide após slide). Alterne heróis: kpi-row, comparison, flow, timeline, bar-chart, feature-grid, donut, terminal…
- Capa e fechamento são DIFERENCIADOS: composição de destaque, poucos componentes, tipicamente tema dark, com logo/badge da marca. Evite tratá-los como um slide de conteúdo comum.
- Interatividade: se o roteiro pede (tem_interatividade), preencha o campo \`demo\` com um componente interativo do catálogo e seus props; senão \`demo\` = null.
- Escolha o \`theme\` (light/dark) coerente com o ritmo: capa dark → miolo claro → ganhos/fechamento dark.
- Respeite os props obrigatórios de cada componente e use apenas ícones da lista. Números concretos vindos do roteiro (dados_sugeridos) entram nos componentes certos.

## Riqueza e movimento (prioridade alta)
- Pense passo a passo antes de responder: qual é a UMA ideia deste slide, qual componente-herói a comunica melhor, e quais 3–5 apoios a sustentam. Slide cru e vazio é falha.
- PREFIRA componentes com animação embutida (bar-chart, line-chart, donut, progress, big-number com countup, timeline, flow) a texto estático — eles dão vida ao slide.
- Um slide bom tem 4 a 7 componentes bem distribuídos preenchendo o palco com equilíbrio (sem estourar, sem deixar metade vazia).
- Use \`demo\` (componente interativo) sempre que o assunto permitir demonstrar um fluxo/mecanismo, não só quando o roteiro pedir explicitamente — a interatividade é o diferencial do produto.
- Dados concretos e específicos sempre que possível; se o roteiro deu números, use-os; se pediu um mecanismo, monte-o com flow/timeline/comparison passo a passo.

${catalogPrompt}`;
}
