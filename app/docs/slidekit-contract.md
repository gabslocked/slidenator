# SlideKit — contrato do sistema de componentes

Motivação: a IA deixa de escrever HTML e passa a **preencher um JSON** (spec) por slide,
escolhendo componentes prontos e posicionando-os numa grade. O HTML final é renderizado
por código determinístico. Efeitos: custo por deck despenca (output curto), qualidade
visual consistente (componentes são nossos), validação vira código (sem revisor de IA
para estrutura).

Donos: `src/slidekit/**` + `template/skeleton.html` = agente SlideKit.
`src/pipeline.js`/`prompts.js`/`editdeck.js`/`agents.js`/`server.js` = agente Pipeline
(consome SlideKit APENAS por esta API). `public/**` = agente Viewer.

## 1 · API do módulo (`app/src/slidekit/index.js`)

```js
export const CATALOG;                    // { type: {schema-doc, required, ...} } (metadados)
export const CATALOG_PROMPT;             // string compacta p/ prompt da IA (catálogo + regras + ícones por categoria)
export const ICON_NAMES;                 // array com todos os nomes de ícone válidos
export function validateSpec(spec);      // -> issues: string[] (vazio = válido). Determinístico.
export function renderSlide(spec, ctx);  // -> { html, js } no MESMO shape dos builders atuais
// ctx = { index, brand: {name, logoDataUri?}, theme } — theme igual ao usado no assemble()
```

`renderSlide` produz `<section class="slide …">` compatível com o skeleton atual
(classes tailwind do template, sistema de reveal `rv`/`data-d`, `data-demo` quando houver
demo, JS registrando `demos.X = {start(){}}` com `every/later`). `validateDeck` atual
(ids/demos duplicados) continua valendo sobre o resultado renderizado.

## 2 · Formato do spec (o que a IA preenche)

```json
{
  "title": "Título do slide",
  "theme": "light" | "dark",
  "components": [
    {
      "type": "kpi",
      "area": [1, 2, 4, 3],
      "props": { "label": "Pedidos/mês", "value": 12400, "suffix": "", "trend": "+18%", "icon": "trending-up" },
      "reveal": 120
    }
  ],
  "demo": { "type": "counter-sim", "props": { … } } | null
}
```

- **Grade**: 12 colunas × 12 linhas sobre o palco 1280×720 (célula ≈106×60px), com
  padding externo fixo de 56px e gap de 16px embutidos no cálculo do renderer.
  `area = [col, row, colSpan, rowSpan]`, 1-based. Fora dos limites = issue de validação.
  Sobreposição = issue (exceto componentes com `layer: "bg"`).
- **Reveal**: opcional; se ausente o renderer escalona automaticamente (ordem × 70ms).
- **Ícones**: prop `icon` sempre por nome do conjunto Lucide vendorizado (ver §4).

## 3 · Catálogo mínimo (agente SlideKit pode ampliar, nunca reduzir)

Conteúdo: `heading` (título+kicker), `text`, `bullet-list` (reveal escalonado),
`quote`, `badge`, `big-number` (countup), `kpi`, `kpi-row`, `table`, `comparison`
(2 colunas antes/depois), `timeline` (h/v), `flow` (nós+setas), `icon-feature`,
`feature-grid`, `progress` (barras), `bar-chart` (animado), `line-chart` (SVG),
`donut`, `terminal` (código/log), `logo` (marca), `divider`, `image-placeholder`.
Interativos (viram `demos.X` com botão/controle): `counter-sim` (gerador de carga
métrica+barra), `toggle-sim` (antes/depois comutável), `live-feed` (itens chegando).

Cada componente: função de render pura (props → HTML com classes do template),
JS opcional (animações countup/barras já embutidas via reveal), entrada no
`CATALOG_PROMPT` com 1 linha de descrição + props (obrigatórias marcadas) + 1 exemplo
JSON curto. `CATALOG_PROMPT` inteiro deve caber em ~3-4k tokens.

## 4 · Ícones

Subconjunto de ~300 ícones **Lucide** (ISC/MIT) vendorizado como mapa de paths SVG em
`src/slidekit/icons.js` (gerado por script `scripts/build-icons.mjs` a partir do pacote
`lucide-static` — instalar com `--cache <scratchpad>/npm-cache`). Renderizados inline
`<svg … stroke="currentColor">` (herdam cor do texto). Cobrir categorias: negócios,
dados/gráficos, tecnologia/infra, pessoas/RH, finanças, tempo, comunicação, logística,
saúde, educação, setas/UI. `ICON_NAMES` exporta a lista; ícone desconhecido = issue de
validação + sugestão do mais próximo (distância de string simples).
O skeleton ganha suporte a esses SVGs mantendo os 33 ícones data-URI legados
(decks antigos são HTML estático salvo — não quebram de qualquer forma).

## 5 · Pipeline novo (agente Pipeline)

Papéis de modelo (roteáveis por env, defaults Cerebras):
- `outline` → `gpt-oss-120b` (barato): roteiro/arco narrativo + bullets por slide.
  Novo role em `agents.js` (`OUTLINE_PROVIDER`/`MODEL_OUTLINE`, fallback no pipeline).
- `pipeline` (spec-fill) → `zai-glm-4.7`: 1 chamada POR SLIDE que recebe
  CATALOG_PROMPT + outline do slide + tema da marca e devolve o spec JSON.
  Output pequeno (~1KB) → é aqui que o GLM barateia. Sem chamada de "diretor visual"
  e "engenheiro de interação" separados — o spec único substitui os dois.
- Revisor de IA morre para estrutura: `validateSpec` é código. Se houver issues,
  re-chama o spec-fill com as issues (máx 2 tentativas), senão aplica fallback
  determinístico (clamp de área / drop do componente inválido).
- Render + assemble determinísticos (0 tokens de IA para HTML).

Persistência: `decks.slides` (jsonb) passa a guardar os **specs**; `decks.html` continua
com o HTML final renderizado (rota `/deck/:id` inalterada; decks antigos seguem lendo o
html salvo). `edit_deck` recebe os specs atuais e devolve apenas os slides alterados
(spec novo), re-renderiza e re-monta.

Eventos SSE do job (contrato streaming-contract.md) inalterados: `outline`, `slide`
building/fixing/done por slide, `preview`, `deck_ready`.

## 6 · Custo alvo

~7 slides: outline 1×(in 2k/out 1.5k no gpt-oss) + spec 7×(in ~4k/out ~1.5k no GLM)
≈ 30k in / 12k out ≈ **US$ 0,03-0,05/deck** — ~3-5× mais barato que o GLM-HTML e com
render instantâneo (spec chega em ~2-4s por slide).
