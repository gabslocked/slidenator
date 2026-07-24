import { lazy, Suspense, useRef } from "react";
import { motion, useReducedMotion, useScroll } from "framer-motion";

const SlideField = lazy(() => import("../three/SlideField"));

const WORDS_1 = ["Converse."];
const WORDS_2 = ["Seus", "slides", "nascem", "vivos."];

function Word({ word, delay }: { word: string; delay: number }) {
  return (
    <motion.span
      className="inline-block whitespace-pre"
      initial={{ opacity: 0, y: 20, filter: "blur(8px)" }}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.65, delay, ease: [0.21, 0.6, 0.35, 1] }}
    >
      {word}{" "}
    </motion.span>
  );
}

export default function Hero() {
  const reduced = useReducedMotion() ?? false;
  const ref = useRef<HTMLElement | null>(null);
  // Progresso do scroll do herói → alimenta a cena 3D via MotionValue (sem re-render)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  return (
    <section
      ref={ref}
      className="scope-dark corner-ticks relative flex min-h-dvh flex-col justify-end overflow-hidden"
    >
      {/* three.js — molduras blueprint flutuando em profundidade, reativas ao scroll */}
      {!reduced && (
        <div className="pointer-events-none absolute inset-0 opacity-45">
          <Suspense fallback={null}>
            <SlideField tone="#a8b8d4" scroll={scrollYProgress} />
          </Suspense>
        </div>
      )}

      {/* Grid overlay */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(60%_60%_at_50%_50%,black,transparent)]" />
      {/* Radial vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_50%_42%,transparent_0%,#0b0b0e_92%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0b0b0e] to-transparent" />

      {/* Chip esquerda — roteirista concluiu */}
      <motion.div
        initial={{ opacity: 0, x: -24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 1.3 }}
        className="absolute left-[6%] top-[32%] z-10 hidden lg:block"
      >
        <div className="animate-float glass flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-xs">
          <span className="pulse-dot h-1.5 w-1.5 shrink-0 rounded-full bg-mint" />
          <span className="font-medium text-ink">Roteirista — concluiu</span>
          <span className="font-mono text-[10px] text-dim">há 3s</span>
        </div>
      </motion.div>

      {/* Chip direita topo — apresentação pronta em segundos */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 1.55 }}
        className="absolute right-[7%] top-[28%] z-10 hidden lg:block"
      >
        <div className="animate-float glass rounded-xl px-3.5 py-2.5 text-xs [animation-delay:1.2s]">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-dim">
            Apresentação pronta
          </p>
          <p className="mt-1 flex items-baseline gap-1.5 font-mono text-sm font-medium tabular-nums text-ink">
            7 slides · 9,2s
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 self-center text-mint"
              aria-hidden="true"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </p>
        </div>
      </motion.div>

      {/* Chip direita inferior — identidade detectada */}
      <motion.div
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.9, delay: 1.8 }}
        className="absolute right-[13%] top-[58%] z-10 hidden xl:block"
      >
        <div className="animate-float glass rounded-xl px-3.5 py-2.5 text-xs [animation-delay:2.4s]">
          <p className="flex items-center gap-1.5 font-medium text-ink">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan" />
            Identidade detectada
          </p>
          <div className="mt-1.5 flex gap-1">
            {["#1b3d6f", "#2e6ab1", "#f0a500", "#f5f5f2"].map((c) => (
              <span
                key={c}
                className="h-3.5 w-3.5 rounded-full border border-white/20"
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
      </motion.div>

      {/* Conteúdo do herói */}
      <div className="relative mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 pt-32 text-center">
        {/* Kicker badge */}
        <motion.a
          href="#como-funciona"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="glass group mb-8 flex items-center gap-2.5 rounded-full py-1.5 pl-3 pr-4 font-mono text-[11px] uppercase tracking-[0.14em] text-mut transition-colors hover:text-ink"
        >
          <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-mint" />
          Acompanhe cada slide surgir ao vivo
          <span className="text-dim transition-transform group-hover:translate-x-0.5">→</span>
        </motion.a>

        {/* Headline — palavra a palavra */}
        <h1 className="display max-w-4xl text-[3.2rem] leading-[1.02] md:text-[5rem]">
          <span className="block">
            {WORDS_1.map((w, i) => (
              <Word key={w} word={w} delay={0.45 + i * 0.09} />
            ))}
          </span>
          <span className="block text-[#a8b8d4]">
            {WORDS_2.map((w, i) => (
              <Word key={w} word={w} delay={0.65 + i * 0.09} />
            ))}
          </span>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.1 }}
          className="mt-7 max-w-xl text-base leading-relaxed text-mut md:text-lg"
        >
          Descreva em chat. A tela divide, os slides surgem um a um ao lado da conversa — uma
          apresentação HTML interativa em segundos, não numa tarde inteira.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.32 }}
          className="mt-9 flex flex-wrap items-center justify-center gap-3"
        >
          <a
            href="https://app.slidenator.com/login"
            className="btn-shine rounded-xl bg-neon px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#4a617c]"
          >
            Começar agora
          </a>
          <a
            href="#como-funciona"
            className="glass rounded-xl px-6 py-3.5 text-sm font-medium text-ink transition-colors hover:bg-white/10"
          >
            Como funciona ↓
          </a>
        </motion.div>

        {/* Indicador de scroll */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 2 }}
          className="mt-12 flex h-8 w-5 justify-center rounded-full border border-hair pt-1.5"
          aria-hidden="true"
        >
          <span className="animate-scroll-hint h-1.5 w-1 rounded-full bg-dim" />
        </motion.div>
      </div>

      {/* Faixa de números */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 1.05 }}
        className="relative mx-auto mb-10 grid w-full max-w-4xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-hair bg-hair md:grid-cols-4"
      >
        {[
          { label: "formato", value: "16:9 · HTML" },
          { label: "geração", value: "~9s" },
          { label: "acompanhe", value: "ao vivo" },
          { label: "edição", value: "pelo chat" },
        ].map((item) => (
          <div key={item.label} className="bg-deep/80 px-6 py-5 text-center backdrop-blur">
            <p className="text-xl font-semibold tracking-tight">{item.value}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
              {item.label}
            </p>
          </div>
        ))}
      </motion.div>
    </section>
  );
}
