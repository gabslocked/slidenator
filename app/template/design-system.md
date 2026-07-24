# DeckForge · Sistema de design e convenções técnicas

Apresentação HTML em palco fixo de **1280×720px** (escalado à janela pelo runtime). Tailwind (CDN) + fonte Sora. Todo slide é uma `<section>` posicionada por **absolute positioning** dentro do palco — nunca confie em fluxo de documento para layout de slide.

## Tokens (tailwind.config já registrado)

| Token | Valor | Uso |
|---|---|---|
| `ink` | #070808 | fundo dark, texto principal no light |
| `card` / `card2` | #15181A / #1B1F21 | cards no tema dark |
| `edge` | #2B2F31 | bordas no tema dark |
| `lime` | #D8E022 | cor de destaque primária (botões, números, kicker dark) |
| `lime2` | #9EC100 | verde-lima secundário (barras, bordas de destaque light) |
| `olive` | #7E9C00 | kicker e texto de destaque no tema light |
| `limetint` | #F4F8D6 | fundo de badge/realce positivo no light |
| `paper` | #EBEBEB | fundo do tema light |
| `mut` | #9BA1A4 | texto secundário no dark |
| `mutl` | #5C6265 | texto secundário no light |

Cores de estado: vermelho `red-400/500` + `bg-red-50 border-red-300` (problema), âmbar `amber-400/500` + `bg-amber-50 border-amber-300` (atenção), verde `#17B689` (saudável em painéis técnicos).

**Os tokens são semânticos e re-tematizáveis**: `lime` é "a cor de destaque da marca" (pode virar azul, roxo…), `ink`/`paper` são os fundos. Use SEMPRE as classes de token (`bg-lime`, `text-olive`, `bg-limetint`…) para cores de marca — NUNCA hexadecimais fixos, exceto as cores de estado acima e cinzas neutros. O raio das bordas também é tematizável: use as classes `rounded-*` normalmente.

## Anatomia de um slide

```html
<section class="slide bg-paper text-ink" data-theme="light" data-demo="NOME">
  <div class="absolute left-14 top-9 max-w-[880px]">
    <p class="rv text-olive text-[11px] font-bold tracking-[.3em]">KICKER · CATEGORIA</p>
    <h2 class="rv mt-1.5 text-[30px] font-bold" data-d="60">Título da tese do slide</h2>
    <p class="rv mt-1 text-mutl text-[14px] font-light" data-d="120">Subtítulo que orienta o que observar:</p>
  </div>
  <!-- conteúdo em blocos absolute -->
</section>
```

- `data-theme="light"` (fundo `bg-paper text-ink`) ou `"dark"` (`bg-ink text-white`). Maioria light; capa, ganhos e fechamento dark.
- Tema dark troca: kicker `text-lime`, sub `text-mut`, cards `bg-card border border-edge`.
- Margens: `left-14 right-14` (56px). Header no `top-9`/`top-10`. Rodapé `bottom-8`/`bottom-9`.
- Título dentro do slide: 30–34px. Capa: até 64px com `<span class="rv block">` por linha.

**ORÇAMENTO DE ALTURA (obrigatório — o palco NÃO rola e cada slide tem overflow escondido)**: header ocupa até y≈150; o conteúdo principal deve terminar até y≈640; rodapés entre y≈640 e y≈690. NADA pode ser posicionado com top ≥ 690 nem ter altura que ultrapasse y=700. Antes de finalizar um slide, some top + altura de cada bloco e confirme que cabe. Animações (partículas, tokens viajando) devem se mover DENTRO de contêineres do slide, nunca para fora do palco.

## Sistema de reveal (entrada em cascata)

Classe `rv` + atributo `data-d="<atraso ms>"` em cada bloco que entra animado. O runtime aplica a transição na primeira visita ao slide. Escalone: header 0/60/120, blocos principais 150–260, rodapé 300+.

## Componentes canônicos

