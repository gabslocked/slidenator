import { Reveal } from "../components/Reveal";

const PLANS = [
  {
    name: "Individual",
    tagline: "Para quem cria sozinho",
    price: "Em breve",
    cta: "Entrar na lista",
    ctaHref: "https://app.slidenator.com/login",
    featured: false,
    bullets: [
      "1 usuário",
      "Projetos ilimitados",
      "Download HTML pronto para publicar",
      "Compartilhamento por link",
      "Histórico de conversas e versões",
      "Identidade visual extraída automaticamente",
    ],
  },
  {
    name: "Teams",
    tagline: "Para equipes e agências",
    price: "Sob consulta",
    cta: "Falar com a equipe",
    ctaHref: "mailto:contato@slidenator.com",
    featured: true,
    bullets: [
      "Organização compartilhada",
      "Múltiplos usuários, um workspace",
      "Templates da marca da empresa",
      "Histórico e projetos da equipe",
      "API de integração",
      "Suporte prioritário",
    ],
  },
  {
    name: "Enterprise",
    tagline: "Para grandes volumes e contratos",
    price: "Sob consulta",
    cta: "Entrar em contato",
    ctaHref: "mailto:contato@slidenator.com",
    featured: false,
    bullets: [
      "Volume personalizado",
      "Onboarding dedicado",
      "SLA e contrato customizado",
      "Deploy privado (opcional)",
      "Controles de acesso avançados",
      "Treinamento da equipe",
    ],
  },
];

export default function Pricing() {
  return (
    <section id="planos" className="mx-auto max-w-6xl px-6 py-24">
      <Reveal className="text-center">
        <p className="kicker text-neon">Planos</p>
        <h2 className="display mx-auto mt-4 max-w-2xl text-4xl md:text-[3.4rem] md:leading-[1.05]">
          Escale no seu ritmo. <em>Sem surpresas.</em>
        </h2>
        <p className="mx-auto mt-5 max-w-md text-mut">
          Preços em definição. Capacidades reais de cada plano abaixo.
        </p>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-colors ${
                plan.featured
                  ? "border-neon/50 bg-neon/[0.04]"
                  : "border-hair bg-panel"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-px left-1/2 -translate-x-1/2">
                  <div className="rounded-b-lg bg-neon px-3 py-0.5">
                    <span className="font-mono text-[9px] font-medium uppercase tracking-[0.2em] text-white">
                      Mais popular
                    </span>
                  </div>
                </div>
              )}

              <div>
                <p className="kicker text-[10px] text-neon">{plan.name}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight">{plan.tagline}</h3>

                <div className="mt-6 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-semibold tabular-nums text-ink">
                    {plan.price}
                  </span>
                </div>
              </div>

              <ul className="mt-8 flex-1 space-y-3">
                {plan.bullets.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-sm text-mut">
                    <svg
                      viewBox="0 0 16 16"
                      fill="none"
                      className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint"
                      aria-hidden="true"
                    >
                      <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {b}
                  </li>
                ))}
              </ul>

              <a
                href={plan.ctaHref}
                className={`mt-10 block rounded-xl py-3 text-center text-sm font-semibold transition-colors ${
                  plan.featured
                    ? "btn-shine bg-neon text-white hover:bg-[#4a617c]"
                    : "border border-hair bg-deep text-ink hover:border-neon/30 hover:text-neon"
                }`}
              >
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </Reveal>

      <Reveal delay={0.2}>
        <p className="mt-10 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-dim">
          Preços em definição · migração assistida incluída no Teams e Enterprise
        </p>
      </Reveal>
    </section>
  );
}
