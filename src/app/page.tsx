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
    <div className="min-h-screen bg-white">
      {/* Landing Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-0.5">
            <span className="text-xl font-extrabold text-slate-900 tracking-tight">
              Copa<span className="text-emerald-600">Pro</span>
            </span>
          </Link>
          <nav className="hidden sm:flex items-center gap-8 text-sm font-medium text-slate-500">
            <a href="#problema" className="hover:text-slate-900 transition-colors">
              Problema
            </a>
            <a href="#solucao" className="hover:text-slate-900 transition-colors">
              Solução
            </a>
            <a href="#funcionalidades" className="hover:text-slate-900 transition-colors">
              Funcionalidades
            </a>
            <a href="#planos" className="hover:text-slate-900 transition-colors">
              Planos
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/registar"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
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