- **Card branco (light)**: `rounded-2xl bg-white border border-neutral-200 p-4` (ou `p-5`). Destaque: `border-2 border-lime2`. Problema: adicionar `bg-red-50 border-red-300`.
- **Card dark**: `rounded-2xl bg-card border border-edge p-5`.
- **Card numerado**: `<p class="text-olive font-bold text-sm">(01)</p>` + título bold 15px + texto `text-[12.5px] text-mutl font-light`.
- **Badge de estado**: `rounded-full bg-limetint border border-lime2 text-olive text-[10px] font-bold px-2.5 py-1` (troque para paleta red/amber conforme estado).
- **Botão de ação da demo**: `btn rounded-xl bg-lime text-ink font-bold px-5 py-3 text-[13px]` — normalmente `absolute right-14 top-[96px]`. Texto em CAIXA ALTA imperativa ("ESTRESSAR A API").
- **Barra de medida**: contêiner `h-3 rounded-full bg-neutral-100` + filho `class="bar-fill h-3 rounded-full bg-lime2" style="width:34%"` (JS muda width e cor).
- **Número grande**: `text-[42px] font-extrabold text-lime leading-none` com `data-countup data-target="3"` para animar.
- **Ícone**: `<span class="icon w-8 h-8" data-icon="server_d"></span>` — o runtime injeta o PNG. Ícones disponíveis (sufixo `_d`=escuro p/ tema light, `_l`=claro p/ tema dark, `_g`=verde-água, `_o`=laranja/alerta): `argo, box_d, calendar_d, check_o, clock_l, cube_d, cube_g, cubes_w, db_d, db_o, desktop_d, docker_d, docker_l, eye_d, filecode_d, gear_gh, gears_d, globe_d, globe_g, heart_g, history_d, k8s_d, k8s_l, net_g, scroll_d, search_gh, server_d, sync_l, undo_d, undo_l, users_d, video_d, warn_o`. Use SOMENTE esses nomes. Sem ícone adequado? Use SVG inline simples ou um chip de texto.
- **Terminal fake**: janela `rounded-xl overflow-hidden border border-edge bg-ink font-mono text-[12px]` com barra de 3 bolinhas (`w-2 h-2 rounded-full bg-red-400 / bg-amber-400 / bg-lime2`) e, se interativo, `<input data-autofocus class="flex-1 bg-transparent outline-none text-white caret-lime">`.
- **Chip de fila/requisição**: `pod pop h-[22px] inline-flex items-center rounded px-1.5 text-[8.5px] font-mono font-bold` com `bg-white border border-neutral-300 text-ink` ou `bg-ink text-lime`.
- **Linhas de fluxo (SVG)**: `<path class="dashflow" d="..." stroke="#9EC100" stroke-width="1.75" fill="none" stroke-dasharray="5 5"/>` — tracejado que anda.
- **Setas entre etapas**: `<svg width="26" height="14" viewBox="0 0 26 14"><path d="M0 7h19M14 2l6 5-6 5" stroke="#9AA1A4" stroke-width="2.2" fill="none"/></svg>`.

## Classes de animação prontas (CSS já no skeleton)

`animate-float` (flutua), `spin`, `dashflow` (tracejado andando), `ledblink`, `pulsering` (anel pulsante), `pod pop` (nasce com pop; `pod gone` some), `shake` (treme — erro), `hb` (batimento), `fade` (+`opacity-0/100`), `bar-fill` (transição de width/cor), `feed-move`, `caret` (cursor piscando), `tdot` (três pontos digitando), `reqchip`/`reqchip out`.

## Convenções do JavaScript de demo

Cada slide interativo declara `data-demo="nome"` e registra:

