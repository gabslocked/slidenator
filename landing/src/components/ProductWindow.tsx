/**
 * ProductWindow — live demo loop (~18 s) of the actual Slidenator interface.
 * Light-theme app window: sidebar + chat + progress card + presentation pill.
 * useReducedMotion: freezes at the final informative state (pill v2 visible).
 * Height locked at md:h-[420px] so the window never reflowing during animation.
 */
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// ── Demo content ──────────────────────────────────────────────────────────────

const MSG_1 = "Resultados Q2 para investidores — 10 slides";
const MSG_2 = "bordas retas e adiciona slide de preços";

const ASSISTANT_REPLY =
  "Entendido. Separei a apresentação em 6 blocos narrativos. Acompanhe as etapas abaixo.";

const PROGRESS = [
  { label: "[roteiro]", detail: "narrativa e estrutura" },
  { label: "[design]", detail: "identidade visual extraída" },
  { label: "[construcao]", detail: "Slide 1/6 pronto…" },
  { label: "[construcao]", detail: "Slide 2/6 pronto…" },
  { label: "[construcao]", detail: "Slide 3/6 pronto…" },
  { label: "[construcao]", detail: "Slide 4/6 pronto…" },
  { label: "[construcao]", detail: "Slide 5/6 pronto…" },
  { label: "[construcao]", detail: "Slide 6/6 ✓" },
  { label: "[montagem]", detail: "apresentação pronta" },
] as const;

const EDITS = [
  { label: "[edicao]", detail: "aplicando bordas retas…" },
  { label: "[slide]", detail: "adicionando slide de preços…" },
  { label: "[revisao]", detail: "v2 pronta ✓" },
] as const;

// ── Sub-components ─────────────────────────────────────────────────────────────

function TrafficLights() {
  return (
    <div className="flex items-center gap-1.5" aria-hidden>
      <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
      <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
      <span className="h-3 w-3 rounded-full bg-[#28c840]" />
    </div>
  );
}

function Sidebar() {
  return (
    <aside className="flex w-[160px] flex-none select-none flex-col border-r border-[#e6e6e6] bg-[#f7f7f8] p-3">
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-[13px] font-bold tracking-tight text-[#1f1f1f]">
          Slidenator
        </span>
      </div>
      <div className="mb-2 rounded-[10px] border border-[#e6e6e6] bg-white px-3 py-1.5 text-[12.5px] font-medium text-[#1f1f1f]">
        ＋&nbsp;Nova conversa
      </div>
      <p className="mb-1.5 px-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-[#8f8f92]">
        Conversas
      </p>
      <div className="space-y-0.5">
        <div className="flex items-center gap-2 rounded-lg bg-[#ececee] px-2 py-1.5">
          <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#16a34a]" />
          <span className="truncate text-[12.5px] font-medium text-[#1f1f1f]">
            Resultados Q2
          </span>
        </div>
        <div className="flex items-center gap-2 rounded-lg px-2 py-1.5">
          <span className="h-1.5 w-1.5 flex-none rounded-full bg-[#c4c4c8]" />
          <span className="truncate text-[12.5px] text-[#8f8f92]">Pitch Produto</span>
        </div>
      </div>
    </aside>
  );
}

function UserBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.21, 0.6, 0.35, 1] }}
      className="flex justify-end"
    >
      <div className="max-w-[78%] rounded-2xl rounded-tr-sm bg-[#f1f1f3] px-3.5 py-2 text-[13px] leading-relaxed text-[#1f1f1f]">
        {text}
      </div>
    </motion.div>
  );
}

function AssistantBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.21, 0.6, 0.35, 1] }}
      className="flex items-start gap-2.5"
    >
      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-[#171717] text-[10.5px] font-bold text-white">
        S
      </div>
      <div className="text-[13px] leading-relaxed text-[#1f1f1f]">{text}</div>
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex items-start gap-2.5"
    >
      <div className="flex h-7 w-7 flex-none items-center justify-center rounded-lg bg-[#171717] text-[10.5px] font-bold text-white">
        S
      </div>
      <div className="flex items-center gap-1 rounded-xl rounded-tl-sm border border-[#e6e6e6] px-3 py-2.5">
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#c4c4c8]" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#c4c4c8]" />
        <span className="typing-dot h-1.5 w-1.5 rounded-full bg-[#c4c4c8]" />
      </div>
    </motion.div>
  );
}

