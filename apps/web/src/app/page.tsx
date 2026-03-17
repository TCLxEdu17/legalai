'use client';

import Link from 'next/link';
import { Scale, Search, ShieldCheck, ArrowRight, CheckCircle, Zap, FileText, Users, FolderOpen, BookOpen } from 'lucide-react';
import { ScrollReveal, FadeIn, InteractiveCard, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { Carousel } from '@/components/ui/carousel';
import { SplashCursor } from '@/components/ui/splash-cursor';

const RECURSOS = [
  {
    icon: Search,
    title: 'Busca semântica',
    description: 'Vá além das palavras-chave. Encontre jurisprudências pelo sentido jurídico real de cada termo.',
  },
  {
    icon: FileText,
    title: 'Base própria',
    description: 'Seu acervo transformado em inteligência. Indexação automática de PDFs e DOCX em segundos.',
  },
  {
    icon: ShieldCheck,
    title: 'Fundamentação sólida',
    description: 'Respostas com citações precisas, trechos destacados e indicação clara da fonte oficial.',
  },
  {
    icon: Users,
    title: 'Gestão de clientes',
    description: 'Controle total com integração de dados via CNPJ e CEP para máxima agilidade.',
  },
  {
    icon: FolderOpen,
    title: 'Copiloto por caso',
    description: 'Um assistente dedicado para cada processo, com memória completa dos autos e documentos.',
  },
  {
    icon: BookOpen,
    title: 'Gerador de peças',
    description: 'Redija contestações, recursos e apelações com suporte de IA e jurisprudência indexada.',
  },
];

const STEPS = [
  { num: '01', icon: FileText, title: 'Upload', description: 'Suba documentos PDF ou DOCX para sua base de conhecimento.' },
  { num: '02', icon: Zap, title: 'Indexação', description: 'Extraímos o contexto jurídico e vetorizamos cada parágrafo.' },
  { num: '03', icon: Search, title: 'Busca', description: 'A IA cruza sua pergunta com os fragmentos mais relevantes.' },
  { num: '04', icon: ShieldCheck, title: 'Resposta', description: 'Entrega fundamentada com citação das fontes oficiais.' },
];

export default function LandingPage() {
  return (
    <div
      className="min-h-screen text-white overflow-x-hidden"
      style={{ background: 'linear-gradient(160deg, #020818 0%, #050d1f 40%, #000000 100%)' }}
    >
      {/* Fluid simulation background */}
      <SplashCursor
        SIM_RESOLUTION={128}
        DYE_RESOLUTION={1440}
        DENSITY_DISSIPATION={3.5}
        VELOCITY_DISSIPATION={2}
        PRESSURE={0.1}
        CURL={3}
        SPLAT_RADIUS={0.2}
        SPLAT_FORCE={6000}
        COLOR_UPDATE_SPEED={10}
      />

      {/* ── Header ────────────────────────────────────────────────── */}
      <FadeIn>
        <header
          className="relative z-20 border-b"
          style={{ borderColor: 'rgba(255,255,255,0.06)', background: 'rgba(2,8,24,0.7)', backdropFilter: 'blur(12px)' }}
        >
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, rgba(37,53,234,0.25) 0%, rgba(124,58,237,0.2) 100%)',
                  border: '1px solid rgba(98,128,253,0.35)',
                  boxShadow: '0 0 12px rgba(37,53,234,0.25)',
                }}
              >
                <Scale className="w-4 h-4 text-brand-400" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-slate-100">LegalAI</span>
            </div>
            <Link
              href="/login"
              className="px-4 py-2 text-white rounded-xl text-sm font-medium transition-all hover:-translate-y-px"
              style={{
                background: 'linear-gradient(135deg, #2535ea 0%, #7c3aed 100%)',
                boxShadow: '0 4px 15px -2px rgba(37,53,234,0.45)',
              }}
            >
              Entrar
            </Link>
          </div>
        </header>
      </FadeIn>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pt-32 pb-28 text-center">
        <FadeIn delay={0.1}>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-8"
            style={{
              background: 'rgba(37,53,234,0.12)',
              border: '1px solid rgba(98,128,253,0.25)',
              boxShadow: '0 0 20px rgba(37,53,234,0.12)',
            }}
          >
            <Zap className="w-3 h-3 text-brand-400" />
            <span className="text-brand-300">Busca Semântica</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">IA Jurídica</span>
            <span className="text-slate-600">·</span>
            <span className="text-slate-400">RAG</span>
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1] text-slate-100">
            Pesquisa jurídica com<br />
            <span className="text-white">
              inteligência artificial
            </span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="text-base text-slate-400 max-w-xl mx-auto mb-12 leading-relaxed">
            Encontre jurisprudências, analise documentos e fundamente suas teses
            com um assistente especializado que sempre cita as fontes.
          </p>
        </FadeIn>

        <FadeIn delay={0.4}>
          <Link
            href="/login"
            className="inline-flex items-center gap-2.5 px-7 py-3.5 text-white rounded-xl font-medium transition-all hover:-translate-y-0.5"
            style={{
              background: 'linear-gradient(135deg, #2535ea 0%, #7c3aed 100%)',
              boxShadow: '0 4px 20px -2px rgba(37,53,234,0.55)',
            }}
          >
            Acessar o sistema
            <ArrowRight className="w-4 h-4" />
          </Link>
        </FadeIn>
      </section>

      {/* Mesh divider */}
      <div
        className="relative z-10 max-w-5xl mx-auto"
        style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(98,128,253,0.2), transparent)' }}
      />

      {/* ── Recursos ─────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-24">
        <ScrollReveal>
          <div className="text-center mb-14">
            <h2 className="text-2xl font-bold text-slate-100 mb-3">Transformando o direito brasileiro</h2>
            <p className="text-slate-500 text-sm max-w-md mx-auto">
              Tecnologia RAG aplicada ao direito. Resultados precisos, fundamentados e verificáveis.
            </p>
          </div>
        </ScrollReveal>

        {/* Desktop grid */}
        <StaggerContainer className="hidden md:grid md:grid-cols-3 gap-4">
          {RECURSOS.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title}>
              <InteractiveCard className="rounded-xl p-5 h-full cursor-default glass-feature-card">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg, rgba(37,53,234,0.2) 0%, rgba(124,58,237,0.15) 100%)',
                    border: '1px solid rgba(98,128,253,0.2)',
                  }}
                >
                  <Icon className="w-4 h-4 text-brand-400" />
                </div>
                <h3 className="font-semibold text-slate-100 text-sm mb-1.5">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
              </InteractiveCard>
            </StaggerItem>
          ))}
        </StaggerContainer>

        {/* Mobile carousel */}
        <div className="md:hidden">
          <FadeIn>
            <Carousel
              items={RECURSOS.map(({ icon: Icon, title, description }) => (
                <div
                  key={title}
                  className="rounded-xl p-6 mx-1"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{
                      background: 'rgba(37,53,234,0.2)',
                      border: '1px solid rgba(98,128,253,0.2)',
                    }}
                  >
                    <Icon className="w-4 h-4 text-brand-400" />
                  </div>
                  <h3 className="font-semibold text-slate-100 text-sm mb-1">{title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
                </div>
              ))}
            />
          </FadeIn>
        </div>
      </section>

      {/* Mesh divider */}
      <div
        className="relative z-10 max-w-5xl mx-auto"
        style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(98,128,253,0.15), transparent)' }}
      />

      {/* ── Como funciona ─────────────────────────────────────────── */}
      <section id="como-funciona" className="relative z-10">
        <div className="max-w-5xl mx-auto px-6 py-24">
          <ScrollReveal>
            <div className="text-center mb-16">
              <h2 className="text-2xl font-bold text-slate-100 mb-3">Processo Inteligente</h2>
              <p className="text-slate-500 text-sm max-w-md mx-auto">
                Como a infraestrutura RAG garante precisão absoluta em cada resposta gerada.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STEPS.map(({ num, icon: Icon, title, description }, i) => (
              <ScrollReveal key={num} delay={i * 0.1}>
                <div className="text-center group">
                  <div className="relative inline-flex mb-4">
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: '1px solid rgba(255,255,255,0.08)',
                      }}
                    >
                      <Icon className="w-5 h-5 text-brand-400" />
                    </div>
                    <span
                      className="absolute -top-3 -right-2 text-[10px] font-bold tabular-nums"
                      style={{
                        background: 'linear-gradient(135deg, #6280fd, #a78bfa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {num}
                    </span>
                  </div>
                  <h3 className="font-semibold text-slate-200 text-sm mb-1">{title}</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">{description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────── */}
      <ScrollReveal>
        <section className="relative z-10 max-w-5xl mx-auto px-6 py-20">
          <div
            className="rounded-2xl p-8 md:p-10 relative overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(98,128,253,0.2)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
            }}
          >
            {/* Inner glow */}
            <div
              className="absolute -top-20 left-1/4 w-72 h-72 pointer-events-none"
              style={{
                background: 'radial-gradient(ellipse, rgba(37,53,234,0.12) 0%, transparent 70%)',
                filter: 'blur(30px)',
              }}
            />

            <div className="relative grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-100 mb-3">
                  A nova era do direito já começou.
                </h2>
                <p className="text-slate-400 text-sm mb-6 leading-relaxed">
                  Feito para o direito brasileiro. Prompts calibrados para linguagem jurídica —
                  a IA nunca inventa jurisprudência e informa quando não encontra base suficiente.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-white rounded-xl text-sm font-medium transition-all hover:-translate-y-px"
                  style={{
                    background: 'linear-gradient(135deg, #2535ea 0%, #7c3aed 100%)',
                    boxShadow: '0 4px 15px -2px rgba(37,53,234,0.5)',
                  }}
                >
                  Começar agora
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              <StaggerContainer className="space-y-3" staggerDelay={0.07}>
                {[
                  'Respostas baseadas exclusivamente em fontes indexadas',
                  'Citação automática de tribunal, processo e relator',
                  'Nível de confiança por resposta',
                  'Aviso jurídico automático em cada consulta',
                  'Histórico de conversas por sessão',
                  'Controle de acesso por perfil',
                ].map((item) => (
                  <StaggerItem key={item}>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.25)' }}
                      >
                        <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                      </div>
                      <span className="text-slate-400 text-sm">{item}</span>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* ── Footer ───────────────────────────────────────────────── */}
      <FadeIn>
        <footer
          className="relative z-10 border-t py-8"
          style={{ borderColor: 'rgba(255,255,255,0.06)' }}
        >
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{
                  background: 'rgba(37,53,234,0.15)',
                  border: '1px solid rgba(98,128,253,0.2)',
                }}
              >
                <Scale className="w-3.5 h-3.5 text-brand-400" />
              </div>
              <div>
                <p className="text-slate-300 text-sm font-semibold leading-tight">LegalAI</p>
                <p
                  className="text-[10px]"
                  style={{
                    background: 'linear-gradient(135deg, #6280fd, #a78bfa)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                  }}
                >
                  A inteligência que fundamenta suas vitórias.
                </p>
              </div>
            </div>
            <p className="text-slate-700 text-xs text-center md:text-right max-w-sm">
              As respostas não substituem análise jurídica formal de advogado habilitado.
            </p>
          </div>
        </footer>
      </FadeIn>
    </div>
  );
}
