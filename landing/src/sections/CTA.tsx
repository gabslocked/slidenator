import { Reveal } from "../components/Reveal";

export default function CTA() {
  return (
    <>
      <section id="cta" className="scope-dark corner-ticks relative overflow-hidden px-6 py-32">
        {/* Grade sutil mascarada */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.035)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.035)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(60%_60%_at_50%_50%,black,transparent)]" />

        <Reveal className="relative mx-auto max-w-3xl text-center">
          <p className="kicker text-neon">Comece agora</p>
          <h2 className="display mt-4 text-5xl leading-[1.05] md:text-6xl">
            Converse. <br />
            <em>Seus slides nascem vivos.</em>
          </h2>
          <p className="mx-auto mt-6 max-w-md text-mut">
            Abra o Slidenator, descreva sua apresentação e veja a equipe de agents trabalhar
            — do roteiro ao HTML interativo, em uma conversa.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <a
              href="https://app.slidenator.com/login"
              className="btn-shine rounded-xl bg-neon px-8 py-4 text-sm font-semibold text-white transition-colors hover:bg-[#4a617c]"
            >
              Abrir o Slidenator
            </a>
            <a
              href="mailto:contato@slidenator.com"
              className="glass rounded-xl px-8 py-4 text-sm font-medium transition-colors hover:bg-white/10"
            >
              Falar com a equipe
            </a>
          </div>
          <p className="kicker mt-8 text-[10px] text-dim">
            Apresentações HTML · 16:9 · interativas · editáveis por conversa
          </p>
        </Reveal>
      </section>

      <footer className="scope-dark border-t border-hair px-6 py-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex items-center gap-2.5">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-neon">
              <span className="font-mono text-[10px] font-bold text-white">S</span>
            </span>
            <span className="font-semibold tracking-tight text-ink">Slidenator</span>
            <span className="ml-2 text-xs text-dim">— apresentações interativas</span>
          </div>

          <div className="flex gap-6 text-xs text-dim">
            <a href="#como-funciona" className="transition-colors hover:text-mut">Como funciona</a>
            <a href="#recursos" className="transition-colors hover:text-mut">Recursos</a>
            <a href="#planos" className="transition-colors hover:text-mut">Planos</a>
            <a href="https://app.slidenator.com" className="transition-colors hover:text-mut">App</a>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-dim">
            © 2026 Slidenator
          </p>
        </div>
      </footer>
    </>
  );
}
