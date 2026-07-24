/**
 * HowItWorks — narrativa do pipeline real, como uma linha do tempo vertical.
 * Da conversa ao HTML: cada agent é um estágio na espinha; construtores
 * trabalham em paralelo. Sem menção a modelo/vendor.
 */
import { Reveal } from "../components/Reveal";

type Stage = {
  num: string;
  actor: string;
  role: string;
  desc: string;
  tag: string;
  parallel?: boolean;
};

const STAGES: Stage[] = [
  {
    num: "00",
    actor: "Você",
    role: "conversa",
    desc: "Descreve objetivo, audiência e tom. Arrasta o logo direto no chat — nenhum formulário, nenhum upload separado.",
    tag: "drag-and-drop · identidade detectada",
  },
  {
    num: "01",
    actor: "Roteirista",
    role: "estrutura e narrativa",
    desc: "Quebra o tema em blocos com começo, meio e fim. Define o que cada slide precisa dizer antes de qualquer pixel ser desenhado.",
    tag: "[roteiro] narrativa e sequência",
  },
  {
    num: "02",
    actor: "Diretor visual",
    role: "identidade",
    desc: "Extrai paleta e tipografia do seu material e monta um sistema visual coerente — as mesmas cores em todos os slides.",
    tag: "[design] paleta · tipografia · grid",
  },
  {
    num: "03",
    actor: "Engenheiro de interação",
    role: "movimento",
    desc: "Define as animações e as demos clicáveis: gráficos que crescem, badges que trocam, elementos que respondem ao mouse.",
    tag: "[interação] animações · demos",
  },
  {
    num: "04",
    actor: "Construtores",
    role: "em paralelo",
    desc: "Vários slides são montados ao mesmo tempo, cada um em HTML 16:9. É daqui que vem a velocidade — o trabalho não é enfileirado.",
    tag: "[construção] slides simultâneos",
    parallel: true,
  },
  {
    num: "05",
    actor: "Revisor",
    role: "coerência",
    desc: "Confere consistência de estilo, hierarquia e continuidade entre os slides antes de qualquer coisa chegar até você.",
    tag: "[revisão] coerência verificada",
  },
  {
    num: "06",
    actor: "Montagem",
    role: "entrega",
    desc: "Os slides viram uma apresentação única, com link direto. Quer mudar algo? Volta pro chat — o resto do pipeline reage.",
    tag: "[montagem] apresentação publicável",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-5xl px-6 py-28">
      <Reveal className="text-center">
        <p className="kicker text-neon">Como funciona</p>
        <h2 className="display mx-auto mt-4 max-w-2xl text-4xl md:text-[3.4rem] md:leading-[1.05]">
          Da conversa ao HTML. <em>Uma equipe inteira em segundos.</em>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-mut">
          Cada agent tem um papel claro. Você acompanha a linha do tempo enquanto ela acontece
          — e continua conversando o tempo todo.
        </p>
      </Reveal>

      <div className="relative mt-16">
        {/* espinha */}
        <div className="absolute bottom-2 left-[19px] top-2 w-px bg-hair md:left-1/2 md:-translate-x-1/2" aria-hidden />

        <ol className="space-y-4">
          {STAGES.map((s, i) => (
            <Reveal key={s.num} delay={0.04 + i * 0.05}>
              <li
                className={`relative flex items-start gap-5 pl-0 md:w-1/2 ${
                  i % 2 === 0 ? "md:ml-0 md:pr-10 md:text-right" : "md:ml-auto md:pl-10"
                }`}
              >
                {/* nó */}
                <span
                  className={`relative z-10 mt-1 flex h-10 w-10 flex-none items-center justify-center rounded-full border bg-panel font-mono text-[11px] font-semibold ${
                    s.parallel ? "border-neon/40 text-neon" : "border-hair text-mut"
                  } ${i % 2 === 0 ? "md:order-2 md:-mr-5" : "md:-ml-5"}`}
                >
                  {s.num}
                </span>

                {/* conteúdo */}
                <div
                  className={`group flex-1 rounded-2xl border border-hair bg-panel p-5 transition-colors hover:border-neon/20 ${
                    i % 2 === 0 ? "md:order-1" : ""
                  }`}
                >
                  <div
                    className={`flex items-baseline gap-2.5 ${
                      i % 2 === 0 ? "md:justify-end" : ""
                    }`}
                  >
                    <h3 className="display text-xl">{s.actor}</h3>
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
                      {s.role}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-mut">{s.desc}</p>

                  {s.parallel ? (
                    <div className={`mt-3 flex gap-1.5 ${i % 2 === 0 ? "md:justify-end" : ""}`}>
                      {[0, 1, 2, 3].map((b) => (
                        <span
                          key={b}
                          className="h-5 w-9 rounded border border-neon/25 bg-neon/[0.06]"
                          aria-hidden
                        />
                      ))}
                    </div>
                  ) : (
                    <p
                      className={`mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-neon/80 ${
                        i % 2 === 0 ? "md:text-right" : ""
                      }`}
                    >
                      {s.tag}
                    </p>
                  )}
                </div>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
