import { HeroSection } from "@/components/landing/hero-section";
import { ProblemSection } from "@/components/landing/problem-section";
import { SolutionSection } from "@/components/landing/solution-section";
import { HowItWorksSection } from "@/components/landing/how-it-works-section";
import { ScoringSection } from "@/components/landing/scoring-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { PricingSection } from "@/components/landing/pricing-section";
import { AudienceSection } from "@/components/landing/audience-section";
import { CtaSection } from "@/components/landing/cta-section";
import { Footer } from "@/components/landing/footer";
import { getLandingPageData } from "@/lib/actions";
import Link from "next/link";

// Force dynamic rendering — DB not available at build time
export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const data = await getLandingPageData();

  return (
    <div className="min-h-screen bg-surface">
      {/* Landing Nav */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-sm group-hover:shadow-md transition-shadow">
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2C12 2 5 8 5 12s3 8 7 10" />
                <path d="M12 2c0 0 7 6 7 10s-3 8-7 10" />
                <line x1="2" y1="12" x2="22" y2="12" />
              </svg>
            </div>
            <span className="text-xl font-extrabold tracking-tight text-text">
              Copa<span className="text-primary">Pro</span>
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1">
            {[
              { href: "#problema", label: "Problema" },
              { href: "#solucao", label: "Solução" },
              { href: "#funcionalidades", label: "Funcionalidades" },
              { href: "#planos", label: "Planos" },
            ].map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="px-3.5 py-2 text-sm font-medium text-text-muted hover:text-text hover:bg-surface-hover rounded-xl transition-all duration-200"
              >
                {link.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-text-muted hover:text-text transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/registar"
              className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-primary to-primary-light px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:shadow-md transition-all active:scale-[0.98]"
            >
              Criar Conta
            </Link>
          </div>
        </div>
      </header>

      <main>
        <HeroSection
          leagueName={data.leagueName}
          seasonName={data.seasonName}
          rankings={data.rankings}
          recentMatches={data.recentMatches}
        />
        <div id="problema">
          <ProblemSection />
        </div>
        <div id="solucao">
          <SolutionSection />
        </div>
        <div id="como-funciona">
          <HowItWorksSection />
        </div>
        <div id="pontuacao">
          <ScoringSection />
        </div>
        <div id="funcionalidades">
          <FeaturesSection />
        </div>
        <div id="planos">
          <PricingSection />
        </div>
        <AudienceSection />
        <CtaSection />
      </main>

      <Footer />
    </div>
  );
}
