/**
 * Speed — velocidade como argumento central, honesto.
 * Cronômetro que conta até o benchmark real (~9,2s para 7 slides) e um arco
 * que preenche uma única vez ao entrar na viewport. Sem métrica de negócio
 * inventada: só o tempo de geração, medido de verdade.
 */
import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Reveal, CountUp } from "../components/Reveal";

const R = 52;
const CIRC = 2 * Math.PI * R;

function SpeedDial() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <div ref={ref} className="relative mx-auto h-[220px] w-[220px] select-none">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle cx="60" cy="60" r={R} fill="none" stroke="currentColor" className="text-hair" strokeWidth="3" />
        <motion.circle
          cx="60"
          cy="60"
          r={R}
          fill="none"
          stroke="#a8b8d4"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          initial={{ strokeDashoffset: CIRC }}
          animate={inView ? { strokeDashoffset: CIRC * 0.12 } : { strokeDashoffset: CIRC }}
          transition={{ duration: 1.7, ease: [0.21, 0.6, 0.35, 1] }}
        />
        {/* marcas de segundo */}
        {Array.from({ length: 24 }).map((_, i) => {
          const a = (i / 24) * Math.PI * 2;
          const x1 = 60 + Math.cos(a) * 44;
          const y1 = 60 + Math.sin(a) * 44;
          const x2 = 60 + Math.cos(a) * (i % 6 === 0 ? 40 : 42);
          const y2 = 60 + Math.sin(a) * (i % 6 === 0 ? 40 : 42);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="currentColor"
              className="text-dim"
              strokeWidth={i % 6 === 0 ? 1.4 : 0.7}
              opacity={0.5}
            />
          );
        })}
      </svg>

      {/* ponteiro varrendo (ambiente) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="animate-sweep h-[74px] w-[74px]">
          <span className="absolute left-1/2 top-1/2 h-[36px] w-px origin-bottom -translate-x-1/2 -translate-y-full bg-[#a8b8d4]/70" />
        </div>
      </div>

      {/* leitura central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="display text-5xl tracking-tight text-ink">
          <CountUp to={9.2} decimals={1} duration={1.7} suffix="s" />
        </span>
        <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.2em] text-dim">
          7 slides
        </span>
      </div>
    </div>
  );
}

const FACTS = [
  {
    k: "geração completa",
    v: "~9s",
    d: "Da última pergunta ao HTML pronto para os 7 slides do benchmark.",
  },
  {
    k: "respostas do chat",
    v: "tempo real",
    d: "O texto do assistente streama enquanto é escrito — nada de girinha carregando.",
  },
  {
    k: "acompanhamento",
    v: "ao vivo",
    d: "A tela divide e cada slide aparece no visualizador assim que fica pronto.",
  },
];

export default function Speed() {
  return (
    <section className="scope-dark corner-ticks relative overflow-hidden px-6 py-28">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(65%_60%_at_50%_45%,black,transparent)]" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-14 md:grid-cols-2">
        <Reveal>
          <p className="kicker text-neon">Velocidade real</p>
          <h2 className="display mt-4 text-4xl leading-[1.05] md:text-[3.4rem]">
            Segundos. <em>Não horas.</em>
          </h2>
          <p className="mt-5 max-w-md text-mut">
            Enquanto uma apresentação à mão consome a tarde, aqui a conversa vira slides no
            tempo de um café — e você vê acontecer, um slide de cada vez.
          </p>

          <div className="mt-9 space-y-px overflow-hidden rounded-2xl border border-hair bg-hair">
            {FACTS.map((f) => (
              <div key={f.k} className="flex items-baseline gap-5 bg-deep/80 px-5 py-4 backdrop-blur">
                <span className="w-24 flex-none font-mono text-lg font-semibold tabular-nums text-ink">
                  {f.v}
                </span>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neon">{f.k}</p>
                  <p className="mt-1 text-sm leading-relaxed text-mut">{f.d}</p>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.12} className="flex flex-col items-center">
          <div className="relative rounded-[2rem] border border-hair bg-deep/60 p-10 backdrop-blur">
            <SpeedDial />
          </div>
          <p className="mt-6 max-w-xs text-center font-mono text-[10px] leading-relaxed text-dim">
            Benchmark interno de 7 slides. O tempo varia com o tamanho e a complexidade da
            apresentação.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
