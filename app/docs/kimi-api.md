Tenho dados suficientes para compilar o relatório. Aqui estão os resultados consolidados:

---

# Kimi for Coding — API Anthropic-Compatible: Relatório Técnico (Julho 2026)

---

## 1. Base URL e Autenticação

Existem **dois endpoints distintos** que não são intercambiáveis:

### A. Kimi for Coding (plano de assinatura — chaves `sk-kimi-...`)
- **Base URL Anthropic-compatible:** `https://api.kimi.com/coding/`
- Endpoint Messages: `POST https://api.kimi.com/coding/v1/messages`
- **Autenticação:** A chave vai em `ANTHROPIC_API_KEY` (env var padrão do Anthropic SDK). O SDK envia como `Authorization: Bearer <sk-kimi-...>`. **Não usa `x-api-key`.**
- Chaves gerenciadas em: [kimi.com/code console](https://www.kimi.com/code)

### B. Moonshot Open Platform (pay-per-token — chaves `sk-...` sem prefixo `kimi`)
- **Base URL Anthropic-compatible:** `https://api.moonshot.ai/anthropic`
- **Autenticação:** Use `ANTHROPIC_AUTH_TOKEN` (não `ANTHROPIC_API_KEY`) para evitar conflito. O SDK envia como `Authorization: Bearer <sk-...>`.
- Chaves em: [platform.kimi.ai](https://platform.kimi.ai/console/api-keys)

> **Armadilha crítica:** Nunca defina `ANTHROPIC_API_KEY` e `ANTHROPIC_AUTH_TOKEN` simultaneamente — Claude Code pega a credencial errada. As duas plataformas são completamente separadas; uma chave `sk-kimi-` não funciona no endpoint `moonshot.ai` e vice-versa.

---

## 2. IDs de Modelos

### Plano Kimi for Coding (`api.kimi.com/coding/`) — modelos por tier:

| Model ID (uso na API) | Modelo real | Context | Tier mínimo |
|-----------------------|-------------|---------|-------------|
| `k3` | Kimi K3 | 1M (Allegretto+) ou 256K (Moderato) | Moderato |
| `k3-256k` | Kimi K3, context fixo | 256K | Moderato |
| `kimi-for-coding` | Kimi K2.7 Code | 256K | Andante (todos) |
| `kimi-for-coding-highspeed` | Kimi K2.7 Code HighSpeed (~5–6× mais rápido) | 256K | Allegretto+ |

> Nota especial para Claude Code: A notation `k3[1m]` (com colchetes) é usada **exclusivamente** na env var `ANTHROPIC_MODEL` do Claude Code para sinalizar 1M de contexto. Em chamadas diretas à API use sempre `k3` sem colchetes.

### Moonshot Open Platform (`api.moonshot.ai/anthropic`) — model IDs diferentes:

| Model ID | Modelo real | Context |
|----------|-------------|---------|
| `kimi-k3` | Kimi K3 | 1M |
| `kimi-k2.7-code` | Kimi K2.7 Code | 256K |
| `kimi-k2.7-code-highspeed` | Kimi K2.7 Code HighSpeed | 256K |
| `kimi-k2.6` | Kimi K2.6 (fallback de thinking desativado) | 256K |

> "kimi k3" e "kimi k2.7" são as denominações corretas — os IDs divergem conforme o endpoint usado.

---

## 3. Compatibilidade com a Anthropic Messages API

### Campos suportados (confirmados):

| Campo | Status | Observação |
|-------|--------|------------|
| `model` | ✅ | IDs conforme tabela acima |
| `messages` | ✅ | |
| `system` (string ou array) | ✅ | |
| `tools` / `tool_use` / `tool_choice` | ✅ | Funciona após contornar filtro de User-Agent |
| `max_tokens` | ✅ | Default 131.072; máximo 1.048.576 |
| `temperature` | ✅ | **Atenção:** em `moonshot.ai/anthropic`, é rescalado internamente (real = request × 0.6) |
| `stream` (SSE) | ✅ | Retorna eventos SSE no formato Anthropic |
| `thinking` / extended thinking | ✅ | K3: `low`/`high`/`max`; K2.7: apenas `enabled` obrigatório |

### Campos ignorados ou não suportados:

| Campo | Comportamento | Observação |
|-------|---------------|------------|
| `cache_control` | **Silenciosamente ignorado** | Kimi usa cache por hash de conteúdo, não por marcadores. Os blocos são aceitos sem erro mas não têm efeito. |
| `anthropic-beta` header | Não confirmado | Não há documentação oficial sobre suporte a headers beta |
| `anthropic-version` header | Não confirmado — provavelmente não exigido | |
| `output_config` / `effort` | **Não confirmado** — hipótese: ignorado ou erro 400 | Não documentado |
| `json_schema` / structured outputs | **Não confirmado** — provavelmente não suportado | |
| `document` content blocks | **Erro 400** | Apenas `text`, `image`, `tool_use`, `tool_result`, `thinking` são aceitos |
| `stream_options` (campo OpenAI) | Pode causar erro 400 | |

---

## 4. Rate Limits e Limites de Tokens

### Plano de assinatura (`api.kimi.com/coding/`):
- ~300–1.200 requisições por janela de 5 horas (rolling)
- Até 30 requisições concorrentes
- `kimi-for-coding-highspeed` consome **3× cota**
- Existe limite mensal por tier (renovação semanal)

### Pay-per-token (`api.moonshot.ai/anthropic`):
- Tier 0 (sem top-up): 3 req/min, 1 concorrente — **inutilizável para agent loops**
- Tier 1 (a partir de USD 10 acumulados): limites maiores

### Max tokens e context windows:
- `max_tokens` default: 131.072; máximo: **1.048.576**
- K3 (`k3` / `kimi-k3`): 1M tokens (Allegretto+) ou 256K (Moderato)
- K2.7 Code: 256K tokens

---

## 5. Pegadinhas Conhecidas

1. **Filtro de User-Agent no `api.kimi.com/coding/`:** O Anthropic JS SDK envia `User-Agent: Anthropic/JS x.x.x` por padrão. O gateway da Kimi **rejeita qualquer User-Agent que comece com "Anthropic"** retornando HTTP 429 `"engine is currently overloaded"` — mesmo com quota disponível. Workaround: sobrescrever o defaultHeaders no SDK:
   ```typescript
   const client = new Anthropic({
     baseURL: "https://api.kimi.com/coding/",
     apiKey: process.env.SK_KIMI_KEY,
     defaultHeaders: { "user-agent": "my-app/1.0" }
   });
   ```

2. **Thinking obrigatório no K2.7 (`kimi-for-coding`):** Se thinking for desabilitado, a requisição é roteada internamente para K2.6, degradando a qualidade. O modelo também retorna erro 400 com `"only type=enabled is allowed for this model"` se thinking for explicitamente desabilitado.

3. **Bug de `reasoning_content` em multi-turn:** Em conversas multi-turno com thinking ativado, se um turn anterior do assistente contiver `tool_use` sem o campo `reasoning_content` correspondente, o endpoint retorna 400. Isso afeta principalmente SDKs que filtram `reasoning_content` antes de reenviar o histórico.

4. **`cache_control` aceita mas não funciona:** Os blocos são recebidos sem erro, mas a Kimi usa hash de conteúdo para caching — os marcadores Anthropic não têm efeito algum.

5. **Conflito de credenciais no Claude Code:** Se existir `ANTHROPIC_API_KEY` de uso anterior com Claude, ele entra em conflito com `ANTHROPIC_AUTH_TOKEN`. Remova o antigo do shell profile.

6. **Rescaling de temperatura:** No endpoint `moonshot.ai/anthropic`, a temperatura real aplicada é `request_temperature × 0.6` — não confirmado se afeta `api.kimi.com/coding/` da mesma forma.

---

## Exemplo de integração com `@anthropic-ai/sdk`

```typescript
import Anthropic from "@anthropic-ai/sdk";

// Plano Kimi for Coding (sk-kimi-... keys)
const client = new Anthropic({
  baseURL: "https://api.kimi.com/coding/",
  apiKey: process.env.SK_KIMI_KEY, // sk-kimi-...
  defaultHeaders: {
    // Obrigatório: contornar filtro de User-Agent do gateway Kimi
    "user-agent": "my-app/1.0",
  },
});

const response = await client.messages.create({
  model: "k3",               // ou "kimi-for-coding"
  max_tokens: 8192,
  system: "You are a helpful assistant.",
  messages: [{ role: "user", content: "Hello!" }],
  // thinking: { type: "enabled", budget_tokens: 5000 } // K3 suporta
  // NÃO enviar: cache_control, betas, document blocks, output_config
});
```

---

## Fontes

- [Use Kimi in Claude Code — Kimi API Platform (oficial)](https://platform.kimi.ai/docs/guide/claude-code-kimi)
- [Kimi Code Overview — kimi.com/code docs (oficial)](https://www.kimi.com/code/docs/en/)
- [Claude Code integration — kimi.com/code docs (oficial)](https://www.kimi.com/code/docs/en/third-party-tools/claude-code.html)
- [Kimi Code Models — kimi.com/code docs (oficial)](https://www.kimi.com/code/docs/en/kimi-code/models)
- [Error Reference — kimi.com/code docs (oficial)](https://www.kimi.com/code/docs/en/kimi-code/error-reference.html)
- [Kimi Code Providers — moonshotai GitHub CLI docs](https://moonshotai.github.io/kimi-cli/en/configuration/providers.html)
- [Kimi for Coding models — Mastra AI](https://mastra.ai/models/providers/kimi-for-coding)
- [Issue #129: canonicalizar referência do endpoint /anthropic — MoonshotAI/Kimi-K2 GitHub](https://github.com/MoonshotAI/Kimi-K2/issues/129)
- [Issue #4640: User-Agent filtering 429 — gsd-build GitHub](https://github.com/gsd-build/gsd-2/issues/4640)
- [cache_control analysis — pi-provider-kimi-code GitHub](https://github.com/Leechael/pi-provider-kimi-code/blob/main/docs/caching.md)
- [Kimi K3 with Claude Code — codeagentswarm.com](https://www.codeagentswarm.com/en/guides/kimi-k3-with-claude-code)