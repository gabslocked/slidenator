// Bento de recursos — cada card é uma micro-demo viva em DOM animado em loop.
// Alturas travadas nos contêineres de animação; useReducedMotion() em todo loop.
import { useState, useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Reveal } from "../components/Reveal";

function CardShell({
  children,
  className = "",
  span = "",
}: {
  children: React.ReactNode;
  className?: string;
  span?: string;
}) {
  return (
    <div
      className={`group relative overflow-hidden rounded-2xl border border-hair bg-panel p-6 transition-colors hover:border-neon/20 ${span} ${className}`}
    >
      {children}
    </div>
  );
}

function CardTitle({ kicker, title, desc }: { kicker: string; title: string; desc: string }) {
  return (
    <div>
      <p className="kicker text-[10px] text-neon">{kicker}</p>
      <h3 className="mt-2.5 text-lg font-semibold tracking-tight">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-mut">{desc}</p>
    </div>
  );
}

/* ─────────────────── a. Entrevista inteligente ─────────────────── */

const CHAT_PAIRS: Array<{ q: string; a: string }> = [
  { q: "Qual o tema desta apresentação?", a: "Resultados do Q2 para investidores" },
  { q: "Tem logo ou paleta de cores?", a: "Sim — vou soltar o PDF aqui →" },
  { q: "Prefere tom formal ou dinâmico?", a: "Dinâmico, com dados em tempo real" },
];

