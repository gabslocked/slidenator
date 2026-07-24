# Slidenator — Design system (app register)

Captured from `app/public/styles.css` + `login.html` (the shipped surfaces). The landing (`landing/`) has its own ImobSight-derived token set in `landing/src/index.css`; this file governs the **app**.

## Palette (app)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#ffffff` | page background (chat area) |
| `--side` | `#f7f7f8` | sidebar background |
| `--border` | `#e6e6e6` | every hairline border |
| `--text` | `#1f1f1f` | primary ink |
| `--muted` | `#8f8f92` | secondary text, labels |
| `--bubble` | `#f1f1f3` | user chat bubble, chips |
| `--dark` | `#171717` | primary action (buttons, avatar block) |
| `--ok` / `--warn` / `--err` | `#16a34a` / `#d97706` / `#dc2626` | status dots, progress states |

Strategy: **restrained** — neutral surface, black as the only committed color; status hues used only as small dots/lines. Generated presentations carry their own org brand kit (accent/ink/paper + radius), themed at assembly time — tool chrome must never compete with them.

## Typography (app)

- Single family: **Inter** (400/500/600/700), system-ui fallback. Body 15px; chat 13.5px; labels 11–12px uppercase-free.
- Known debt (detector-flagged): Inter-only + flat hierarchy on login (8 sizes within 12–22px). A future `typeset` pass may introduce a display face; until then, do not add new families ad hoc.

## Components (app)

- **Sidebar** 264px `--side`, hairline right border; conversation items with 7px status dot (`done`/`running` pulsing/`error`).
- **Chat rows**: assistant = plain text + 28px dark square avatar "S/DF"; user = `--bubble` pill right-aligned (radius 16/16/4/16); system notes centered muted 12.5px.
- **Composer**: pill (radius 24) with ＋ attach and dark circular send.
- **Progress card**: `#fafafa`, hairline border, `ui-monospace` 12px, `[stage]` labels in `--ok` green.
- **Floating presentation pill**: white card, hairline border, soft shadow, top-left over chat scroll; title + `v{n}` + open action.
- **Dialog (settings)**: native `<dialog>`, radius 16, sectioned by hairlines.
- Radius scale: 8 (chips) / 10 (inputs, buttons) / 12–16 (cards, dialogs) / 24 (composer) / 999 (dots, pills).

## Motion

Minimal: pulsing status dot (`blink` 1.2s), typing dots, progress lines appended live via SSE. No entrance animations in tool chrome. Reduced-motion: nothing essential moves.

## Voice in UI copy

pt-BR minúsculas em mensagens de sistema ("nenhuma ainda"), sentence-case em botões de auth, CAIXA ALTA apenas em kickers/labels curtos. Nunca citar modelos/fornecedores de IA.
