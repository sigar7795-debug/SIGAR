import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useViewTransitionNavigate } from "@/hooks/useViewTransitionNavigate";
import { Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";

const NAV_ITEMS = [
  { href: "#recursos", label: "Recursos" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#para-quem", label: "Para quem" },
];

export function LandingHeader() {
  // Full navbar (links + CTA) shows only while the hero is in view; past it, only
  // the "SIGAR" wordmark stays, colored to whatever section is currently behind it.
  const [inHero, setInHero] = useState(true);
  const [sectionTheme, setSectionTheme] = useState<"light" | "dark">("dark");
  const [mobileOpen, setMobileOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { isAuthenticated, loading } = useAuth();
  const navigate = useViewTransitionNavigate();

  useEffect(() => {
    const heroEl = document.getElementById("top");
    if (!heroEl) return;

    const onScroll = () => {
      const headerHeight = headerRef.current?.offsetHeight ?? 68;
      const heroBottom = heroEl.getBoundingClientRect().bottom;
      setInHero(heroBottom > headerHeight);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  useEffect(() => {
    if (!inHero) setMobileOpen(false);
  }, [inHero]);

  // Tracks which section is behind the header's exact y-position, via a
  // razor-thin (1px) intersection band at that height — every section below
  // the hero carries a `data-nav-theme="light"|"dark"` marker (see WhySigarSection,
  // ScrollRevealTransition, EditorialBand, FinancialPreview, HowItWorks,
  // AudiencesSection, VideoBreakSection, FinalCtaSection, LandingFooter).
  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>("[data-nav-theme]");
    if (!sections.length) return;

    const headerHeight = headerRef.current?.offsetHeight ?? 68;
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const theme = entry.target.getAttribute("data-nav-theme");
          if (theme === "light" || theme === "dark") setSectionTheme(theme);
        }
      },
      {
        rootMargin: `-${headerHeight}px 0px -${Math.max(window.innerHeight - headerHeight - 1, 0)}px 0px`,
        threshold: 0,
      },
    );

    sections.forEach(section => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  const sigarColor = inHero ? "text-paper" : sectionTheme === "light" ? "text-graphite" : "text-paper";

  return (
    <header ref={headerRef} className="fixed inset-x-0 top-0 z-50 w-full bg-transparent">
      <div className="container grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4 px-6 sm:h-[68px] sm:px-10 lg:px-16">
        {/* Left: nav + mobile menu toggle — only over the hero */}
        <div
          className={`flex items-center justify-self-start gap-8 transition-opacity duration-500 ${
            inHero ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!inHero}
        >
          <nav className="hidden items-center gap-8 lg:flex">
            {NAV_ITEMS.map(item => (
              <a
                key={item.href}
                href={item.href}
                tabIndex={inHero ? 0 : -1}
                className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-paper transition-opacity hover:opacity-70"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <button
            type="button"
            onClick={() => setMobileOpen(open => !open)}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            aria-expanded={mobileOpen}
            tabIndex={inHero ? 0 : -1}
            className="p-2 text-paper lg:hidden"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {/* Center: "SIGAR" — always visible, fixed, no backdrop; color adapts to the section behind it */}
        <a
          href="#top"
          className={`justify-self-center font-display text-lg font-bold tracking-[0.02em] transition-colors duration-500 sm:text-xl ${sigarColor}`}
        >
          SIGAR
        </a>

        {/* Right: CTA — only over the hero */}
        <div
          className={`justify-self-end transition-opacity duration-500 ${
            inHero ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          aria-hidden={!inHero}
        >
          {loading ? (
            <div className="h-9 w-36 animate-pulse rounded-none bg-sage/15" />
          ) : isAuthenticated ? (
            <Button
              asChild
              size="sm"
              tabIndex={inHero ? 0 : -1}
              className="group relative h-9 min-w-36 overflow-hidden rounded-none border border-paper bg-transparent px-5 text-xs font-semibold text-paper"
            >
              <Link href="/dashboard">
                <span className="absolute inset-0 origin-bottom scale-y-0 bg-sage transition-transform duration-300 ease-out group-hover:scale-y-100" />
                <span className="relative z-10 transition-colors duration-300 group-hover:text-graphite">
                  Acessar painel
                </span>
              </Link>
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={() => navigate("/login")}
              tabIndex={inHero ? 0 : -1}
              className="group relative h-9 min-w-36 overflow-hidden rounded-none border border-paper bg-transparent px-5 text-xs font-semibold text-paper"
            >
              <span className="absolute inset-0 origin-bottom scale-y-0 bg-sage transition-transform duration-300 ease-out group-hover:scale-y-100" />
              <span className="relative z-10 transition-colors duration-300 group-hover:text-graphite">
                Entrar na plataforma
              </span>
            </Button>
          )}
        </div>
      </div>

      {mobileOpen && inHero && (
        <nav className="bg-transparent lg:hidden">
          <div className="container flex flex-col gap-1 px-6 pb-4 sm:px-10 lg:px-16">
            {NAV_ITEMS.map(item => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="px-3 py-3 font-mono text-xs font-medium uppercase tracking-[0.14em] text-paper"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>
      )}
    </header>
  );
}