```js
/* -- slide N: o que a demo mostra -- */
demos.nome = { start() {
  // pegue elementos por id — TODO id usado aqui DEVE existir no HTML do slide
  const btn = document.getElementById('sx-btn');
  // loops: SEMPRE via every(ms, fn) / later(ms, fn) — são limpos na troca de slide
  every(300, () => { ... });
  // loops async: verifique a flag de vida
  (async function loop() { for (;;) { if (!demos.nome.on) return; await cycle(); } })();
}};
```

Regras:
- Helpers disponíveis no escopo: `sleep(ms)`, `every(ms,fn)`, `later(ms,fn)`, `hydrateIcons(el)` (chame após inserir HTML com `data-icon` via JS), `countUp(el)`.
- `start()` roda TODA vez que o slide abre — reinicialize estado (innerHTML='', contadores, textos, classes de botões).
- Após `await sleep(...)` em sequências longas, cheque `if (!demos.nome.on) return;`.
- Prefixe ids por slide (`s3-`, `sq-`) para nunca colidir entre slides.
- Elementos criados via JS: `document.createElement` + classes Tailwind em `className` funcionam (CDN observa mutações).
- Coordenadas: dentro de um contêiner `relative` do slide, use posições fixas conhecidas (o palco é sempre 1280×720). Para converter `getBoundingClientRect` em coordenadas do palco, divida pela escala: `const sc = base.width / LARGURA_NATURAL`.
- Input de teclado: o runtime devolve navegação com Esc e foca `input[data-autofocus]` ao abrir o slide.

## Receitas de interatividade (escolha o que serve à tese do slide)

1. **Botão de estresse/cenário**: um botão alterna um estado (`stressed = !stressed`); um `every(300,...)` atualiza barras, latência, badges e mensagens narrativas conforme o estado. Mostra causa→efeito.
2. **Simulação passo a passo**: botão dispara sequência `async` com caption narrando cada etapa (1·, 2·, 3·...), destacando cards (`ring-2`), preenchendo barras e um medidor acumulando (relógio, contador).
3. **Comparação lado a lado animada**: dois painéis (antes/depois); a mesma carga entra nos dois e os painéis reagem diferente. Loop automático ou botão.
4. **Etapas exploráveis**: botões PRÓXIMA ETAPA/voltar + dots; cada etapa revela uma camada do diagrama com caption.
5. **Terminal interativo**: input aceita comandos reais simulados (com validação e mensagens de erro), disparando reações no painel ao lado.
6. **Partículas/fluxo**: bolinhas (`absolute w-2.5 h-2.5 rounded-full`) viajando de origem a destino com `transition: left/top`, removidas com `later(...)`.
7. **Feed vivo**: lista que recebe itens novos por cima com `feed-move`.
8. **Botão do pânico/rollback**: ação que reverte um estado visivelmente e narra o resultado.
9. **Gráfico de barras animado (chart-bars)**: barras horizontais/verticais feitas de divs com `bar-fill`, crescendo com dados reais ao entrar ou ao clicar; rótulos e números com `data-countup`. Ideal para slides de dados/resultados de QUALQUER domínio (vendas, saúde, educação…).
10. **Quiz/reveal**: pergunta com 2–4 opções clicáveis; a escolha revela a resposta com destaque (verde/vermelho) e uma explicação curta. Ótimo para aulas e treinamentos.

**Domínios não técnicos**: o conjunto de ícones embutidos tem viés de tecnologia. Para temas de outros domínios (vendas, saúde, RH, educação…), prefira SVG inline simples (traço 2px, monocromático), chips tipográficos ou números grandes em vez de forçar ícones que não combinam.

## Princípios de conteúdo

- Um slide = uma tese, enunciada no título. O subtítulo diz o que observar na demo.
- Narração dentro da demo: mensagens curtas em pt-BR minúsculo ("fila crescendo: quem chega agora espera quem chegou antes").
- Números concretos batem abstrações ("≈ 3 min", "1 clique", "6 h 24 min").
- Tom respeitoso com o presente ("funciona há anos") antes de propor o futuro.
- Nunca prometa métricas que a demo contradiz.
