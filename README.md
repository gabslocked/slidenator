# Slidenator

SaaS de apresentações HTML interativas geradas por conversa.

- `app/` — aplicação (Node + Postgres): chat de onboarding, pipeline multi-agente, decks vivos por conversa. Deploy: app.slidenator.com
- `landing/` — landing page (Vite + React). Deploy: slidenator.com.br

## Variáveis do app

| Variável | Função |
|---|---|
| `DATABASE_URL` | Postgres |
| `AI_PROVIDER` | provider padrão: `kimi` (padrão) · `cerebras` · `anthropic` |
| `CHAT_PROVIDER` / `PIPELINE_PROVIDER` | override por função (conversacional / agents de design-construção) |
| `MODEL_CHAT` / `MODEL_PIPELINE` | override de modelo (padrões: kimi → `kimi-for-coding`/`k3`; cerebras → `gpt-oss-120b`/`zai-glm-4.7`; anthropic → `claude-sonnet-5`/`claude-opus-4-8`) |
| `KIMI_API_KEY` · `CEREBRAS_API_KEY` · `ANTHROPIC_API_KEY` | chaves por provider |
| `PORT` | porta HTTP (padrão 4400) |

Exemplos: chat barato na Cerebras + pipeline no Kimi → `CHAT_PROVIDER=cerebras` (resto padrão). Tudo na Cerebras com GLM no design → `AI_PROVIDER=cerebras`. Os providers Anthropic-style e OpenAI-style são traduzidos por `app/src/agents.js` (JSON estruturado via prompt+extração onde não há suporte nativo; tool calls nos dois formatos).
