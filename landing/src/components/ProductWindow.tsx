/**
 * ProductWindow 2.0 — a cena-herói do produto.
 *
 * Coreografia em máquina de estados (`stage` 0→5): o usuário descreve a
 * apresentação no chat à esquerda, a resposta streama (typewriter), a TELA
 * DIVIDE e um visualizador surge à direita — os slides materializam um a um
 * enquanto a timeline de agents (roteirista → diretor visual → construção →
 * montagem) avança e a conversa continua ao vivo.
 *
 * Invariantes:
 *  - Altura externa TRAVADA (h-[560px] / md:h-[480px]); a divisão anima só o
 *    grid-template interno via CSS (.split-grid), então a página nunca reflui.
 *  - useReducedMotion congela no estado final informativo (tudo pronto, 9,2s).
 *  - Cronômetro isolado em <ElapsedTimer/> para não re-renderizar a árvore.
 *  - Determinístico: nenhuma parte depende de Math.random().
 */
import { useState, useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

// ── Paleta local do "app" (janela clara literal, fora do tema da página) ───────
const P = {
  ink: "#1f1f1f",
  mut: "#8f8f92",
  faint: "#c4c4c8",
  line: "#e6e6e6",
  surface: "#f7f7f8",
  brand: "#3a4d68",
  brandSoft: "#a8b8d4",
  brandWash: "rgba(58,77,104,0.10)",
  mint: "#2f9e6e",
};

const EASE = [0.21, 0.6, 0.35, 1] as const;

// ── Conteúdo da demo ───────────────────────────────────────────────────────────
const MSG_1 = "Resultados do Q2 para investidores — 7 slides";
const REPLY_1 =
  "Separei em 7 slides. Abri o visualizador ao lado: cada slide aparece assim que fica pronto, e a gente segue ajustando por aqui.";
const MSG_2 = "capricha no slide de abertura, quero mais direto";
const REPLY_2 = "Priorizei o slide 1 — mais enxuto.";

type SlideKind = "cover" | "kpis" | "bars" | "line" | "split" | "quote" | "close";
const SLIDES: { kind: SlideKind; label: string }[] = [
  { kind: "cover", label: "Abertura" },
  { kind: "kpis", label: "Destaques" },
  { kind: "bars", label: "Receita" },
  { kind: "line", label: "Crescimento" },
  { kind: "split", label: "Mercado" },
  { kind: "quote", label: "Visão" },
  { kind: "close", label: "Próximos passos" },
];

const AGENTS = ["Roteirista", "Diretor visual", "Construção", "Montagem"] as const;

// ── Cronômetro isolado (conta até o benchmark real ~9,2s e congela) ────────────
function ElapsedTimer({ run, done }: { run: boolean; done: boolean }) {
  const reduced = useReducedMotion() ?? false;
  const [v, setV] = useState(reduced ? 9.2 : 0);
  const started = useRef(false);

  useEffect(() => {
    if (reduced) {
      setV(9.2);
      return;
    }
    if (done) {
      setV(9.2);
      started.current = false;
      return;
    }
    if (!run) return;
    started.current = true;
    const start = performance.now();
    const DUR = 4600;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / DUR);
      setV(9.2 * (1 - Math.pow(1 - p, 2)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, done, reduced]);

  return (
    <span className="font-mono tabular-nums">
      {v.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}s
    </span>
  );
}

// ── Mini-slide 16:9 procedural (thumb ou hero) ─────────────────────────────────
function SlideContent({ kind, hero }: { kind: SlideKind; hero: boolean }) {
  const barH = hero ? { transition: { duration: 0.6, ease: EASE } } : {};
  switch (kind) {
    case "cover":
      return (
        <div
          className="flex h-full w-full flex-col justify-between p-[9%]"
          style={{ background: P.brand }}
        >
          <div className="h-1.5 w-1/4 rounded-full" style={{ background: "rgba(255,255,255,0.4)" }} />
          <div className="space-y-1.5">
            <div className="h-2 w-4/5 rounded-full" style={{ background: "rgba(255,255,255,0.9)" }} />
            <div className="h-2 w-2/5 rounded-full" style={{ background: "rgba(255,255,255,0.5)" }} />
          </div>
        </div>
      );
    case "kpis":
      return (
        <div className="grid h-full w-full grid-cols-3 gap-[5%] p-[8%]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex flex-col justify-end gap-1">
              <div className="h-3 w-full rounded" style={{ background: P.brandWash }} />
              <div className="h-1.5 w-3/4 rounded-full" style={{ background: i === 0 ? P.brand : P.faint }} />
              <div className="h-1 w-1/2 rounded-full" style={{ background: P.line }} />
            </div>
          ))}
        </div>
      );
    case "bars":
      return (
        <div className="flex h-full w-full flex-col justify-between p-[8%]">
          <div className="h-1.5 w-1/3 rounded-full" style={{ background: P.brandSoft }} />
          <div className="flex items-end gap-[4%]" style={{ height: "62%" }}>
            {[46, 68, 54, 88, 72].map((h, i) => (
              <motion.div
                key={i}
                className="flex-1 rounded-t-sm"
                style={{ background: i === 3 ? P.brand : P.brandWash }}
                initial={hero ? { height: 0 } : false}
                animate={{ height: `${h}%` }}
                {...barH}
              />
            ))}
          </div>
        </div>
      );
    case "line":
      return (
        <div className="flex h-full w-full flex-col justify-between p-[8%]">
          <div className="h-1.5 w-2/5 rounded-full" style={{ background: P.brandSoft }} />
          <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="h-[58%] w-full">
            <motion.polyline
              points="2,34 20,26 38,30 56,14 74,18 98,4"
              fill="none"
              stroke={P.brand}
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={hero ? { pathLength: 0 } : false}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8, ease: EASE }}
            />
          </svg>
        </div>
      );
    case "split":
      return (
        <div className="flex h-full w-full gap-[6%] p-[8%]">
          <div className="flex flex-1 flex-col justify-center gap-1.5">
            <div className="h-1.5 w-full rounded-full" style={{ background: P.ink }} />
            <div className="h-1.5 w-4/5 rounded-full" style={{ background: P.faint }} />
            <div className="h-1.5 w-3/5 rounded-full" style={{ background: P.faint }} />
          </div>
          <div className="w-2/5 rounded-md" style={{ background: P.brandWash }} />
        </div>
      );
    case "quote":
      return (
        <div className="flex h-full w-full flex-col justify-center gap-2 p-[9%]">
          <div className="font-serif text-2xl leading-none" style={{ color: P.brandSoft }}>
            &ldquo;
          </div>
          <div className="h-1.5 w-full rounded-full" style={{ background: P.ink }} />
          <div className="h-1.5 w-2/3 rounded-full" style={{ background: P.faint }} />
        </div>
      );
    case "close":
      return (
        <div
          className="flex h-full w-full flex-col items-center justify-center gap-2"
          style={{ background: P.surface }}
        >
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full"
            style={{ background: P.brandWash, color: P.brand }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="h-3 w-3">
              <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="h-1.5 w-1/3 rounded-full" style={{ background: P.faint }} />
        </div>
      );
  }
}

