# DeckForge

Gerador local de **apresentações HTML interativas** (palco 16:9, animações, simulações clicáveis) no padrão do deck da ADMEX, usando uma pipeline multi-agente sobre a API da Anthropic.

## Como usar

```bash
cd deckforge
npm install
npm start          # http://localhost:4400
```

1. Exporte o token antes de subir: `export ANTHROPIC_API_KEY=sk-ant-…` (um `config.json` local com `apiKey` também funciona como fallback; a variável de ambiente tem precedência).
2. Abra `http://localhost:4400` — **a interface é um chat** (estilo ChatGPT, visual minimalista claro). O assistente de onboarding (`claude-sonnet-5`, barato) entrevista você: lapida a tese, aprofunda público/fatos e coleta a identidade visual na conversa — **arraste o logo e documentos direto no chat** (ou botão ＋). O logo tem a paleta extraída na hora e o assistente preenche o kit de identidade via tool use.
3. Quando você disser "pode gerar", o assistente monta o briefing e dispara a pipeline — o progresso dos agents aparece como um card dentro do próprio chat.
4. **Menu lateral**: lista das apresentações geradas (clique para abrir) e ⚙ Configurações (modelo/esforço da geração, status do token, ajuste fino da identidade visual). "＋ Nova conversa" zera o chat.
5. O deck sai em `output/*.html` — arquivo único, 16:9, navegável com as setas. A ferramenta é generalista: proposta técnica, pitch, aula, resultados, produto, processo…

Custo/tempo: uma geração faz ~15–25 chamadas ao modelo (padrão `claude-opus-4-8`) e leva alguns minutos.

## A pipeline multi-agente

```
tópico + docs
   │
   ▼
1. ROTEIRISTA        um slide = uma tese; arco: presente → conceitos → comparações → ganhos → proposta
   ▼
2. DIRETOR VISUAL    layout de cada slide com o sistema de design (tokens, cards, medidores, ícones)
   ▼
3. ENG. DE INTERAÇÃO padrão de demo por slide (botão-cenário, passo a passo, lado a lado, terminal…)
   ▼
4. CONSTRUTORES      em paralelo (3 por vez): HTML da <section> + JS da demo, com few-shot real
   ▼                 └─ validação estática → REVISOR corrige (até 2 passadas por slide)
5. MONTAGEM          injeta tudo no template/skeleton.html + validação do deck inteiro
```

Detalhes técnicos:
- **Structured outputs** (`output_config.format: json_schema`) em todas as etapas — nada de parsear texto solto.
- **Streaming** em todas as chamadas (respostas longas sem timeout).
- **Prompt caching**: o system prompt de cada agent (com o design system e o exemplo few-shot) leva `cache_control`, então as chamadas por slide reusam o prefixo.
- **Validação estática** (`src/validate.js`): section única, divs balanceadas, ids do JS existem no HTML, ícones da lista oficial, `data-demo` ↔ `demos.X`, sintaxe do JS, sem `setInterval` cru, sem recursos externos, e **orçamento de altura** (nada posicionado além do palco de 720px).
- **Tema por marca** (`src/brand.js` + `src/assemble.js`): os tokens do design system são semânticos — `deriveColors()` gera a paleta inteira (kicker, barras, tints, cards dark) a partir de destaque + fundos; o raio de borda é reescrito por CSS; contraste de texto sobre a cor de destaque é ajustado automaticamente pela luminância; o logo entra no chrome de todos os slides. **Anti-estouro**: todo `.slide` tem `overflow:hidden`, então nenhuma animação vaza do palco.

## Estrutura

```
deckforge/
├── server.js            servidor HTTP (Node puro) + SSE de progresso
├── public/              UI modular: index.html (marcação) + styles.css + app.js (chat, sidebar, anexos)
├── src/
│   ├── pipeline.js      orquestração das 5 etapas
│   ├── agents.js        chamadas à API (streaming, schemas, concorrência)
│   ├── prompts.js       system prompts dos agents + schemas + few-shot
│   ├── validate.js      validação estática de slide e de deck
│   ├── assemble.js      injeção no skeleton
│   └── config.js        config.json local (token, modelo, esforço)
├── template/
│   ├── skeleton.html    runtime extraído do deck ADMEX (palco, reveal, nav, ícones)
│   └── design-system.md linguagem visual + convenções (vai dentro dos prompts)
├── scripts/selftest.js  monta um deck de amostra sem usar a API
└── output/              decks gerados
```

## O runtime dos decks gerados

Todo deck herda do `template/skeleton.html`:
- Palco fixo **1280×720** escalado à janela; navegação por setas/PageUp/Down/Home/End e hash (`#slide-3`).
- Sistema de **reveal** em cascata (`rv` + `data-d`), contadores animados (`data-countup`), 33 ícones embutidos como data URI.
- Registry de demos: cada slide interativo declara `data-demo="nome"` e registra `demos.nome = { start() {...} }`; timers via `every/later` são limpos na troca de slide.

Limitação conhecida: o Tailwind vem do CDN (`cdn.tailwindcss.com`) — os decks precisam de internet na primeira carga. Para apresentar offline, gere antes e deixe a página aberta, ou embuta o CSS (roadmap).

## Selftest (sem API)

```bash
node scripts/selftest.js   # valida template+montagem e gera output/selftest.html
```

## Segurança

- O token nunca sai da sua máquina exceto para `api.anthropic.com` (via SDK oficial).
- `config.json` está no `.gitignore`.
- O servidor é local (sem CORS, sem auth) — não exponha a porta 4400 na rede.