function ProgressCard({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-xl border border-[#e6e6e6] bg-[#fafafa] px-4 py-3 font-mono text-[11.5px] leading-[1.85]"
    >
      <AnimatePresence initial={false}>
        {PROGRESS.slice(0, count).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <span className="font-bold text-[#16a34a]">{line.label}</span>{" "}
            <span className="text-[#8f8f92]">{line.detail}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

function EditCard({ count }: { count: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="rounded-xl border border-[#e6e6e6] bg-[#fafafa] px-4 py-3 font-mono text-[11.5px] leading-[1.85]"
    >
      <AnimatePresence initial={false}>
        {EDITS.slice(0, count).map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            <span className="font-bold text-[#16a34a]">{line.label}</span>{" "}
            <span className="text-[#8f8f92]">{line.detail}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function ProductWindow() {
  const reduced = useReducedMotion() ?? false;

  const [loopKey, setLoopKey] = useState(0);
  const [typedLen1, setTypedLen1] = useState(0);
  const [msg1Sent, setMsg1Sent] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const [progressCount, setProgressCount] = useState(0);
  const [showPill, setShowPill] = useState(false);
  const [pillVer, setPillVer] = useState<1 | 2>(1);
  const [typedLen2, setTypedLen2] = useState(0);
  const [msg2Sent, setMsg2Sent] = useState(false);
  const [editCount, setEditCount] = useState(0);

  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll chat area to bottom whenever new content appears
  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [msg1Sent, thinking, showResponse, progressCount, msg2Sent, editCount]);

  useEffect(() => {
    // Freeze at the richest static state for prefers-reduced-motion
    if (reduced) {
      setTypedLen1(MSG_1.length);
      setMsg1Sent(true);
      setThinking(false);
      setShowResponse(true);
      setProgressCount(PROGRESS.length);
      setShowPill(true);
      setPillVer(2);
      setTypedLen2(MSG_2.length);
      setMsg2Sent(true);
      setEditCount(EDITS.length);
      return;
    }

    // Reset all state for loop restart
    setTypedLen1(0);
    setMsg1Sent(false);
    setThinking(false);
    setShowResponse(false);
    setProgressCount(0);
    setShowPill(false);
    setPillVer(1);
    setTypedLen2(0);
    setMsg2Sent(false);
    setEditCount(0);

    const ts: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => {
      ts.push(setTimeout(fn, ms));
    };

    // ① Typewriter: user message 1 (40 ms/char)
    let cursor = 500;
    for (let i = 1; i <= MSG_1.length; i++) {
      const n = i;
      at(cursor + n * 40, () => setTypedLen1(n));
    }
    cursor += MSG_1.length * 40 + 350;

    // ② Send message 1 — moves to chat bubble, clears composer
    at(cursor, () => setMsg1Sent(true));
    cursor += 350;

    // ③ Thinking dots
    at(cursor, () => setThinking(true));
    cursor += 1300;

    // ④ Assistant response
    at(cursor, () => {
      setThinking(false);
      setShowResponse(true);
    });
    cursor += 1100;

    // ⑤ Progress card, one line every 580 ms
    for (let i = 1; i <= PROGRESS.length; i++) {
      const n = i;
      at(cursor + n * 580, () => setProgressCount(n));
    }
    cursor += PROGRESS.length * 580 + 700;

    // ⑥ Presentation pill appears (v1)
    at(cursor, () => setShowPill(true));
    cursor += 1900;

    // ⑦ Typewriter: user message 2 (42 ms/char)
    for (let i = 1; i <= MSG_2.length; i++) {
      const n = i;
      at(cursor + n * 42, () => setTypedLen2(n));
    }
    cursor += MSG_2.length * 42 + 350;

    // ⑧ Send message 2
    at(cursor, () => setMsg2Sent(true));
    cursor += 350;

    // ⑨ Edit progress, one line every 820 ms
    for (let i = 1; i <= EDITS.length; i++) {
      const n = i;
      at(cursor + n * 820, () => setEditCount(n));
    }
    cursor += EDITS.length * 820 + 600;

    // ⑩ Pill updates to v2
    at(cursor, () => setPillVer(2));
    cursor += 2400;

    // ⑪ Loop restart
    at(cursor, () => setLoopKey((k) => k + 1));

    return () => ts.forEach(clearTimeout);
  }, [loopKey, reduced]);

  // Composer input text: shows typewriter text during typing phases
  const composerText =
    !msg1Sent && typedLen1 > 0
      ? MSG_1.slice(0, typedLen1)
      : !msg2Sent && typedLen2 > 0
        ? MSG_2.slice(0, typedLen2)
        : "";

  const isTyping =
    (!msg1Sent && typedLen1 > 0 && typedLen1 < MSG_1.length) ||
    (!msg2Sent && typedLen2 > 0 && typedLen2 < MSG_2.length);

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border border-[#e6e6e6] bg-white shadow-[0_8px_40px_rgba(0,0,0,0.12)] md:h-[420px]"
      aria-label="Demonstração do Slidenator"
    >
      {/* Window chrome / title bar */}
      <div className="flex h-10 flex-none items-center gap-3 border-b border-[#e6e6e6] bg-[#f7f7f8] px-4">
        <TrafficLights />
        <span className="flex-1 text-center text-[12.5px] font-medium text-[#8f8f92]">
          Slidenator
        </span>
      </div>

      {/* App body */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        {/* Main chat area */}
        <div className="relative flex flex-1 flex-col overflow-hidden bg-white">
          {/* Floating presentation pill */}
          <AnimatePresence>
            {showPill && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.21, 0.6, 0.35, 1] }}
                className="absolute left-3.5 top-3 z-10 flex items-center gap-1.5 rounded-full border border-[#e6e6e6] bg-white px-3 py-1.5 text-[12px] font-medium shadow-sm"
              >
                <span aria-hidden>🎞</span>
                <span className="text-[#1f1f1f]">Resultados Q2</span>
                <span className="text-[#c4c4c8]">·</span>
                <AnimatePresence mode="wait">
                  <motion.span
                    key={pillVer}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 4 }}
                    transition={{ duration: 0.2 }}
                    className="font-mono text-[11px] text-[#8f8f92]"
                  >
                    v{pillVer}
                  </motion.span>
                </AnimatePresence>
                <button
                  className="ml-0.5 rounded px-1 py-0.5 text-[11px] text-[#8f8f92] hover:bg-[#f1f1f3]"
                  aria-label="Abrir apresentação"
                  tabIndex={-1}
                >
                  ↗
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Chat scroll */}
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto px-5 pb-4"
            style={{ paddingTop: showPill ? "3.5rem" : "1.5rem" }}
          >
            <div className="mx-auto flex max-w-[680px] flex-col gap-4">
              <AnimatePresence initial={false}>
                {/* User message 1 */}
                {msg1Sent && (
                  <UserBubble key="msg1" text={MSG_1} />
                )}

                {/* Thinking dots */}
                {thinking && <ThinkingDots key="thinking" />}

                {/* Assistant response */}
                {showResponse && (
                  <AssistantBubble key="response" text={ASSISTANT_REPLY} />
                )}

                {/* Progress card */}
                {progressCount > 0 && (
                  <motion.div key="progress" layout>
                    <ProgressCard count={progressCount} />
                  </motion.div>
                )}

                {/* User message 2 */}
                {msg2Sent && (
                  <UserBubble key="msg2" text={MSG_2} />
                )}

                {/* Edit progress card */}
                {editCount > 0 && (
                  <motion.div key="edit" layout>
                    <EditCard count={editCount} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Composer */}
          <div className="border-t border-[#e6e6e6] px-4 pb-4 pt-2.5">
            <div className="flex items-center gap-2 rounded-2xl border border-[#d9d9de] bg-white px-3 py-2 shadow-[0_1px_6px_rgba(0,0,0,0.04)]">
              <button
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-lg text-[#8f8f92]"
                tabIndex={-1}
                aria-hidden
              >
                ＋
              </button>
              <div className="flex-1 text-[13px] text-[#1f1f1f]">
                {composerText ? (
                  <span>
                    {composerText}
                    {isTyping && <span className="caret" />}
                  </span>
                ) : (
                  <span className="text-[#8f8f92]">
                    Descreva a apresentação que você precisa…
                  </span>
                )}
              </div>
              <button
                className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[#171717] text-white"
                tabIndex={-1}
                aria-hidden
              >
                ↑
              </button>
            </div>
            <p className="mt-1.5 text-center font-mono text-[10.5px] text-[#8f8f92]">
              Arraste logo e documentos para o chat
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
