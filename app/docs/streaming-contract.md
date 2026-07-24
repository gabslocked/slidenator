# Contrato de streaming e estados — Slidenator

Contrato entre backend (`server.js`, `src/agents.js`, `src/pipeline.js`) e frontend
(`public/app.js`, `public/index.html`, `public/styles.css`). Ambos os lados implementam
EXATAMENTE isto; qualquer mudança é feita neste arquivo primeiro.

## 1 · Chat com streaming

`POST /api/chat` passa a responder `text/event-stream` (SSE). Cada evento é uma linha
`data: <json>\n\n`. Ordem dos eventos:

| Evento | Payload | Quando |
|---|---|---|
| `{"type":"start"}` | — | imediatamente após aceitar a requisição |
| `{"type":"token","text":"…"}` | delta de texto do assistente | a cada chunk do modelo |
| `{"type":"tool","name":"update_brand","summary":"…"}` | ferramenta executada | após executar cada tool call |
| `{"type":"deck_job","jobId":"…","deckId":"…","mode":"generate"}` | geração/edição disparada | quando a tool `start_generation`/`edit_deck` roda (`mode`: `generate` \| `edit`) |
| `{"type":"done","message":"<texto final>","conversationId":"…","title":"…"}` | fim do turno | sempre por último (exceto erro) |
| `{"type":"error","error":"…"}` | erro legível pt-BR | encerra o stream |

- Entre um `tool` e o próximo texto o modelo continua o loop de tools — o cliente pode
  receber `token` → `tool` → `token` → … em qualquer ordem, várias vezes.
- O texto completo final vem no `done.message` (fonte de verdade para persistir no
  histórico local; os tokens são só para exibição progressiva).
- `title` vem no `done` quando o servidor autotitulou a conversa.

## 2 · Stream do job (geração/edição)

`GET /api/jobs/:id/stream` (SSE, já existe) ganha eventos tipados além dos atuais
`{stage,msg,data}`:

| Evento | Payload |
|---|---|
| `{"type":"stage","stage":"roteiro\|design\|construcao\|montagem","msg":"…"}` | narração (compatível com o formato atual) |
| `{"type":"outline","title":"…","slides":["t1","t2",…]}` | roteiro pronto |
| `{"type":"slide","index":0,"total":7,"title":"…","status":"building\|fixing\|done"}` | progresso por slide |
| `{"type":"preview","version":3}` | preview parcial atualizado → cliente recarrega `/api/jobs/:id/preview?v=3` |
| `{"type":"deck_ready","deckId":"…","url":"/deck/<id>"}` | deck final persistido |
| `{"type":"error","error":"…"}` | falha |

`GET /api/jobs/:id/preview` → `text/html` com o deck parcial montado (slides prontos até
agora, via `assemble()` com os slides existentes; slides ainda não prontos aparecem como
placeholder). `204` se nenhum slide pronto. Mesma auth/escopo de org do job.

O pipeline (`runPipeline`/`runEditPipeline`) recebe um `emit` estendido:
`emit(stage, msg, data)` continua funcionando; eventos tipados são emitidos pelo
`server.js` a partir de callbacks novos opcionais no objeto de entrada
(`onSlide(slide, index, total, status)` e `onOutline(outline)`), para não acoplar o
pipeline ao SSE.

## 3 · Máquina de estados da conversa

Estado derivado no servidor e enviado em `GET /api/conversations/:id` como `state`:

```
briefing ──start_generation──▶ generating ──ok──▶ ready
   ▲                              │ erro              │ edit_deck
   └──────── (sem deck) ◀─────────┘                   ▼
                                   ready ◀──ok── editing ──erro──▶ ready
```

- `briefing`: sem deck e sem job ativo.
- `generating` / `editing`: job ativo (`jobId` incluído na resposta).
- `ready`: deck existe (`deckId`, `deckUrl`, `version` incluídos).
- Enquanto `generating`/`editing`: `/api/chat` continua aceitando mensagens (o usuário
  pode conversar), mas as tools `start_generation`/`edit_deck` retornam erro amigável ao
  modelo ("já há uma geração em andamento — avise o usuário"). Sem fila.
- Versões: cada geração/edição grava nova versão na tabela `decks` (já versionada);
  `GET /api/conversations/:id/decks` lista `[{id, version, title, createdAt}]`.

## 4 · Frontend — componentes spawnáveis no chat

Mensagens do assistente renderizam **markdown** (marked + DOMPurify, vendorizados em
`public/vendor/`). Além do texto, o cliente spawna componentes dedicados no corpo do
chat conforme os eventos:

- `card-brand` — quando `tool:update_brand`: chip com paleta/cor/logo aplicados.
- `card-generation` — quando `deck_job`: card fixo no fluxo com progresso por slide
  (lista do outline com estados building/fixing/done) + botão "acompanhar ao vivo".
- `card-deck` — quando `deck_ready`: card do deck com título, versão, abrir/apresentar.
- `card-error` — quando `error`.

## 5 · Split-view (visualizador ao vivo)

- Ao receber `deck_job`, o layout divide: chat à esquerda (~45%), visualizador à direita
  (iframe 16:9 + timeline dos agentes embaixo). Responsivo: em telas < 1024px o viewer
  vira overlay alternável.
- O iframe carrega `/api/jobs/:id/preview?v=N` a cada evento `preview` (recarregar src;
  debounce 800ms). Ao `deck_ready`, troca para `/deck/:id` definitivo.
- O viewer permanece aberto no estado `ready` (mostrando o deck final); botão fecha e
  volta ao layout de coluna única; o `deckPill` continua como atalho para reabrir.
- O chat permanece 100% interativo durante a geração.
