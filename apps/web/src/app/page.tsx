'use client';

import Link from 'next/link';
import { Scale, Search, ShieldCheck, ArrowRight, CheckCircle, Zap, FileText, Users, FolderOpen, BookOpen } from 'lucide-react';
import { ScrollReveal, FadeIn, InteractiveCard, Parallax, StaggerContainer, StaggerItem } from '@/components/ui/motion';
import { Carousel } from '@/components/ui/carousel';

const RECURSOS = [
  {
    icon: Search,
    title: 'Busca semântica',
    description: 'Encontre jurisprudências pelo significado, não apenas por palavras-chave.',
  },
  {
    icon: FileText,
    title: 'Base própria',
    description: 'Suba PDFs e DOCX. O sistema indexa e torna cada documento consultável.',
  },
  {
    icon: ShieldCheck,
    title: 'Respostas fundamentadas',
    description: 'Cada resposta cita a fonte, o trecho relevante e o nível de confiança.',
  },
  {
    icon: Users,
    title: 'Gestão de clientes',
    description: 'Cadastro completo com busca automática de CEP e CNPJ integrada.',
  },
  {
    icon: FolderOpen,
    title: 'Copiloto por caso',
    description: 'Cada processo tem seu próprio assistente com RAG scoped nos autos.',
  },
  {
    icon: BookOpen,
    title: 'Gerador de peças',
    description: 'Redija contestações, recursos e apelações com suporte de IA.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#080808] text-white">
      {/* Header */}
      <FadeIn>
        <header className="border-b border-white/[0.06]">
          <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-600/20 border border-brand-500/30 rounded-lg flex items-center justify-center">
                <Scale className="w-4 h-4 text-brand-400" />
              </div>
              <span className="font-semibold text-lg tracking-tight text-slate-100">LegalAI</span>
            </div>
            <Link
              href="/login"
              className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-medium transition-colors"
            >
              Entrar
            </Link>
          </div>
        </header>
      </FadeIn>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-28 pb-24 text-center">
        <FadeIn delay={0.1}>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-600/10 border border-brand-500/20 rounded-full text-brand-400 text-xs font-medium mb-8">
            <Zap className="w-3 h-3" />
            Busca Semântica &middot; IA Jurídica &middot; RAG
          </div>
        </FadeIn>

        <FadeIn delay={0.2}>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-5 leading-[1.15] text-slate-100">
            Pesquisa jurídica com<br />
            <span className="text-brand-400">inteligência artificial</span>
          </h1>
        </FadeIn>

        <FadeIn delay={0.3}>
          <p className="text-base text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed">
            Encontre jurisprudências, analise documentos e fundamente suas teses
            com um assistente que conhece sua base e sempre cita as fontes.
          </p>
        </FadeIn>

        <FadeIn delay={0.4}>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium transition-colors"
          >
            Acessar o sistema
            <ArrowRight className="w-4 h-4" />
          </Link>
        </FadeIn>
      </section>

      {/* Recursos — grid no desktop, carrossel no mobile */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        {/* Desktop grid */}
        <StaggerContainer className="hidden md:grid md:grid-cols-3 gap-4">
          {RECURSOS.map(({ icon: Icon, title, description }) => (
            <StaggerItem key={title}>
              <InteractiveCard className="bg-[#111111] border border-white/[0.06] rounded-xl p-5 hover:border-white/[0.12] transition-colors h-full">
                <div className="w-9 h-9 bg-brand-600/10 border border-brand-500/15 rounded-lg flex items-center justify-center mb-3">
                  <Icon className="w-4 h-4 text-brand-400" />
                </div>
                <h3 className="font-semibold text-slate-100 text-sm mb-1">{title}</h3>
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
                <div key={title} className="bg-[#111111] border border-white/[0.06] rounded-xl p-6 mx-1">
                  <div className="w-9 h-9 bg-brand-600/10 border border-brand-500/15 rounded-lg flex items-center justify-center mb-3">
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

      {/* Como funciona */}
      <section id="como-funciona" className="border-t border-white/[0.06] bg-[#0a0a0a]">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <ScrollReveal>
            <h2 className="text-xl font-bold text-slate-100 text-center mb-2">Como funciona</h2>
            <p className="text-slate-500 text-sm text-center max-w-md mx-auto mb-12">
              Tecnologia RAG aplicada ao direito. Suas perguntas, respondidas com base no seu acervo.
            </p>
          </ScrollReveal>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { step: '1', icon: FileText, title: 'Upload', description: 'Suba jurisprudências em PDF ou DOCX.' },
              { step: '2', icon: Zap, title: 'Indexação', description: 'Texto extraído, fragmentado e vetorizado.' },
              { step: '3', icon: Search, title: 'Busca', description: 'Pergunta comparada vetorialmente ao acervo.' },
              { step: '4', icon: ShieldCheck, title: 'Resposta', description: 'IA gera resposta com citação das fontes.' },
            ].map(({ step, icon: Icon, title, description }) => (
              <ScrollReveal key={step} delay={Number(step) * 0.1}>
                <div className="text-center">
                  <Parallax offset={20}>
                    <div className="w-10 h-10 bg-[#141414] border border-white/[0.08] rounded-xl flex items-center justify-center mx-auto mb-3">
                      <Icon className="w-4 h-4 text-brand-400" />
                    </div>
                  </Parallax>
                  <p className="text-[10px] text-brand-400/60 font-medium uppercase tracking-widest mb-1">Passo {step}</p>
                  <h3 className="font-semibold text-slate-200 text-sm mb-1">{title}</h3>
                  <p className="text-slate-600 text-xs leading-relaxed">{description}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <ScrollReveal>
        <section className="max-w-5xl mx-auto px-6 py-20">
          <div className="bg-[#111111] border border-white/[0.06] rounded-2xl p-8 md:p-10">
            <div className="grid md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-xl font-bold text-slate-100 mb-3">
                  Feito para o direito brasileiro
                </h2>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                  Prompts calibrados para linguagem jurídica. A IA nunca inventa
                  jurisprudência e informa quando não encontra base suficiente.
                </p>
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-sm font-medium transition-colors"
                >
                  Começar agora
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
              <StaggerContainer className="space-y-3" staggerDelay={0.08}>
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
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="text-slate-400 text-sm">{item}</span>
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </div>
          </div>
        </section>
      </ScrollReveal>

      {/* Footer */}
      <FadeIn>
        <footer className="border-t border-white/[0.06] py-6">
          <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-600 text-xs">
              <Scale className="w-3.5 h-3.5" />
              <span>LegalAI</span>
            </div>
            <p className="text-slate-700 text-xs">
              As respostas não substituem análise jurídica formal de advogado habilitado.
            </p>
          </div>
        </footer>
      </FadeIn>
    </div>
  );
}
