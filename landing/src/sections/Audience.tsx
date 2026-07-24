/**
 * Audience — "para quem". Casos de uso reais, sem logotipo ou depoimento
 * inventado. Cada card traz um motivo procedural sóbrio.
 */
import { Reveal } from "../components/Reveal";

type Motif = "pitch" | "brand" | "class" | "report";

const GROUPS: { motif: Motif; tag: string; title: string; desc: string }[] = [
  {
    motif: "pitch",
    tag: "Times de produto e vendas",
    title: "Pitches e releases sem travar no PowerPoint",
    desc: "Descreva o pitch no chat e receba uma apresentação interativa pronta para a call — atualizável em segundos quando o número muda na véspera.",
  },
  {
    motif: "brand",
    tag: "Agências e consultorias",
    title: "Propostas com a marca de cada cliente",
    desc: "Solte o logo do cliente e a identidade é extraída na hora. Uma proposta por conversa, cada uma com a cara certa — sem refazer o template do zero.",
  },
  {
    motif: "class",
    tag: "Professores e criadores",
    title: "Aulas que prendem, não slides que entediam",
    desc: "Transforme o roteiro da aula em slides com gráficos animados e demos clicáveis. Ajuste o ritmo conversando, sem abrir editor nenhum.",
  },
  {
    motif: "report",
    tag: "Founders e relações com investidores",
    title: "Resultados e updates prontos para investidores",
    desc: "Do relatório do trimestre à apresentação para investidores em uma conversa. Peça mudanças em linguagem natural e publique por link direto.",
  },
];

function Motif({ kind }: { kind: Motif }) {
  const stroke = "#3a4d68";
  switch (kind) {
    case "pitch":
      return (
        <svg viewBox="0 0 44 44" fill="none" className="h-10 w-10">
          <rect x="4" y="8" width="36" height="22" rx="2" stroke={stroke} strokeWidth="1.6" />
          <path d="M14 34h16M22 30v4" stroke={stroke} strokeWidth="1.6" strokeLinecap="round" />
          <path d="M11 22l5-5 4 4 8-9" stroke="#a8b8d4" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "brand":
      return (
        <svg viewBox="0 0 44 44" fill="none" className="h-10 w-10">
          <rect x="6" y="6" width="14" height="14" rx="3" fill={stroke} />
          <rect x="24" y="6" width="14" height="14" rx="3" stroke="#a8b8d4" strokeWidth="1.6" />
          <rect x="6" y="24" width="14" height="14" rx="3" stroke="#a8b8d4" strokeWidth="1.6" />
          <rect x="24" y="24" width="14" height="14" rx="3" fill="#a8b8d4" opacity="0.5" />
        </svg>
      );
    case "class":
      return (
        <svg viewBox="0 0 44 44" fill="none" className="h-10 w-10">
          <path d="M4 16 22 8l18 8-18 8L4 16Z" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M12 20v8c0 2 4.5 4 10 4s10-2 10-4v-8" stroke="#a8b8d4" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case "report":
      return (
        <svg viewBox="0 0 44 44" fill="none" className="h-10 w-10">
          <path d="M6 36V22M17 36V12M28 36V26M39 36V16" stroke="#a8b8d4" strokeWidth="1.6" strokeLinecap="round" />
          <path d="M6 30l11-14 11 8 11-12" stroke={stroke} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

export default function Audience() {
  return (
    <section id="para-quem" className="mx-auto max-w-6xl px-6 py-28">
      <Reveal className="text-center">
        <p className="kicker text-neon">Para quem</p>
        <h2 className="display mx-auto mt-4 max-w-2xl text-4xl md:text-[3.4rem] md:leading-[1.05]">
          Feito para quem <em>apresenta de verdade.</em>
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-mut">
          Uma conversa, muitos contextos. O mesmo pipeline serve do pitch de vendas à aula da
          semana que vem.
        </p>
      </Reveal>

      <Reveal delay={0.12}>
        <div className="mt-14 grid gap-4 md:grid-cols-2">
          {GROUPS.map((g) => (
            <div
              key={g.tag}
              className="group relative flex gap-5 overflow-hidden rounded-2xl border border-hair bg-panel p-7 transition-colors hover:border-neon/25"
            >
              <div className="flex-none rounded-xl border border-hair bg-deep p-3">
                <Motif kind={g.motif} />
              </div>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neon">{g.tag}</p>
                <h3 className="mt-2 text-lg font-semibold tracking-tight text-ink">{g.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-mut">{g.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