function ChatDemo() {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState<"typing-q" | "show-q" | "typing-a" | "show-a">("typing-q");

  useEffect(() => {
    if (reduced) {
      setPhase("show-a");
      return;
    }
    setPhase("typing-q");
    const t1 = setTimeout(() => setPhase("show-q"), 700);
    const t2 = setTimeout(() => setPhase("typing-a"), 1400);
    const t3 = setTimeout(() => setPhase("show-a"), 2100);
    const t4 = setTimeout(() => setIdx((i) => (i + 1) % CHAT_PAIRS.length), 3400);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [idx, reduced]);

  const pair = CHAT_PAIRS[idx];

  return (
    <div className="mt-5 h-[152px] space-y-2 overflow-hidden">
      {/* Assistente */}
      <AnimatePresence mode="wait">
        {(phase === "show-q" || phase === "typing-a" || phase === "show-a") ? (
          <motion.div
            key={`q-${idx}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.21, 0.6, 0.35, 1] }}
            className="flex"
          >
            <div className="max-w-[78%] rounded-xl rounded-tl-sm border border-hair bg-deep px-3 py-2 text-xs text-ink">
              {pair.q}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`tq-${idx}`}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex"
          >
            <div className="flex items-center gap-1 rounded-xl rounded-tl-sm border border-hair bg-deep px-3 py-2.5">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-dim" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-dim" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-dim" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Usuário */}
      <AnimatePresence mode="wait">
        {phase === "typing-a" && (
          <motion.div
            key={`ta-${idx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex justify-end"
          >
            <div className="flex items-center gap-1 rounded-xl rounded-tr-sm border border-neon/30 bg-neon/[0.07] px-3 py-2.5">
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neon" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neon" />
              <span className="typing-dot h-1.5 w-1.5 rounded-full bg-neon" />
            </div>
          </motion.div>
        )}
        {phase === "show-a" && (
          <motion.div
            key={`a-${idx}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.21, 0.6, 0.35, 1] }}
            className="flex justify-end"
          >
            <div className="max-w-[78%] rounded-xl rounded-tr-sm border border-neon/30 bg-neon/[0.07] px-3 py-2 text-xs text-ink">
              {pair.a}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────── b. Identidade extraída do logo ─────────────────── */

const PALETTES: Array<{ bg: string; swatches: string[] }> = [
  { bg: "#1b3d6f", swatches: ["#1b3d6f", "#2e6ab1", "#f0a500", "#f5f5f2"] },
  { bg: "#7c1d1d", swatches: ["#7c1d1d", "#c44b4b", "#f5c842", "#f5f5f2"] },
  { bg: "#1a5c3a", swatches: ["#1a5c3a", "#2e9b6a", "#7ee8a2", "#f5f5f2"] },
];

function LogoDemo() {
  const reduced = useReducedMotion();
  const [idx, setIdx] = useState(0);
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    if (reduced) {
      setVisibleCount(4);
      return;
    }
    setVisibleCount(0);
    const timers: number[] = [];
    for (let i = 1; i <= 4; i++) {
      timers.push(setTimeout(() => setVisibleCount(i), i * 340));
    }
    timers.push(
      setTimeout(() => {
        setIdx((prev) => (prev + 1) % PALETTES.length);
      }, 4 * 340 + 1400),
    );
    return () => timers.forEach(clearTimeout);
  }, [idx, reduced]);

  const pal = PALETTES[idx];

  return (
    <div className="mt-5 h-[110px] overflow-hidden">
      <div className="flex items-center gap-4">
        {/* Logo fake */}
        <AnimatePresence mode="wait">
          <motion.div
            key={idx}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.35, ease: [0.21, 0.6, 0.35, 1] }}
            className="h-14 w-14 shrink-0 rounded-xl"
            style={{ background: pal.bg }}
          >
            <div className="flex h-full items-center justify-center">
              <div className="h-5 w-5 rounded-sm bg-white/30" />
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Swatches */}
        <div className="flex flex-col gap-1.5">
          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-dim">Paleta detectada</p>
          <div className="flex gap-2">
            {pal.swatches.map((color, i) => (
              <AnimatePresence key={`${idx}-${color}`}>
                {i < visibleCount && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.4, y: 6 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.21, 0.6, 0.35, 1] }}
                    className="h-7 w-7 rounded-lg border border-hair shadow-sm"
                    style={{ background: color }}
                    title={color}
                  />
                )}
              </AnimatePresence>
            ))}
          </div>
          {visibleCount === 4 && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-mono text-[9px] text-neon"
            >
              aplicando ao slide…
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── c. Slides que se mexem ─────────────────── */

const BAR_SETS: number[][] = [
  [38, 62, 50, 80, 72],
  [55, 45, 74, 60, 90],
  [42, 70, 56, 76, 64],
];

const BADGE_STATES = [
  { label: "SAUDÁVEL", color: "#46d09a", bg: "rgba(46,208,110,0.12)", border: "rgba(46,208,110,0.4)" },
  { label: "ATENÇÃO", color: "#5fc0e8", bg: "rgba(95,192,232,0.12)", border: "rgba(95,192,232,0.4)" },
  { label: "SATURADO", color: "#c44b4b", bg: "rgba(196,75,75,0.12)", border: "rgba(196,75,75,0.4)" },
];

function SlideDemo() {
  const reduced = useReducedMotion();
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setTick((t) => (t + 1) % BAR_SETS.length), 2200);
    return () => clearInterval(id);
  }, [reduced]);

  const bars = BAR_SETS[tick];
  const badge = BADGE_STATES[tick];

  return (
    <div className="mt-5 h-[110px] overflow-hidden">
      {/* Mini slide 16:9 */}
      <div className="relative h-full overflow-hidden rounded-xl border border-hair bg-deep">
        {/* Badge */}
        <div className="absolute right-2.5 top-2.5">
          <AnimatePresence mode="wait">
            <motion.span
              key={badge.label}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.25 }}
              className="inline-block rounded-md border px-1.5 py-0.5 font-mono text-[8px] font-semibold uppercase tracking-wider"
              style={{ color: badge.color, background: badge.bg, borderColor: badge.border }}
            >
              {badge.label}
            </motion.span>
          </AnimatePresence>
        </div>

        {/* Barras */}
        <div className="absolute inset-x-2.5 bottom-2.5 flex items-end gap-1" style={{ height: "65%" }}>
          {bars.map((h, i) => (
            <motion.div
              key={i}
              className={`flex-1 rounded-t-[3px] ${i === bars.length - 1 ? "bg-neon" : "bg-neon/30"}`}
              animate={{ height: `${h}%` }}
              transition={{ type: "spring", stiffness: 180, damping: 24 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────── d. Equipe de agents ─────────────────── */

// Matches the real app's .progress-card monospace log style
const AGENT_STEPS = [
  { label: "[roteiro]", detail: "narrativa e estrutura" },
  { label: "[design]", detail: "identidade visual aplicada" },
  { label: "[interacao]", detail: "animações e demos" },
  { label: "[construcao]", detail: "slides em paralelo…" },
  { label: "[revisao]", detail: "coerência verificada" },
];

function AgentsFeed() {
  const reduced = useReducedMotion();
  const [count, setCount] = useState(1);

  useEffect(() => {
    if (reduced) {
      setCount(AGENT_STEPS.length);
      return;
    }
    const id = setInterval(
      () => setCount((c) => (c >= AGENT_STEPS.length ? 1 : c + 1)),
      900,
    );
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <div className="mt-5 h-[182px] overflow-hidden rounded-xl border border-hair bg-deep px-4 py-3 font-mono text-[11.5px] leading-[1.9]">
      <AnimatePresence initial={false}>
        {AGENT_STEPS.slice(0, count).map((step, i) => {
          const done = i < count - 1 || count === AGENT_STEPS.length;
          const active = i === count - 1 && count < AGENT_STEPS.length;
          return (
            <motion.div
              key={step.label + i}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.21, 0.6, 0.35, 1] }}
            >
              <span className="font-bold text-neon">{step.label}</span>{" "}
              <span className="text-dim">{step.detail}</span>
              {done && <span className="text-mint"> ✓</span>}
              {active && <span className="text-dim"> em progresso</span>}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

/* ─────────────────── e. Edição por conversa ─────────────────── */

function EditDemo() {
  const reduced = useReducedMotion();
  const [rounded, setRounded] = useState(true);
  const [showBubble, setShowBubble] = useState(true);

  useEffect(() => {
    if (reduced) {
      setRounded(false);
      setShowBubble(false);
      return;
    }
    let innerTimer = 0;
    const id = setInterval(() => {
      setRounded((r) => !r);
      setShowBubble(true);
      innerTimer = setTimeout(() => setShowBubble(false), 1300);
    }, 2800);
    return () => {
      clearInterval(id);
      clearTimeout(innerTimer);
    };
  }, [reduced]);

  return (
    <div className="mt-5 h-[130px] space-y-2 overflow-hidden">
      {/* Balão de chat com o comando */}
      <AnimatePresence>
        {showBubble && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 6 }}
            transition={{ duration: 0.3 }}
            className="flex"
          >
            <div className="rounded-xl rounded-tl-sm border border-hair bg-deep px-3 py-2 text-[11px] text-ink">
              troca o slide 3 para{" "}
              <span className="font-semibold text-neon">
                {rounded ? "bordas retas" : "bordas arredondadas"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini slide com cantos animados */}
      <motion.div
        className="border border-hair bg-panel"
        style={{ height: 72, borderRadius: "0.75rem" }}
        animate={{ borderRadius: rounded ? "0.75rem" : "0rem" }}
        transition={{ duration: 0.55, ease: [0.21, 0.6, 0.35, 1] }}
      >
        <div className="flex h-full items-end gap-1 p-2.5 pb-3">
          {[45, 70, 55, 90, 62].map((h, i) => (
            <div key={i} className="flex flex-1 items-end justify-center" style={{ height: "100%" }}>
              <div
                className="w-full bg-neon/25 rounded-t-[2px]"
                style={{ height: `${h}%` }}
              />
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

/* ─────────────────── f. Multi-tenant ─────────────────── */

const TIERS = ["Individual", "Teams", "Enterprise"] as const;

function MultiTenantDemo() {
  const reduced = useReducedMotion();
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setActive((a) => (a + 1) % TIERS.length), 1500);
    return () => clearInterval(id);
  }, [reduced]);

  return (
    <div className="mt-5 flex h-[80px] flex-col justify-center gap-3">
      <div className="flex flex-wrap gap-2">
        {TIERS.map((tier, i) => (
          <motion.span
            key={tier}
            animate={{
              borderColor: i === active ? "rgba(58,77,104,0.6)" : "rgba(23,23,22,0.09)",
              color: i === active ? "#3a4d68" : "#8b8b90",
              backgroundColor: i === active ? "rgba(58,77,104,0.07)" : "transparent",
            }}
            transition={{ duration: 0.28 }}
            className="cursor-default rounded-full border px-4 py-1.5 font-mono text-xs"
          >
            {tier}
          </motion.span>
        ))}
      </div>
      <p className="font-mono text-[10px] text-dim">
        {TIERS[active] === "Individual" && "1 usuário · projetos pessoais"}
        {TIERS[active] === "Teams" && "organização compartilhada · múltiplos usuários"}
        {TIERS[active] === "Enterprise" && "volume personalizado · onboarding dedicado"}
      </p>
    </div>
  );
}

/* ─────────────────── Seção ─────────────────── */

export default function BentoFeatures() {
  return (
    <section id="recursos" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="text-center">
        <p className="kicker text-neon">Recursos</p>
        <h2 className="display mx-auto mt-4 max-w-2xl text-4xl md:text-[3.4rem] md:leading-[1.05]">
          Tudo que a apresentação precisa. <em>Nada que atrapalhe.</em>
        </h2>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Row 1: Chat (wide) + Multi-tenant */}
          <CardShell span="md:col-span-2">
            <CardTitle
              kicker="Entrevista inteligente"
              title="O assistente coleta tudo no chat"
              desc="Perguntas diretas, logo e documentos por drag-and-drop no próprio chat — sem formulário, sem upload separado."
            />
            <ChatDemo />
          </CardShell>

          <CardShell>
            <CardTitle
              kicker="Multi-tenant"
              title="Planos para cada escala"
              desc="Individual, equipe ou enterprise — cada contexto com seu workspace."
            />
            <MultiTenantDemo />
          </CardShell>

          {/* Row 2: Logo + Slides (wide) */}
          <CardShell>
            <CardTitle
              kicker="Identidade visual"
              title="Logo vira paleta em segundos"
              desc="Cores e tipografia extraídas automaticamente e aplicadas a cada slide."
            />
            <LogoDemo />
          </CardShell>

          <CardShell span="md:col-span-2">
            <CardTitle
              kicker="Slides que se mexem"
              title="Dados animados, não estáticos"
              desc="Gráficos crescem, badges atualizam, slides respondem a cliques — HTML puro, sem plugin."
            />
            <SlideDemo />
          </CardShell>

          {/* Row 3: Agents (wide) + Edit */}
          <CardShell span="md:col-span-2">
            <CardTitle
              kicker="Equipe de agents"
              title="Roteiro, layout, interações e revisão em paralelo"
              desc="Cada agent tem um papel. O resultado é validado antes de chegar até você."
            />
            <AgentsFeed />
          </CardShell>

          <CardShell>
            <CardTitle
              kicker="Edição por conversa"
              title="Mude o que quiser pelo chat"
              desc="Peça mudanças em linguagem natural. O pill da apresentação atualiza de v1 para v2 quando a edição termina."
            />
            <EditDemo />
          </CardShell>
        </div>
      </Reveal>
    </section>
  );
}
