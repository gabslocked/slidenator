import { Reveal } from "../components/Reveal";

const STEPS = [
  {
    num: "01",
    title: "Converse",
    desc: "O assistente entrevista você sobre objetivo, audiência e tom. Arraste o logo direto no chat para detectar a paleta — nenhum formulário, nenhum upload separado.",
    detail: "Drag-and-drop no chat · Identidade detectada",
  },
  {
    num: "02",
    title: "Agents executam",
    desc: "O card de progresso aparece no chat: [roteiro], [design] e [construcao] entram linha a linha. Você acompanha cada etapa — roteirista, diretor visual e revisor em paralelo.",
    detail: "[roteiro] → [design] → [construcao] → [montagem]",
  },
  {
    num: "03",
    title: "Edite pelo chat",
    desc: "O pill da apresentação surge no canto superior esquerdo — abra ou peça mudanças em conversa. O pill atualiza de v1 para v2 assim que a edição termina.",
    detail: "pill v1 → pedido em chat → pill v2",
  },
];

export default function HowItWorks() {
  return (
    <section id="como-funciona" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="text-center">
        <p className="kicker text-neon">Como funciona</p>
        <h2 className="display mx-auto mt-4 max-w-2xl text-4xl md:text-[3.4rem] md:leading-[1.05]">
          Três etapas. <em>Uma apresentação pronta para o mundo.</em>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-mut">
          Da conversa ao HTML publicável, sem exportar arquivo nenhum.
        </p>
      </Reveal>

      <div className="mt-16 grid gap-6 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <Reveal key={step.num} delay={0.08 + i * 0.07}>
            <div className="group relative flex h-full flex-col rounded-2xl border border-hair bg-panel p-8 transition-colors hover:border-neon/20">
              {/* Step number */}
              <span className="font-mono text-[11px] font-medium uppercase tracking-[0.2em] text-neon">
                {step.num}
              </span>

              {/* Connector line (not on last card) */}
              {i < STEPS.length - 1 && (
                <div className="absolute -right-3 top-1/2 hidden -translate-y-1/2 md:block">
                  <div className="h-px w-6 bg-hair" />
                </div>
              )}

              <h3 className="display mt-5 text-2xl">{step.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-mut">{step.desc}</p>

              <div className="mt-6 rounded-xl border border-hair bg-deep px-4 py-3">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
                  {step.detail}
                </p>
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