function SlideFrame({
  kind,
  hero = false,
  className = "",
}: {
  kind: SlideKind;
  hero?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`aspect-video w-full overflow-hidden rounded-md border ${className}`}
      style={{ borderColor: P.line, background: "#fff" }}
    >
      <SlideContent kind={kind} hero={hero} />
    </div>
  );
}

// ── Timeline horizontal de agents ──────────────────────────────────────────────
function AgentRail({ stage }: { stage: number }) {
  // step i: active quando stage === i+1, done quando stage > i+1
  return (
    <div className="flex items-center gap-1.5 px-3.5 py-2.5">
      {AGENTS.map((name, i) => {
        const active = stage === i + 1;
        const done = stage > i + 1;
        return (
          <div key={name} className="flex flex-1 items-center gap-1.5">
            <span
              className="relative flex h-3.5 w-3.5 flex-none items-center justify-center rounded-full"
              style={{
                background: done ? P.mint : active ? P.brand : P.line,
              }}
            >
              {done ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" className="h-2 w-2">
                  <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              ) : active ? (
                <span className="live-halo absolute inset-0 rounded-full" style={{ background: P.brand }} />
              ) : null}
            </span>
            <span
              className="hidden truncate text-[10.5px] font-medium lg:inline"
              style={{ color: done || active ? P.ink : P.faint }}
            >
              {name}
            </span>
            {i < AGENTS.length - 1 && (
              <span className="mx-0.5 h-px flex-1 overflow-hidden rounded-full" style={{ background: P.line }}>
                <span
                  className="block h-full origin-left"
                  style={{
                    background: P.brandSoft,
                    transform: `scaleX(${done ? 1 : 0})`,
                    transition: "transform 0.5s ease",
                  }}
                />
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Chat: bolhas ───────────────────────────────────────────────────────────────
function UserBubble({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex justify-end"
    >
      <div
        className="max-w-[82%] rounded-2xl rounded-tr-sm px-3.5 py-2 text-[12.5px] leading-relaxed"
        style={{ background: "#f1f1f3", color: P.ink }}
      >
        {text}
      </div>
    </motion.div>
  );
}

function AssistantLine({ text, caret }: { text: string; caret: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      className="flex items-start gap-2.5"
    >
      <div className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-[#171717] text-[9.5px] font-bold text-white">
        S
      </div>
      <div className="text-[12.5px] leading-relaxed" style={{ color: P.ink }}>
        {text}
        {caret && <span className="caret" />}
      </div>
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
      <div className="flex h-6 w-6 flex-none items-center justify-center rounded-lg bg-[#171717] text-[9.5px] font-bold text-white">
        S
      </div>
      <div
        className="flex items-center gap-1 rounded-xl rounded-tl-sm border px-3 py-2.5"
        style={{ borderColor: P.line }}
      >
        <span className="typing-dot h-1.5 w-1.5 rounded-full" style={{ background: P.faint }} />
        <span className="typing-dot h-1.5 w-1.5 rounded-full" style={{ background: P.faint }} />
        <span className="typing-dot h-1.5 w-1.5 rounded-full" style={{ background: P.faint }} />
      </div>
    </motion.div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────
export default function ProductWindow() {
  const reduced = useReducedMotion() ?? false;

  const [loopKey, setLoopKey] = useState(0);
  const [typed1, setTyped1] = useState(0);
  const [sent1, setSent1] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [stream1, setStream1] = useState(0);
  const [stage, setStage] = useState(0); // 0 none · 1 roteiro · 2 visual · 3 constr · 4 montagem · 5 done
  const [built, setBuilt] = useState(0); // slides materializados
  const [typed2, setTyped2] = useState(0);
  const [sent2, setSent2] = useState(false);
  const [stream2, setStream2] = useState(0);

  const split = reduced || stage >= 3;
  const done = stage >= 5;
  const heroIdx = Math.max(0, built - 1); // slide grande = último pronto

  const chatRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [sent1, thinking, stream1, sent2, stream2, stage]);

  useEffect(() => {
    if (reduced) {
      setTyped1(MSG_1.length);
      setSent1(true);
      setThinking(false);
      setStream1(REPLY_1.length);
      setStage(5);
      setBuilt(SLIDES.length);
      setTyped2(MSG_2.length);
      setSent2(true);
      setStream2(REPLY_2.length);
      return;
    }

    // reset
    setTyped1(0);
    setSent1(false);
    setThinking(false);
    setStream1(0);
    setStage(0);
    setBuilt(0);
    setTyped2(0);
    setSent2(false);
    setStream2(0);

    const ts: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => ts.push(setTimeout(fn, ms));

    let c = 500;
    // ① digita mensagem 1
    for (let i = 1; i <= MSG_1.length; i++) {
      const n = i;
      at(c + n * 34, () => setTyped1(n));
    }
    c += MSG_1.length * 34 + 320;
    // ② envia
    at(c, () => setSent1(true));
    c += 300;
    // ③ pensando
    at(c, () => setThinking(true));
    c += 1000;
    // ④ resposta streamando
    at(c, () => setThinking(false));
    for (let i = 1; i <= REPLY_1.length; i++) {
      const n = i;
      at(c + n * 15, () => setStream1(n));
    }
    c += REPLY_1.length * 15 + 250;
    // ⑤ pipeline arranca — roteirista (a tela ainda não dividiu)
    at(c, () => setStage(1));
    c += 850;
    // ⑥ diretor visual
    at(c, () => setStage(2));
    c += 850;
    // ⑦ construção — TELA DIVIDE (stage 3 → split) e slides materializam
    at(c, () => setStage(3));
    for (let i = 1; i <= SLIDES.length; i++) {
      const n = i;
      at(c + 350 + n * 560, () => setBuilt(n));
    }
    // conversa ao vivo durante a construção
    const constrEnd = 350 + SLIDES.length * 560;
    const m2 = c + Math.round(constrEnd * 0.42);
    for (let i = 1; i <= MSG_2.length; i++) {
      const n = i;
      at(m2 + n * 26, () => setTyped2(n));
    }
    at(m2 + MSG_2.length * 26 + 260, () => setSent2(true));
    const r2 = m2 + MSG_2.length * 26 + 700;
    for (let i = 1; i <= REPLY_2.length; i++) {
      const n = i;
      at(r2 + n * 16, () => setStream2(n));
    }
    c += constrEnd + 500;
    // ⑧ montagem
    at(c, () => setStage(4));
    c += 900;
    // ⑨ pronto
    at(c, () => setStage(5));
    c += 3400;
    // ⑩ loop
    at(c, () => setLoopKey((k) => k + 1));

    return () => ts.forEach(clearTimeout);
  }, [loopKey, reduced]);

  const composer =
    !sent1 && typed1 > 0
      ? MSG_1.slice(0, typed1)
      : !sent2 && typed2 > 0
        ? MSG_2.slice(0, typed2)
        : "";
  const composerTyping =
    (!sent1 && typed1 > 0 && typed1 < MSG_1.length) ||
    (!sent2 && typed2 > 0 && typed2 < MSG_2.length);

  const gridClass = split
    ? "grid-cols-1 grid-rows-[minmax(0,1fr)_minmax(0,1.05fr)] md:grid-cols-[minmax(0,1fr)_minmax(0,1.12fr)] md:grid-rows-[minmax(0,1fr)]"
    : "grid-cols-1 grid-rows-[minmax(0,1fr)_0fr] md:grid-cols-[minmax(0,1fr)_0fr] md:grid-rows-[minmax(0,1fr)]";

  return (
    <div
      className="flex h-[560px] flex-col overflow-hidden rounded-2xl border bg-white shadow-[0_18px_60px_-12px_rgba(23,23,22,0.28)] md:h-[480px]"
      style={{ borderColor: P.line }}
      aria-label="Demonstração ao vivo do Slidenator: chat gerando uma apresentação"
    >
      {/* Barra de janela */}
      <div
        className="flex h-9 flex-none items-center gap-3 border-b px-4"
        style={{ borderColor: P.line, background: P.surface }}
      >
        <div className="flex items-center gap-1.5" aria-hidden>
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>
        <span className="flex-1 text-center text-[12px] font-medium" style={{ color: P.mut }}>
          Slidenator — Resultados Q2
        </span>
        <span className="w-10" />
      </div>

      {/* Corpo split */}
      <div className={`split-grid grid flex-1 overflow-hidden ${gridClass}`}>
        {/* ── Chat (esquerda) ── */}
        <section className="flex min-h-0 min-w-0 flex-col bg-white">
          <div ref={chatRef} className="flex-1 overflow-y-auto px-4 py-4 md:px-5">
            <div className="mx-auto flex max-w-[560px] flex-col gap-3.5">
              <AnimatePresence initial={false}>
                {sent1 && <UserBubble key="m1" text={MSG_1} />}
                {thinking && <ThinkingDots key="think" />}
                {stream1 > 0 && (
                  <AssistantLine
                    key="r1"
                    text={REPLY_1.slice(0, stream1)}
                    caret={stream1 < REPLY_1.length}
                  />
                )}
                {sent2 && <UserBubble key="m2" text={MSG_2} />}
                {stream2 > 0 && (
                  <AssistantLine
                    key="r2"
                    text={REPLY_2.slice(0, stream2)}
                    caret={stream2 < REPLY_2.length}
                  />
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Composer */}
          <div className="flex-none border-t px-4 pb-3.5 pt-2.5" style={{ borderColor: P.line }}>
            <div
              className="flex items-center gap-2 rounded-2xl border bg-white px-3 py-2"
              style={{ borderColor: "#d9d9de", boxShadow: "0 1px 6px rgba(0,0,0,0.04)" }}
            >
              <span
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full text-base"
                style={{ color: P.mut }}
                aria-hidden
              >
                ＋
              </span>
              <div className="min-w-0 flex-1 truncate text-[12.5px]" style={{ color: P.ink }}>
                {composer ? (
                  <span>
                    {composer}
                    {composerTyping && <span className="caret" />}
                  </span>
                ) : (
                  <span style={{ color: P.mut }}>Descreva a apresentação que você precisa…</span>
                )}
              </div>
              <span
                className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-[#171717] text-white"
                aria-hidden
              >
                ↑
              </span>
            </div>
          </div>
        </section>

        {/* ── Visualizador (direita) ── */}
        <section
          className="flex min-h-0 min-w-0 flex-col border-t md:border-l md:border-t-0"
          style={{ borderColor: P.line, background: P.surface }}
        >
          {/* cabeçalho do viewer */}
          <div
            className="flex h-9 flex-none items-center justify-between border-b px-3.5"
            style={{ borderColor: P.line }}
          >
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-2 w-2 items-center justify-center">
                <span
                  className="live-halo absolute inline-flex h-full w-full rounded-full"
                  style={{ background: done ? P.mint : P.brand }}
                />
                <span
                  className="relative h-1.5 w-1.5 rounded-full"
                  style={{ background: done ? P.mint : P.brand }}
                />
              </span>
              <span className="text-[11px] font-medium" style={{ color: P.ink }}>
                {done ? "Apresentação pronta" : "Gerando ao vivo"}
              </span>
            </div>
            <span className="text-[11px]" style={{ color: done ? P.mint : P.mut }}>
              <ElapsedTimer run={stage >= 3 && stage < 5} done={done} />
            </span>
          </div>

          {/* timeline de agents */}
          <div className="flex-none border-b" style={{ borderColor: P.line }}>
            <AgentRail stage={reduced ? 5 : stage} />
          </div>

          {/* palco: slide grande */}
          <div className="flex min-h-0 flex-1 items-center justify-center p-4">
            <div className="w-full max-w-[300px]">
              {built > 0 ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={heroIdx}
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.4, ease: EASE }}
                  >
                    <SlideFrame
                      kind={SLIDES[heroIdx].kind}
                      hero
                      className="shadow-[0_10px_30px_-8px_rgba(23,23,22,0.22)]"
                    />
                    <div className="mt-2 flex items-center justify-between">
                      <span className="font-mono text-[10px]" style={{ color: P.mut }}>
                        Slide {heroIdx + 1} · {SLIDES[heroIdx].label}
                      </span>
                      <span className="font-mono text-[10px]" style={{ color: P.mint }}>
                        {done ? "final" : "pronto ✓"}
                      </span>
                    </div>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="aspect-video w-full overflow-hidden rounded-md border" style={{ borderColor: P.line }}>
                  <div className="slide-shimmer h-full w-full" />
                </div>
              )}
            </div>
          </div>

          {/* filmstrip: 7 slots preenchendo um a um */}
          <div className="flex-none border-t px-3 py-2.5" style={{ borderColor: P.line }}>
            <div className="flex items-center gap-1.5">
              {SLIDES.map((s, i) => {
                const ready = i < built;
                const current = i === heroIdx && built > 0;
                return (
                  <div
                    key={i}
                    className="relative flex-1 overflow-hidden rounded-[3px] border transition-all"
                    style={{
                      borderColor: current ? P.brand : P.line,
                      boxShadow: current ? `0 0 0 1px ${P.brand}` : "none",
                    }}
                  >
                    <div className="aspect-video w-full">
                      {ready ? (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.3, ease: EASE }}
                          className="h-full w-full"
                        >
                          <SlideContent kind={s.kind} hero={false} />
                        </motion.div>
                      ) : (
                        <div className="slide-shimmer h-full w-full" style={{ background: "#fff" }} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-1.5 text-center font-mono text-[9.5px]" style={{ color: P.mut }}>
              {done ? "7 slides · 16:9 · HTML interativo" : `${built} de 7 slides`}
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
