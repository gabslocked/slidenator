import { motion } from "framer-motion";

const LINKS = [
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#recursos", label: "Recursos" },
  { href: "#para-quem", label: "Para quem" },
  { href: "#planos", label: "Planos" },
];

export default function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15 }}
      className="fixed inset-x-0 top-4 z-50 flex justify-center px-4"
    >
      <nav className="glass flex w-full max-w-4xl items-center justify-between rounded-2xl py-2.5 pl-5 pr-2.5">
        <a href="#" className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-neon">
            <span className="font-mono text-xs font-bold text-white">S</span>
          </span>
          <span className="font-semibold tracking-tight text-ink">Slidenator</span>
        </a>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-lg px-3.5 py-2 text-sm text-mut transition-colors hover:bg-ink/5 hover:text-ink"
            >
              {l.label}
            </a>
          ))}
        </div>

        <a
          href="https://app.slidenator.com/login"
          className="rounded-xl bg-ink px-4 py-2.5 text-sm font-medium text-void transition-opacity hover:opacity-85"
        >
          Entrar
        </a>
      </nav>
    </motion.header>
  );
}
