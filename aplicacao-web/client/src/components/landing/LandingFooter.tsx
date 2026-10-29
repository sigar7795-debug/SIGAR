import { toast } from "sonner";

const NAV_LINKS = [
  { href: "#recursos", label: "Recursos" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#para-quem", label: "Para quem" },
];

function PlaceholderLink({ label }: { label: string }) {
  return (
    <button
      type="button"
      onClick={() => toast("Em breve.")}
      className="text-left text-sm text-paper/60 transition-colors hover:text-paper"
    >
      {label}
    </button>
  );
}

export function LandingFooter() {
  return (
    <footer data-nav-theme="dark" className="border-t border-sage/15 bg-graphite py-16 text-paper">
      <div className="container grid gap-12 px-6 sm:grid-cols-[1.3fr_1fr_1fr] sm:px-10 lg:px-16">
        <div>
          <span className="font-display text-xl font-bold tracking-[0.02em]">SIGAR</span>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.16em] text-sage">
            Sistema Integrado de Gestão e Administração Rural
          </p>
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-paper/60">
            Organize propriedades, registre receitas e custos e acompanhe seus resultados financeiros em uma visão clara.
          </p>
        </div>

        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-sage">Navegação</p>
          <nav className="mt-4 flex flex-col gap-2.5">
            {NAV_LINKS.map(link => (
              <a key={link.href} href={link.href} className="text-sm text-paper/60 transition-colors hover:text-paper">
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-sage">Contato e legal</p>
          <div className="mt-4 flex flex-col gap-2.5">
            <PlaceholderLink label="Contato" />
            <PlaceholderLink label="Política de privacidade" />
            <PlaceholderLink label="Termos de uso" />
            <PlaceholderLink label="LGPD" />
          </div>
        </div>
      </div>

      <div className="container mt-12 border-t border-sage/10 px-6 pt-6 sm:px-10 lg:px-16">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-sage/60">
          SIGAR — Sistema Integrado de Gestão e Administração Rural
        </p>
      </div>
    </footer>
  );
}
