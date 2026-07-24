# Estado da Arte: Geração Automática de Apresentações HTML Interativas por IA

**Data da pesquisa:** julho 2026
**Escopo:** ferramentas, papers, considerações práticas e padrões de prompt para geração de decks HTML 16:9 interativos via pipeline multi-agente (Claude API)

---

## 1. Ferramentas Existentes

### 1.1 SaaS Proprietários

#### Gamma.app
**Abordagem:** LLM gera um outline estruturado e preenche cada card/slide com conteúdo e visuais. Suporta upload de documentos (DOC, PDF, PPTX, MD, CSV, HTML, EPUB e outros, até 10 MB). Gera apresentações em 60+ idiomas. O sistema analisa a estrutura do conteúdo e aplica layouts, paletas e tipografia automaticamente.
**O que gera:** Formato proprietário de "cards" web — não é HTML livre; é renderizado no player do Gamma. Exporta para PPTX e PDF.
**Limitações:** Interatividade restrita a navegação entre cards; sem simulações clicáveis; impossível extrair HTML auto-contido e limpo; dependente de plataforma cloud; sem acesso programático ao DOM gerado.
**Fonte:** [gamma.app](https://gamma.app) | [gamma.app/ai-presentation-generator](https://gamma.app/ai-presentation-generator)

#### Tome.app
**Abordagem:** Usava modelos da OpenAI para gerar "pages" — um formato de documento scrollável vertical, não slides com dimensões fixas.
**O que gera:** Produto de apresentações **descontinuado em março 2025**. O Tome pivotou completamente para automação de vendas e pesquisa de contas corporativas (account intelligence).
**Limitações:** Não é mais uma opção para geração de slides. Qualquer integração existente deve ser migrada.
**Fonte:** [Tome AI Review 2025 – max-productive.ai](https://max-productive.ai/ai-tools/tome/) | [Tome 2026 Review – keynote.org.cn](https://keynote.org.cn/blog/tome-review-2026-en/)

#### Beautiful.ai
**Abordagem:** Motor proprietário "Smart Slides" (patenteado). Gera um outline de texto primeiro (revelando estrutura narrativa, bullet points e sugestões visuais por slide) e depois aplica templates que auto-ajustam layout, espaçamento e tipografia conforme o conteúdo é editado.
**O que gera:** PPTX, PDF e Google Slides — não HTML livre. 60+ smart templates que se adaptam automaticamente. Nenhuma interatividade JavaScript.
**Limitações:** Totalmente template-bound; impossível gerar HTML livre com lógica customizada; sem animações programáticas; custo de assinatura; sem self-hosting; API não pública.
**Fonte:** [beautiful.ai](https://www.beautiful.ai/) | [Beautiful.ai Review 2026 – max-productive.ai](https://max-productive.ai/ai-tools/beautiful-ai/)

---

### 1.2 Open Source Relevantes

#### Presenton — `github.com/presenton/presenton`
**Abordagem:** Self-hosted com Docker. Multi-provider (OpenAI, Gemini, Anthropic, Ollama, self-hosted endpoints). Usa templates em HTML + Tailwind CSS com temas configuráveis. Expõe REST API para geração programática e gerenciamento de apresentações. Licença Apache-2.0. Open-sourced em 10/05/2025.
**O que gera:** PPTX e PDF. **Não gera HTML interativo livre.**
**Limitações:** Output restrito a PPTX/PDF; interatividade zero; a pipeline não é multi-agente — é essencialmente uma call única ao LLM com um template Tailwind; drag-edit limitado à UI própria.
**Fonte:** [github.com/presenton/presenton](https://github.com/presenton/presenton) | [presenton.ai](https://presenton.ai/)

#### OpenSlides — `github.com/YuxiangChai/OpenSlides`
**Abordagem:** Pipeline com **4 agentes especializados**: (1) Planning Agent — avalia se a request precisa de web search ou análise de dados antes de gerar; (2) Search Agent — integra Tavily para busca na web; (3) Data Analytics Agent — processa CSV/XLS/XLSX executando Python local via `uv run --script`, retorna resultados sumarizados; (4) Generation Agent — gera HTML reveal.js a partir de prompt, contexto do projeto, fontes enviadas e outputs dos agentes anteriores. Suporta múltiplos providers nativos: Gemini, Claude, OpenAI; e compatíveis com OpenAI: Kimi, GLM, Qwen, MiniMax, OpenRouter.
**O que gera:** reveal.js em HTML com export standalone. Edição dual: visual preview com edição de texto direto, ou acesso ao raw HTML/CSS. Controles de apresentação: fullscreen, overview, speaker notes, auto-play.
**Limitações:** Crítica e validação automática não implementadas; dependente do framework reveal.js (não HTML totalmente livre); projetos armazenados localmente em `projects/`.
**Fonte:** [github.com/YuxiangChai/OpenSlides](https://github.com/YuxiangChai/OpenSlides)

#### slides-ai-plugin — `github.com/proyecto26/slides-ai-plugin`
**Abordagem:** Agent skill para Claude Code, OpenClaw e outros agentes. Workflow: Blueprint → Review → HTML → Review. Suporta GSAP timelines, CSS animations, viewport fitting, Mermaid diagrams, inline video e `contenteditable` para edição live no browser. 12 style presets curados.
**O que gera:** HTML animado auto-contido 16:9 (GSAP + CSS, single-file, sem build step) OU PPTX (.pptx) totalmente editável.
**Limitações:** Depende de CDN do GSAP por padrão (violando self-contained); interatividade complexa além de animações requer engenharia adicional; sem pipeline de validação automática.
**Fonte:** [github.com/proyecto26/slides-ai-plugin](https://github.com/proyecto26/slides-ai-plugin)

#### frontend-slides — `github.com/zarazhangrui/frontend-slides` (26.1k stars)
**Abordagem:** Agent skill portátil (Claude Code, Gemini CLI, GitHub Copilot, OpenAI Codex). Component library rica: flip cards, expandable cards, code blocks com syntax highlight, architecture flows, stats cards, charts, PPT conversion, HTML conversion. Zero dependências externas — CSS/JS inline.
**O que gera:** HTML auto-contido com animações. Converte também para reveal.js e Marp.
**Limitações:** Não é uma aplicação independente — é uma skill para agentes; qualidade do output depende fortemente da qualidade do prompt dado ao agente.
**Fonte:** [skillsllm.com/skill/frontend-slides](https://skillsllm.com/skill/frontend-slides) | [tosea.ai/slide-skills](https://tosea.ai/slide-skills)

#### allweonedev/presentation-ai — `github.com/allweonedev/presentation-ai`
**Abordagem:** Alternativa open source ao Gamma. Suporta Ollama e LM Studio como providers locais além de APIs cloud. Self-hostable.
**O que gera:** PPTX e HTML com 18 temas pré-definidos.
**Limitações:** HTML de saída baseado em temas fixos, não HTML livre; interatividade mínima; menos maduro que Presenton.
**Fonte:** [github.com/allweonedev/presentation-ai](https://github.com/allweonedev/presentation-ai)

---

### 1.3 Presentation-as-Code + LLM

#### Slidev + LLM
**Abordagem:** Framework Markdown + Vue.js para desenvolvedores. Não é AI-native, mas é ideal para LLMs: formato texto puro, sintaxe bem representada no training data, sem binary containers. LLMs podem gerar o arquivo `.md` inteiro, com code blocks, diagramas e componentes Vue em um único pass.

**Ferramentas AI sobre Slidev:**
- **slidaiv** (VSCode extension) — gera conteúdo Slidev via LLM usando OpenAI ou API compatível: [github.com/kaakaa/slidaiv](https://github.com/kaakaa/slidaiv)
- **Next-AI-Slide** — gerador de Markdown Slidev via prompt natural com copy/download: [github.com/lvy010/Next-AI-Slide](https://github.com/lvy010/Next-AI-Slide)
- **Slidev-AI** — web app com LLM para geração minimalista voltada a engenheiros e acadêmicos: [github.com/LSTM-Kirigaya/slidev-ai](https://github.com/LSTM-Kirigaya/slidev-ai)

**Limitações:** Slidev exporta HTML/PDF mas não é 100% standalone — requer build step (Node/npm). Animações são controladas por Vue components, menos flexíveis que JS puro para simulações customizadas.

#### Marp + LLM
**Abordagem:** Markdown to slides com export para PDF, PPTX e HTML via CLI. A sintaxe YAML front matter + separadores `---` é altamente familiar para LLMs (pesada presença no training data). Argumento de engenharia central: LLMs processam texto nativamente — formatos binários como PPTX requerem extração, conversão e introduzem ruído que degrada a qualidade do output.

**Projetos relevantes:**
- **marp-ai-slide-generator** (itarutomy97) — JSON → Markdown automático, 30+ templates integrados: [github.com/itarutomy97/marp-ai-slide-generator](https://github.com/itarutomy97/marp-ai-slide-generator)
- **marptalk** (imjasonh) — narração em áudio gerada por AI integrada às apresentações: [github.com/imjasonh/marptalk](https://github.com/imjasonh/marptalk)

**Limitações:** HTML exportado pelo Marp não permite interatividade JavaScript rich; para simulações clicáveis e terminais fake, não é a escolha adequada.
**Fonte:** [MARP + LLMs: The Engineering Case – Medium](https://medium.com/@matias.sulik/marp-llms-the-engineering-case-for-presentations-as-text-f806da6e6eea)

#### reveal.js + LLM (Claude Code Skills)
**Abordagem:** reveal.js é o framework HTML de apresentações mais maduro e battle-tested. Vários Claude Code skills o usam como target de geração.

**Projetos:**
- **revealjs-skill** (ryanbbrown): themes, multi-column layouts, callout boxes, code highlighting com animação linha a linha, speaker notes: [github.com/ryanbbrown/revealjs-skill](https://github.com/ryanbbrown/revealjs-skill)
- **html-slides** (bluedusk): Agent Skills Standard multi-provider — funciona em Claude Code, Gemini CLI, GitHub Copilot e OpenAI Codex no mesmo install: [github.com/bluedusk/html-slides](https://github.com/bluedusk/html-slides)
- **HTML Presentation Generator** (mcpmarket): enforça 960x540px fixo, 12-column grid, paleta específica, sem dependências externas: [mcpmarket.com/tools/skills/html-presentation-generator](https://mcpmarket.com/tools/skills/html-presentation-generator)

**Limitações documentadas (encontradas empiricamente):** reveal.js clona code blocks para line-by-line highlighting via `position: absolute`. Tematizar sem considerar essa clonagem causa ghosting de texto, stair-stepping e headings desaparecendo — bug de causa única com múltiplos sintomas visuais simultâneos.
**Fonte:** [What I learned building a slide-deck skill – DEV Community](https://dev.to/arifszn/what-i-learned-building-a-slide-deck-skill-for-ai-agents-1jgd)

#### Claude Artifacts Style (HTML livre 16:9)
**Abordagem:** Claude gera HTML/CSS/JS auto-contido renderizado inline no chat. Claude Design (anunciado em abril 2026) nomeia slides e one-pagers como target outputs explícitos. O sistema enforça viewport 16:9 (960x540px típico), 12-column grid, e pode usar Chart.js, CSS keyframes, multi-slide navigation.
**O que gera:** HTML completamente livre — qualquer estrutura, animação, JS.

**Limitações documentadas empiricamente:**
- Versionamento via chat turns, não file-based — impossível rastrear histórico fora da conversa
- Non-technical reviewers não conseguem editar clicando — precisam descrever mudanças em texto
- Agent continuation problemática: cada turn pode reescrever todo o HTML
- Compartilhamento de artifact expõe attachments da conversa original
- Adequado para demos rápidos; inadequado para decks com múltiplos review rounds ou colaboração de equipe

**Fonte:** [Deckary – Claude Artifacts for Presentations: What Works and What Breaks](https://deckary.com/blog/claude-artifacts-presentations) | [designproject.io – Build Presentations with Claude Code](https://designproject.io/blog/build-presentations-with-claude-code-stop-designing-decks-in-figma-and-ship-interactive-ones-instead/)

---

## 2. Papers e Técnicas

### 2.1 PPTAgent — "Generating and Evaluating Presentations Beyond Text-to-Slides"
**Referência:** arxiv 2501.03936, Jan 2025; publicado em EMNLP 2025

**Motivação:** Abordagens text-to-slides anteriores simplificam o problema a summarização abstrata e operam sem planejamento holístico — ignoram qualidade visual e consistência estrutural.

**Pipeline (duas fases):**
1. **Analysis Phase:** Examina apresentações de referência; extrai tipos funcionais por slide (capa, agenda, conteúdo, conclusão etc.) e schemas de conteúdo (estrutura esperada de elementos)
2. **Outline Generation + Iterative Editing:**
   - Gera outline estruturado onde cada entrada = (slide novo a criar, slide de referência selecionado por similaridade funcional, conteúdo relevante do documento de entrada)
   - Edita elementos do slide de referência via APIs (`edit`, `remove`, `duplicate`) para produzir o slide final — nunca gera do zero

**Avaliação (PPTEval):** 3 dimensões independentes — Content (qualidade textual e factual), Design (coerência visual e estética), Coherence (consistência estrutural e narrativa do deck como um todo)

**Resultado:** Supera todos os métodos existentes nas 3 dimensões simultaneamente.

**Insight chave para builders:** A abordagem edit-based (editar um template de referência) é mais confiável do que geração from-scratch — preserva layout e estilo do template enquanto injeta conteúdo novo. Aplicável ao HTML: manter um skeleton HTML e preencher placeholders, em vez de gerar HTML livre completo.

**Fonte:** [arxiv.org/abs/2501.03936](https://arxiv.org/abs/2501.03936) | [HuggingFace paper page](https://huggingface.co/papers/2501.03936)

---

### 2.2 "Learning to Present: Inverse Specification Rewards for Agentic Slide Generation"
**Referência:** arxiv 2603.16839, Mar 2026

**Pipeline:** Research (busca de conteúdo) → Content Planning (estrutura narrativa) → HTML Generation via tool use (o agente usa ferramentas para escrever arquivos e renderizar)

**Técnica central — RL com GRPO:** Fine-tune de Qwen2.5-Coder-7B com Grouped Relative Policy Optimization, ajustando apenas 0.5% dos parâmetros. Training data: demonstrações coletadas via Claude Opus 4.6 em 48 business briefs diversos.

**Inverse Specification Rewards (técnica nova):** Um LLM avaliador tenta reconstruir a especificação original (brief, objetivo, audiência) a partir apenas dos slides gerados. Se consegue reconstruir fielmente, é um sinal holístico de que a apresentação comunica bem seu propósito. Funciona como "task inversa" — mede fidelidade entre conceito e execução sem necessidade de ground truth slide-a-slide.

**Multi-component reward system:**
- Validação estrutural (HTML válido, elementos presentes)
- Qualidade de render (headless browser screenshot sem erros)
- Avaliação estética por LLM
- Qualidade de conteúdo

**Resultado:** Modelo 7B fine-tunado atinge **91.2% da qualidade do Claude Opus 4.6**, com 33.1% de melhoria sobre o base model Qwen2.5-Coder.

**Finding crítico:** Instruction adherence e tool-use compliance são os principais determinantes de qualidade em tarefas agênticas — mais relevantes do que o tamanho do modelo.

**Fonte:** [arxiv.org/abs/2603.16839](https://arxiv.org/abs/2603.16839)

---

### 2.3 "Talk to Your Slides" — High-Efficiency Slide Editing via Language-Driven Structured Data Manipulation
**Referência:** arxiv 2505.11604, Mai 2025

**Sistema de 4 componentes para edição eficiente:**
1. **Instruction Understanding:** LLM interpreta comando do usuário → plano estruturado especificando quais slides modificar, quais elementos targetar e que tipo de edição realizar
2. **Document Understanding:** Parsing rule-based (não LLM) do PPTX → JSON estruturado capturando texto no nível de run/span (segmentos contíguos com mesma formatação), preservando atributos visuais e estruturais
3. **Document Editing:** LLM aplica modificações semânticas (sumarização, tradução, rewrite) sobre a representação JSON
4. **Code Generation:** LLM gera Python executável via COM (PowerPoint API) + mecanismo de self-reflection para detecção e correção de erros de execução

**Insight arquitetural:** JSON como representação intermediária (não XML bruto do PPTX nem screenshot/renderização HTML) é o sweet spot — XML do PPTX é extremamente verboso e introduce ruído; screenshots perdem informação estrutural; JSON preserva ambos.

**Resultados:**
- 96.83% de success rate de execução vs 59.90% do baseline
- US$0.002/instrução vs US$0.0159 para abordagens UI-agent (8x mais barato)

**Fonte:** [arxiv.org/html/2505.11604v1](https://arxiv.org/html/2505.11604v1)

---

### 2.4 PaperX — "A Unified Framework for Multimodal Academic Presentation Generation with Scholar DAG"
**Referência:** arxiv 2602.03866, Fev 2026

**Problema abordado:** Soluções existentes tratam cada formato de saída (slides, poster, resumo) como tarefa downstream distinta com pipeline própria, resultando em processamento semântico redundante e custo inflado por uso de agentes separados por formato.

**Abordagem:** Scholar DAG (Directed Acyclic Graph) como representação intermediária única. O grafo captura a estrutura lógica e semântica do paper, desacoplada de qualquer sintaxe de apresentação específica. Estratégias de traversal adaptativas do grafo geram outputs diversos a partir de uma única fonte.

**Resultado:** State-of-the-art em content fidelity e aesthetic quality, com custo significativamente menor que agentes especializados por formato.

**Aplicabilidade:** A ideia do grafo como IR pode ser adaptada para ferramentas que geram múltiplos formatos (HTML, PPTX, Marp, reveal.js) a partir de um único documento de usuário.

**Fonte:** [arxiv.org/abs/2602.03866](https://arxiv.org/abs/2602.03866)

---

### 2.5 UniPPTBench — "A Unified Benchmark for Presentation Generation Across Diverse Input Settings"
**Referência:** arxiv 2605.17356, Mai 2026

**Cenários avaliados:** (1) vague-prompt (apenas prompt genérico), (2) long-document (documento longo como fonte), (3) multimodal-document (texto + imagens), (4) multi-source (múltiplas fontes heterogêneas)

**Métricas:** Compartilhadas entre cenários (visual appeal, layout quality, coherence) + específicas por cenário (grounded compression, visual-text alignment, cross-source synthesis)

**Findings críticos:**
- Performance varia substancialmente entre cenários — sistemas fortes em um podem falhar em outro
- Métricas genéricas fortes **não correlacionam** com performance em grounding real
- Falhas recorrentes em: compressão com grounding no documento-fonte, integração multimodal, síntese de múltiplas fontes

**Implicação direta para o projeto:** Incluir `referencia_doc` no JSON do outline (qual trecho do documento-fonte embasou cada slide) e auditar grounding após geração — não apenas avaliar visualmente.

**Fonte:** [arxiv.org/pdf/2605.17356](https://arxiv.org/pdf/2605.17356)

---

### 2.6 "Enhancing Presentation Slide Generation by LLMs with a Multi-Staged End-to-End Approach"
**Referência:** INLG 2024 — aclanthology 2024.inlg-main.18

**Pipeline de 3 estágios com estrutura hierárquica:**
1. **Hierarchical Summary:** LLM gera resumo hierárquico do documento de entrada (não flat summary — estruturado por seções e importância)
2. **Slide Mapping:** Gera títulos dos slides e mapeia cada título para seções relevantes do documento-fonte
3. **Content Generation:** Cria conteúdo detalhado por slide mantendo coerência narrativa e referência às seções mapeadas

**Finding:** A decomposição em estágios com estrutura hierárquica explícita supera abordagens end-to-end diretas (prompt único → slides) em qualidade de conteúdo e coerência.

**Fonte:** [aclanthology.org/2024.inlg-main.18.pdf](https://aclanthology.org/2024.inlg-main.18.pdf)

---

### 2.7 Layout Constraint e Perceptual Refinement
**Referência:** Towards Human-AI Synergy in UI Design — arxiv 2412.20071; InfoAlign — arxiv 2602.22901

**Pipeline em 3 fases para qualidade visual consistente:**
1. **Layout Planning:** LLM constrói um blueprint espacial abstrato — ainda não HTML; apenas estrutura lógica (quais elementos, onde, hierarquia de tamanho e importância)
2. **HTML Generation:** Produz HTML estruturado sob constraints de layout e estilo já fixados pelo blueprint
3. **Perceptual Refinement:** Loop de feedback que diagnostica defeitos visuais residuais e aplica correções cirúrgicas

**Style injection determinístico:** Aplicar o módulo de estilo no nível de documento (`:root` CSS com todas as variáveis), não regenerar ou variar estilos por slide. Isso garante consistência via "contrato fixo de estilo" — o LLM não precisa "lembrar" os estilos, eles estão fixados no documento.

**Slides adjacentes como contexto:** Incluir os slides vizinhos (anterior e posterior) no prompt de geração de cada slide força imitação de padrões de layout e mantém coerência visual sem instrução explícita.

**Fonte:** [arxiv.org/html/2412.20071v3](https://arxiv.org/html/2412.20071v3)

---

## 3. Considerações Práticas Documentadas por Quem Já Fez

### 3.1 Layout Quebrado — Posicionamento Absoluto vs. Flexbox

**Problema central documentado:** LLMs tendem a gerar `position: absolute` com coordenadas px fixas porque é frequente em exemplos de treinamento. Isso quebra em três situações concretas:
- Conteúdo gerado mais longo do que o esperado → overflow não tratado
- Viewport do browser diferente do hardcoded no prompt → desalinhamento
- reveal.js: clona internamente code blocks para highlight linha a linha usando `position: absolute`; tematizar o wrapper sem considerar o clone causa ghosting de texto simultâneo com o original, stair-stepping e headings desaparecendo — tudo de uma única causa

**Solução validada:**

```css
/* Container do deck — fixar viewport */
.slide-container {
  width: 960px;
  height: 540px;
  overflow: hidden; /* corta o que ultrapassar */
}

/* Wrapper externo — escalar para o browser */
.deck-wrapper {
  transform: scale(var(--scale-factor));
  transform-origin: top left;
}
```

- Flexbox/Grid para toda estrutura principal
- `position: absolute` reservado apenas para overlays, tooltips e efeitos de layer explícitos
- A regra deve constar no system prompt em linguagem imperativa

**Fonte:** [Flexbox and absolute positioning – CSS-Tricks](https://css-tricks.com/flexbox-and-absolute-positioning/) | [What I learned building a slide-deck skill – DEV Community](https://dev.to/arifszn/what-i-learned-building-a-slide-deck-skill-for-ai-agents-1jgd)

---

### 3.2 Consistência Visual Entre Slides

**Abordagem validada: Design Tokens como Contrato Injetado**

Estrutura JSON recomendada (injetada no system prompt de **todos** os slides):

```json
{
  "brand": { "name": "DeckForge" },
  "color": {
    "bg": "#0f0f1a",
    "surface": "#1a1a2e",
    "primary": "#e94560",
    "text": "#eaeaea",
    "text_muted": "#a8a8b3",
    "code_bg": "#0d1117"
  },
  "typography": {
    "font_family": "'Inter', system-ui, sans-serif",
    "font_mono": "'JetBrains Mono', monospace",
    "size_h1": "2.4rem",
    "size_h2": "1.6rem",
    "size_body": "1rem",
    "size_small": "0.85rem",
    "weight_heading": "700",
    "weight_body": "400"
  },
  "spacing": {
    "xs": "0.5rem", "sm": "0.75rem",
    "md": "1.5rem", "lg": "2.5rem", "xl": "4rem"
  },
  "layout": {
    "viewport_w": 960, "viewport_h": 540,
    "border_radius": "12px", "grid_columns": 12
  },
  "content_limits": {
    "title_words": 8, "bullet_words": 12,
    "bullets_per_slide": 5, "body_words": 60
  }
}
```

**Regras de ouro:**
- Use semantic naming: `color.primary` não `blue`
- CSS variables em `:root` de **cada** slide — não inline styles por elemento
- Style injection no nível de documento = contrato fixo; o LLM não precisa "lembrar" estilos entre chamadas
- Inclua tokens não-visuais: limites de conteúdo, tom de voz, aspect ratio

**Preview first:** Gerar tema + 2 slides de amostra para aprovação humana antes de gastar tokens no deck completo. Este padrão elimina rejeições caras de direção visual.

**Fonte:** [How to Use Design Tokens with AI Agents – MindStudio](https://www.mindstudio.ai/blog/design-tokens-ai-agents-consistent-brand-visuals)

---

### 3.3 Validação Automática do HTML Gerado

**Dado empírico alarmante:** Aproximadamente **15% das páginas HTML geradas por LLMs** são diretamente usáveis sem nenhuma correção. O restante falha com: controles inertes (botões que não funcionam), lógica travada, layouts quebrados, conteúdo faltando, ou erros de JS silenciosos.
**Fonte:** [HTMLCure – arxiv 2605.26807](https://arxiv.org/html/2605.26807v1)

**Checklist de validação automatizável com Puppeteer:**

| Check | Método de Verificação |
|---|---|
| HTML válido e parseável | `DOMParser` sem exceção |
| Viewport respeitado (sem overflow) | `scrollWidth <= 960 && scrollHeight <= 540` |
| Elementos obrigatórios presentes | `querySelector('.slide-title')` não null |
| Sem referências externas | grep por `http://` e `https://` em `src` e `href` |
| JavaScript sem erros de runtime | Listener em `page.on('console', ...)` capturando errors |
| Render sem crash de JS | Puppeteer screenshot completa sem exceção |
| Interatividade funcional | Simular cliques em botões; verificar mudança de estado |

**LLMLOOP Pattern (ICSME 2025):** LLM gera → testes automáticos → feedback estruturado (lista de problemas específicos com localização no DOM) → LLM itera. Converge em 2–3 rounds para a maioria dos problemas comuns.

**Fonte:** [LLMLOOP – ResearchGate](https://www.researchgate.net/publication/394085087_LLMLOOP_Improving_LLM-Generated_Code_and_Tests_through_Automated_Iterative_Feedback_Loops)

---

### 3.4 Geração de JS Interativo Confiável

**Padrões seguros documentados empiricamente:**

**Estrutura base obrigatória:**
```javascript
document.addEventListener('DOMContentLoaded', () => {
  // TODO: todo o JS aqui — nunca fora deste bloco
  // Sem CDN, sem fetch(), sem libs externas
});
```

**State machines para simulações:**
```javascript
const states = ['estado-inicial', 'passo-1', 'passo-2', 'resultado'];
let currentState = 0;
document.querySelector('.next-btn').addEventListener('click', () => {
  currentState = (currentState + 1) % states.length;
  render(states[currentState]);
});
```
Pattern mais confiável do que animações encadeadas (setTimeout/setInterval sequenciais).

**Fake Terminals em HTML:**
- Libraries como `Terminal.js` para emular terminal no browser: [cssscript.com/interactive-terminal](https://www.cssscript.com/interactive-terminal/)
- GitHub topic `fake-terminal` tem múltiplas implementações prontas HTML+CSS+JS: [github.com/topics/fake-terminal](https://github.com/topics/fake-terminal?l=javascript)
- Pattern typewriter confiável:
```javascript
const commands = ['$ npm install', '> Installing...', '✓ Done in 3.2s'];
let i = 0;
function typeNext() {
  if (i >= commands.length) return;
  terminal.innerHTML += commands[i] + '\n';
  i++;
  setTimeout(typeNext, 800);
}
typeNext();
```
- **Separar responsabilidades:** gerar o array de comandos com LLM (conteúdo didático), template do terminal é código fixo reutilizável (não regenerado por LLM)

**Reset de estado em slides revisitados:** Registrar handler no evento de troca de slide do deck navigator; sem isso, animações e estados ficam "sujos" na revisita.

**Bug reveal.js documentado:** Code blocks clonados para highlight usam `position: absolute`. Qualquer `position` ou `transform` no wrapper do tema é herdado incorretamente no clone. Solução: aplicar estilos de tema apenas em seletores que excluem `.hljs-ln-code` e `.hljs-ln-numbers`.

---

### 3.5 Custo e Latência de Pipelines Multi-Agente

**Estimativa de custo por deck de 20 slides (HTML approach):**

| Componente | Tokens approx. (output) | Custo (Claude Sonnet 4.6 @ $15/M output) |
|---|---|---|
| Outline (1 call) | ~2.000 | ~US$0.03 |
| HTML por slide (20 calls × 1.500 avg) | ~30.000 | ~US$0.45 |
| Validation + fix (5 calls médio) | ~5.000 | ~US$0.075 |
| **Total estimado** | **~37.000 output** | **~US$0.56** |

Referência independente: [tosea.ai](https://tosea.ai/blog/ai-slides-html-vs-image-generation-guide-2026) documenta "~30–80¢ para 20 slides via HTML approach".

**Latência:**
- Pipeline sequencial ingênuo: 20 slides × 3s/slide ≈ 60s
- Com paralelização (Stage 3): slides são independentes entre si após o outline → 20 calls em paralelo ≈ 6s total
- 4 steps sequenciais com 600ms TTFT cada = 2.4s só em first-token latency; parallelizar é essencial

**Estratégias de otimização de custo:**
- **Claude Prompt Caching:** system prompt + design tokens (tokens fixos, reutilizados em todas as calls) cacheable = 90% de desconto no input desses tokens
- **Roteamento por etapa:** Haiku para outline e validação (barato, rápido); Sonnet para HTML generation (qualidade necessária)
- **Fine-tune de modelo menor:** Qwen2.5-Coder-7B fine-tunado (paper 2603.16839) atinge 91.2% da qualidade de Opus — viável para produção em escala

**Fonte:** [Fastest LLM API Latency 2026 – kunalganglani.com](https://www.kunalganglani.com/blog/llm-api-latency-benchmarks-2026) | [LLM API Pricing July 2026 – benchlm.ai](https://benchlm.ai/llm-pricing)

---

## 4. Padrões de Prompt para Geração HTML/JS de Alta Qualidade

### 4.1 Few-Shot com Exemplo de Slide Real

**Princípios validados pela literatura:**
- **2–3 exemplos são ótimos** — retornos decrescentes após 3; exemplos extras queimam tokens sem ganho proporcional
- Mostrar output **exato** desejado: HTML completo com CSS vars usadas, estrutura flexbox correta, JS dentro de DOMContentLoaded
- Cobertura de tipos: slide de capa (hero), slide de conteúdo com lista, slide com código/terminal — 3 tipos cobrem ~80% dos casos
- Embutir constraints **dentro dos exemplos** (não apenas em regras textuais): LLMs aprendem por imitação estrutural, não só por instrução declarativa

**Exemplo few-shot canônico — slide de conteúdo:**
```html
<!-- EXEMPLO TIPO: conteudo/lista-animada -->
<section class="slide" data-slide="3" data-total="10"
  style="width:960px;height:540px;overflow:hidden;
         background:var(--color-bg);
         display:flex;flex-direction:column;
         justify-content:center;padding:var(--spacing-lg);">
  <h1 style="color:var(--color-primary);
              font:var(--weight-heading) var(--size-h1)/1.2 var(--font-main);
              margin-bottom:var(--spacing-md);">
    Título: Máximo Oito Palavras Aqui
  </h1>
  <ul style="list-style:none;display:flex;flex-direction:column;
             gap:var(--spacing-sm);margin:0;padding:0;">
    <li style="color:var(--color-text);font-size:var(--size-body);
                opacity:0;animation:fadeIn 0.4s ease forwards 0.2s;">
      Ponto conciso — máximo doze palavras por bullet
    </li>
    <li style="color:var(--color-text);font-size:var(--size-body);
                opacity:0;animation:fadeIn 0.4s ease forwards 0.5s;">
      Segundo ponto igualmente conciso aqui
    </li>
  </ul>
  <span style="position:absolute;bottom:1rem;right:1.5rem;
               color:var(--color-text-muted);font-size:var(--size-small);">
    3 / 10
  </span>
</section>
```

---

### 4.2 Template de System Prompt Completo com Design Tokens

```
PAPEL: Engenheiro frontend sênior especializado em apresentações didáticas e
interativas para ensino técnico.

VIEWPORT FIXO: 960×540px (aspect ratio 16:9).
Todo slide é um <section> com exatamente width:960px e height:540px.
Sem scroll. Se o conteúdo não cabe, reduza o conteúdo — não expanda o container.

SISTEMA DE DESIGN — use APENAS estas variáveis CSS, nunca hardcode valores:

:root {
  /* Cores */
  --color-bg:        #0f0f1a;
  --color-surface:   #1a1a2e;
  --color-primary:   #e94560;
  --color-accent:    #0f3460;
  --color-text:      #eaeaea;
  --color-text-muted:#a8a8b3;
  --color-code-bg:   #0d1117;

  /* Tipografia */
  --font-main:  'Inter', system-ui, sans-serif;
  --font-mono:  'JetBrains Mono', 'Fira Code', monospace;
  --size-h1:    2.4rem;
  --size-h2:    1.6rem;
  --size-body:  1rem;
  --size-small: 0.82rem;
  --weight-heading: 700;
  --weight-body:    400;

  /* Espaçamento */
  --spacing-xs: 0.5rem;
  --spacing-sm: 0.75rem;
  --spacing-md: 1.5rem;
  --spacing-lg: 2.5rem;
  --spacing-xl: 4rem;

  /* Layout */
  --radius:     12px;
  --radius-sm:  6px;
}

REGRAS DE LAYOUT (obrigatórias):
1. Estrutura: flexbox ou CSS grid. NUNCA position:absolute para layout principal.
2. position:absolute ou fixed APENAS para: badge de número de slide,
   tooltips, overlays de clique, efeitos de layer.
3. HTML 100% auto-contido — zero CDN, zero imports, zero fetch externos.
4. Fontes: use system-ui stack ou embed base64 se crítico.

REGRAS DE JAVASCRIPT:
1. TODO o código JS dentro de: document.addEventListener('DOMContentLoaded', () => { ... });
2. Simulações interativas: state machine com array de estados,
   não animações encadeadas com setTimeout arbitrários.
3. Fake terminals: array hardcoded de comandos + typewriter via setTimeout sequencial.
4. Resetar estado do slide no evento de troca (deck.on('slidechange', ...)).

LIMITES DE CONTEÚDO POR SLIDE:
- Título:         máximo 8 palavras
- Bullet points:  máximo 5 por slide, máximo 12 palavras cada
- Texto corrido:  máximo 60 palavras no corpo
- Código exibido: máximo 20 linhas visíveis

OUTPUT: Um arquivo HTML completo por slide, com <!DOCTYPE html>,
<head> com <style> contendo o :root acima, e <body> com o <section>.
```

---

### 4.3 Structured Output para Outline (JSON Schema Completo)

```json
{
  "$schema": "http://json-schema.org/draft-07/schema",
  "type": "object",
  "properties": {
    "titulo_deck": { "type": "string" },
    "audiencia": { "type": "string", "description": "perfil do público-alvo" },
    "duracao_minutos": { "type": "integer" },
    "nivel_tecnico": { "enum": ["iniciante", "intermediario", "avancado"] },
    "slides": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["numero", "titulo", "tipo", "layout", "pontos_chave"],
        "properties": {
          "numero": { "type": "integer" },
          "titulo": { "type": "string", "maxLength": 60, "description": "máx 8 palavras" },
          "tipo": {
            "enum": ["capa", "agenda", "conteudo", "diagrama", "codigo",
                     "simulacao", "terminal-fake", "quiz", "transicao", "fechamento"]
          },
          "layout": {
            "enum": ["hero", "dois-colunas", "lista-animada",
                     "fullbleed-code", "split-visual", "grid-cards"]
          },
          "pontos_chave": {
            "type": "array", "items": { "type": "string" }, "maxItems": 5
          },
          "elemento_interativo": {
            "type": "object",
            "properties": {
              "tipo": {
                "enum": ["nenhum", "clique-para-revelar", "terminal-fake",
                         "simulacao-estados", "quiz-opcoes", "hover-tooltip"]
              },
              "descricao": { "type": "string" }
            }
          },
          "notas_speaker": { "type": "string" },
          "referencia_doc": {
            "type": "string",
            "description": "trecho exato do documento-fonte que embasou este slide (para auditoria de grounding)"
          }
        }
      }
    }
  }
}
```

**Por que `referencia_doc` é crítico:** Permite auditoria de grounding — o slide está baseado em conteúdo real do documento enviado pelo usuário, ou o LLM alucinoou? Métrica recomendada pelo UniPPTBench como fator-chave e tipicamente omitida em pipelines simples.

---

### 4.4 Pipeline Multi-Agente Recomendado

Baseado na síntese de PPTAgent, OpenSlides, LangGraph slide generator, "Learning to Present" e achados empíricos documentados:

```
┌─────────────────────────────────────────────────────────────────┐
│ STAGE 1 — OUTLINE AGENT                                         │
│ Modelo: Haiku | Temperatura: 0.3 | 1 call                       │
│ Input:  tópico + documentos do usuário (chunks relevantes)       │
│ Output: JSON outline (schema acima) com tipo e interatividade    │
│         por slide, e referencia_doc por entrada                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│ STAGE 2 — THEME AGENT                                           │
│ Modelo: Sonnet | Temperatura: 0.5 | 1 call                      │
│ Input:  outline + design tokens + audiência + nível técnico      │
│ Output: CSS :root global completo + 2 slides de amostra         │
│         (1 capa + 1 slide de conteúdo característico)           │
└─────────────────────┬───────────────────────────────────────────┘
                      │
           ┌──────────▼──────────┐
           │   Aprovação Humana  │
           │  (2 slides visuais) │
           └──────────┬──────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│ STAGE 3 — HTML GENERATION AGENTS (PARALELO)                     │
│ Modelo: Sonnet | Temperatura: 0.2 | N calls simultâneas         │
│ Input (cada call):                                              │
│   - slide_i.outline (pontos, tipo, layout, interatividade)      │
│   - CSS :root global (design contract)                          │
│   - slide_i-1.html (contexto adjacente para consistência)       │
│   - Few-shot examples (2-3 slides de referência por tipo)       │
│ Output: HTML auto-contido por slide                             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│ STAGE 4 — VALIDATION AGENT                                      │
│ Ferramenta: Puppeteer headless + Haiku | Temperatura: 0.0       │
│ Checks: screenshot sem crash, DOM check, scrollWidth/Height,    │
│         console.error capture, links externos ausentes,         │
│         interatividade simulada (click events)                  │
│ Output: lista estruturada de problemas por slide (pode ser ∅)   │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│ STAGE 5 — FIX AGENT (somente slides com problemas)              │
│ Modelo: Sonnet | Temperatura: 0.1 | calls apenas para falhos    │
│ Input:  HTML problemático + lista de problemas localizada no DOM │
│ Output: HTML corrigido (cirúrgico, não reescrita total)         │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│ STAGE 6 — ASSEMBLY (determinístico, zero LLM)                   │
│ Combina slides em: index.html com navegação,                    │
│ progress bar, keyboard shortcuts (←→, F fullscreen),            │
│ table of contents, PDF export button                            │
└─────────────────────────────────────────────────────────────────┘
```

**Notas de implementação:**
- Stage 3 é totalmente paralelizável — reduz latência de ~60s para ~6s
- Stage 5 só executa para slides que falharam (economia de tokens)
- Stage 6 é código Python/Node determinístico — nenhum LLM envolvido
- Writer pass (Stage 3) e Critic pass (Stages 4–5) são separados — nunca auto-aprovação no mesmo contexto

---

### 4.5 Temperatura e Modelo por Estágio

| Estágio | Modelo sugerido | Temperatura | Justificativa |
|---|---|---|---|
| Outline | Haiku | 0.3 | Estrutura determinística; custo mínimo |
| Theme/CSS | Sonnet | 0.5 | Criatividade moderada no visual |
| HTML por slide | Sonnet | 0.2 | Aderência máxima a constraints; menor alucinação de código |
| Validação/Análise de erros | Haiku | 0.0 | Análise determinística; sem criatividade |
| Correção de bugs | Sonnet | 0.1 | Cirúrgico, não criativo; respeitar o existente |

---

## 5. Comparativo Rápido de Abordagens

| Abordagem | HTML livre? | JS interativo rico? | Custo/deck | Latência (paralelo) | Self-host? |
|---|---|---|---|---|---|
| Gamma.app | Não | Não | Assinatura | 5-10s | Não |
| Beautiful.ai | Não | Não | Assinatura | 5-10s | Não |
| Presenton | Não (PPTX) | Não | Grátis (infra própria) | 10-30s | Sim |
| Slidev + LLM | Parcial (requer build) | Via Vue | Baixo | 30-60s | Sim |
| Marp + LLM | Parcial | Não | Baixo | 10-20s | Sim |
| reveal.js + skill | Sim | Via reveal.js API | Baixo | 20-60s | Sim |
| **HTML livre + pipeline multi-agente** | **Sim, total** | **Sim, ilimitado** | **~US$0.50** | **~6-15s** | **Sim** |

Para o objetivo de **simulações clicáveis, terminais fake e animações didáticas programáticas**, apenas o HTML livre via pipeline multi-agente oferece o controle necessário sem limitações de framework. reveal.js é ponto de partida válido mas impõe restrições significativas para JS customizado.

---

## 6. Referências

1. [PPTAgent: Generating and Evaluating Presentations Beyond Text-to-Slides – arxiv 2501.03936](https://arxiv.org/abs/2501.03936)
2. [PPTAgent – HuggingFace Paper Page](https://huggingface.co/papers/2501.03936)
3. [PPTAGENT – EMNLP 2025 Anthology](https://aclanthology.org/2025.emnlp-main.728.pdf)
4. [Learning to Present: Inverse Specification Rewards for Agentic Slide Generation – arxiv 2603.16839](https://arxiv.org/abs/2603.16839)
5. [Talk to Your Slides: High-Efficiency Slide Editing – arxiv 2505.11604](https://arxiv.org/html/2505.11604v1)
6. [PaperX: Unified Framework for Multimodal Academic Presentation Generation – arxiv 2602.03866](https://arxiv.org/abs/2602.03866)
7. [UniPPTBench: Unified Benchmark for Presentation Generation – arxiv 2605.17356](https://arxiv.org/pdf/2605.17356)
8. [Enhancing Presentation Slide Generation: Multi-Staged End-to-End Approach – INLG 2024](https://aclanthology.org/2024.inlg-main.18.pdf)
9. [Towards Human-AI Synergy in UI Design – arxiv 2412.20071](https://arxiv.org/html/2412.20071v3)
10. [HTMLCure: Turning Browser Experience into State Guided Repair – arxiv 2605.26807](https://arxiv.org/html/2605.26807v1)
11. [AI Slides: HTML vs Image Complete Guide 2026 – tosea.ai](https://tosea.ai/blog/ai-slides-html-vs-image-generation-guide-2026)
12. [Presenton: Open-Source AI Presentation Generator – GitHub](https://github.com/presenton/presenton)
13. [OpenSlides: AI-powered reveal.js workspace – GitHub](https://github.com/YuxiangChai/OpenSlides)
14. [slides-ai-plugin: animated HTML + PPTX skill – GitHub](https://github.com/proyecto26/slides-ai-plugin)
15. [html-slides: multi-agent standard skill – GitHub](https://github.com/bluedusk/html-slides)
16. [revealjs-skill: Claude Code skill for reveal.js – GitHub](https://github.com/ryanbbrown/revealjs-skill)
17. [Reveal Presentations – Autonomee.ai blog](https://autonomee.ai/blog/reveal-presentations-generate-slide-decks-from-claude-code/)
18. [allweonedev/presentation-ai: open source Gamma alternative – GitHub](https://github.com/allweonedev/presentation-ai)
19. [slidaiv: VSCode extension for Slidev + LLM – GitHub](https://github.com/kaakaa/slidaiv)
20. [Next-AI-Slide: AI-powered Slidev generator – GitHub](https://github.com/lvy010/Next-AI-Slide)
21. [marp-ai-slide-generator – GitHub](https://github.com/itarutomy97/marp-ai-slide-generator)
22. [LLM-Powered Slide Deck Formats Comparison – Nicolas' Notebook](https://nbrosse.github.io/posts/llm-slides/llm-slides.html)
23. [What I Learned Building a Slide-Deck Skill for AI Agents – DEV Community](https://dev.to/arifszn/what-i-learned-building-a-slide-deck-skill-for-ai-agents-1jgd)
24. [Build Presentations with Claude Code – designproject.io](https://designproject.io/blog/build-presentations-with-claude-code-stop-designing-decks-in-figma-and-ship-interactive-ones-instead/)
25. [Claude Artifacts for Presentations: What Works and What Breaks – Deckary](https://deckary.com/blog/claude-artifacts-presentations)
26. [Design Tokens with AI Agents for Consistent Brand Visuals – MindStudio](https://www.mindstudio.ai/blog/design-tokens-ai-agents-consistent-brand-visuals)
27. [MARP + LLMs: The Engineering Case for Presentations as Text – Medium](https://medium.com/@matias.sulik/marp-llms-the-engineering-case-for-presentations-as-text-f806da6e6eea)
28. [Building an LLM-Powered Slide Deck Generator with LangGraph – Medium](https://medium.com/@gaddam.rahul.kumar/building-an-llm-powered-slide-deck-generator-with-langgraph-973aeaac0a06)
29. [LLMLOOP: Improving LLM-Generated Code through Iterative Feedback Loops – ResearchGate](https://www.researchgate.net/publication/394085087_LLMLOOP_Improving_LLM-Generated_Code_and_Tests_through_Automated_Iterative_Feedback_Loops)
30. [LLM API Pricing Comparison July 2026 – benchlm.ai](https://benchlm.ai/llm-pricing)
31. [Fastest LLM API Latency Benchmarks 2026 – kunalganglani.com](https://www.kunalganglani.com/blog/llm-api-latency-benchmarks-2026)
32. [fake-terminal GitHub Topics (JavaScript)](https://github.com/topics/fake-terminal?l=javascript)
33. [Terminal.js: Interactive Terminal Emulator in JavaScript – CSS Script](https://www.cssscript.com/interactive-terminal/)
34. [frontend-slides: 26.1k★ AI Agent Skill – SkillsLLM](https://skillsllm.com/skill/frontend-slides)
35. [slide-generator GitHub Topics (Python, sorted by stars)](https://github.com/topics/slide-generator?l=python&o=desc&s=stars)
36. [Flexbox and Absolute Positioning – CSS-Tricks](https://css-tricks.com/flexbox-and-absolute-positioning/)
37. [Tome AI Review 2025 – max-productive.ai](https://max-productive.ai/ai-tools/tome/)