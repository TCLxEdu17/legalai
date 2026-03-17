'use client';

import Link from 'next/link';
import {
  Scale, Search, ShieldCheck, ArrowRight, CheckCircle,
  Zap, FileText, Users, FolderOpen, BookOpen,
  Shield, Brain, Gavel,
} from 'lucide-react';
import { GradientButton } from '@/components/ui/gradient-button';
import { motion } from 'framer-motion';

const RECURSOS = [
  {
    icon: Search,
    title: 'Busca semântica',
    description: 'Vá além das palavras-chave. Encontre jurisprudências pelo sentido jurídico real.',
    color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100',
  },
  {
    icon: Brain,
    title: 'IA especializada',
    description: 'Prompts calibrados para linguagem jurídica brasileira. Nunca inventa jurisprudência.',
    color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100',
  },
  {
    icon: ShieldCheck,
    title: 'Processos Privados',
    description: 'Consulte processos restritos via credenciais OAB diretamente no e-SAJ TJSP.',
    color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100',
  },
  {
    icon: Users,
    title: 'Gestão de clientes',
    description: 'Controle total com integração de dados via CNPJ e CEP para máxima agilidade.',
    color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100',
  },
  {
    icon: FolderOpen,
    title: 'Copiloto por caso',
    description: 'Um assistente dedicado para cada processo, com memória completa dos autos.',
    color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100',
  },
  {
    icon: BookOpen,
    title: 'Gerador de peças',
    description: 'Redija contestações, recursos e apelações com suporte de IA e jurisprudência indexada.',
    color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100',
  },
];

const STATS = [
  { value: '99.9%', label: 'Uptime garantido' },
  { value: '< 3s', label: 'Tempo de resposta' },
  { value: 'TLS 1.3', label: 'Criptografia' },
  { value: 'LGPD', label: 'Conformidade' },
];

const CHECKLIST = [
  'Respostas baseadas exclusivamente em fontes indexadas',
  'Citação automática de tribunal, processo e relator',
  'Nível de confiança por resposta gerada',
  'Aviso jurídico automático em cada consulta',
  'Histórico de conversas por sessão',
  'Controle de acesso por perfil de usuário',
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-x-hidden">

      {/* ── NAVBAR ─────────────────────────────────── */}
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100"
      >
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-slate-900">LegalAI</span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-500 font-medium">
            <a href="#recursos" className="hover:text-slate-900 transition-colors">Recursos</a>
            <a href="#como-funciona" className="hover:text-slate-900 transition-colors">Como funciona</a>
            <Link href="/dashboard/planos" className="hover:text-slate-900 transition-colors">Planos</Link>
          </nav>

          <Link href="/login">
            <GradientButton className="h-9 min-w-0 px-5 py-0 text-sm rounded-lg">
              Acessar o sistema
            </GradientButton>
          </Link>
        </div>
      </motion.header>

      {/* ── HERO ─────────────────────────────────────── */}
      <section className="relative max-w-6xl mx-auto px-6 pt-24 pb-28 text-center">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] pointer-events-none">
          <div className="absolute inset-0 bg-gradient-to-b from-blue-50 via-violet-50/40 to-transparent rounded-full blur-3xl opacity-60" />
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="relative">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold mb-8 tracking-wide">
            <Zap className="w-3 h-3" />
            IA Jurídica · Busca Semântica · RAG
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="relative text-5xl md:text-6xl font-bold tracking-tight leading-[1.08] text-slate-900 mb-6"
        >
          Pesquisa jurídica com<br />
          <span className="bg-gradient-to-r from-blue-600 via-violet-600 to-blue-700 bg-clip-text text-transparent">
            inteligência artificial
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="relative text-lg text-slate-500 max-w-xl mx-auto mb-10 leading-relaxed"
        >
          Encontre jurisprudências, analise documentos e fundamente suas teses
          com um assistente especializado que sempre cita as fontes.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="relative flex flex-col sm:flex-row gap-3 justify-center items-center"
        >
          <Link href="/trial">
            <GradientButton className="h-12 px-8 text-sm rounded-xl gap-2">
              Começar agora
              <ArrowRight className="w-4 h-4" />
            </GradientButton>
          </Link>
          <Link href="/login">
            <GradientButton variant="variant" className="h-12 px-8 text-sm rounded-xl">
              Acessar o sistema
            </GradientButton>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="relative mt-16 flex flex-wrap justify-center gap-x-12 gap-y-4"
        >
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-400 font-medium mt-0.5">{label}</p>
            </div>
          ))}
        </motion.div>
      </section>

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* ── RECURSOS ─────────────────────────────────── */}
      <section id="recursos" className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true, margin: '-80px' }} variants={fadeUp}
          className="text-center mb-14"
        >
          <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Plataforma completa</p>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Tudo que seu escritório precisa</h2>
          <p className="text-slate-500 text-base max-w-md mx-auto">
            Tecnologia RAG aplicada ao direito. Resultados precisos, fundamentados e verificáveis.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {RECURSOS.map(({ icon: Icon, title, description, color, bg, border }, i) => (
            <motion.div
              key={title} custom={i} initial="hidden" whileInView="show"
              viewport={{ once: true, margin: '-60px' }} variants={fadeUp}
              className={`rounded-2xl p-6 border ${border} ${bg} group hover:shadow-md transition-shadow`}
            >
              <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                <Icon className={`w-5 h-5 ${color}`} />
              </div>
              <h3 className="font-semibold text-slate-900 mb-1.5">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* ── COMO FUNCIONA ────────────────────────────── */}
      <section id="como-funciona" className="max-w-6xl mx-auto px-6 py-24">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          className="text-center mb-16"
        >
          <p className="text-blue-600 text-xs font-bold uppercase tracking-widest mb-3">Pipeline RAG</p>
          <h2 className="text-3xl font-bold text-slate-900 mb-3">Processo inteligente</h2>
          <p className="text-slate-500 text-base max-w-md mx-auto">
            Como a infraestrutura RAG garante precisão absoluta em cada resposta gerada.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { num: '1', icon: FileText, title: 'Upload', desc: 'Suba documentos PDF ou DOCX para sua base de conhecimento.' },
            { num: '2', icon: Zap, title: 'Indexação', desc: 'Extraímos o contexto jurídico e vetorizamos cada parágrafo.' },
            { num: '3', icon: Search, title: 'Busca', desc: 'A IA cruza sua pergunta com os fragmentos mais relevantes.' },
            { num: '4', icon: ShieldCheck, title: 'Resposta', desc: 'Entrega fundamentada com citação das fontes oficiais.' },
          ].map(({ num, icon: Icon, title, desc }, i) => (
            <motion.div
              key={num} custom={i} initial="hidden" whileInView="show"
              viewport={{ once: true }} variants={fadeUp}
              className="text-center group"
            >
              <div className="relative inline-flex mb-5">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto group-hover:border-blue-200 group-hover:bg-blue-50 transition-colors">
                  <Icon className="w-5 h-5 text-slate-500 group-hover:text-blue-600 transition-colors" />
                </div>
                <span className="absolute -top-2 -right-2 text-[10px] font-black text-white bg-blue-600 rounded-full w-5 h-5 flex items-center justify-center">
                  {num}
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 text-sm mb-1">{title}</h3>
              <p className="text-slate-400 text-xs leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
      </div>

      {/* ── CTA FINAL ────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <motion.div
          initial="hidden" whileInView="show" viewport={{ once: true }} variants={fadeUp}
          className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-10 md:p-14 relative overflow-hidden"
        >
          <div className="absolute -top-24 left-1/4 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 right-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid md:grid-cols-2 gap-12 items-center">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Gavel className="w-5 h-5 text-blue-400" />
                <span className="text-blue-400 text-sm font-semibold">Direito brasileiro</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4 leading-tight">
                A nova era do direito<br />já começou.
              </h2>
              <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                Feito para o direito brasileiro. A IA nunca inventa jurisprudência
                e informa quando não encontra base suficiente.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/trial">
                  <GradientButton className="h-11 px-7 text-sm rounded-xl gap-2">
                    Começar agora
                    <ArrowRight className="w-4 h-4" />
                  </GradientButton>
                </Link>
                <Link href="/login">
                  <GradientButton variant="variant" className="h-11 px-7 text-sm rounded-xl">
                    Já tenho conta
                  </GradientButton>
                </Link>
              </div>
            </div>

            <div className="space-y-3">
              {CHECKLIST.map((item, i) => (
                <motion.div
                  key={item} custom={i} initial="hidden" whileInView="show"
                  viewport={{ once: true }} variants={fadeUp}
                  className="flex items-center gap-3"
                >
                  <div className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/25 flex items-center justify-center shrink-0">
                    <CheckCircle className="w-3 h-3 text-emerald-400" />
                  </div>
                  <span className="text-slate-300 text-sm">{item}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── FOOTER ───────────────────────────────────── */}
      <footer className="border-t border-slate-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center">
              <Scale className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-slate-800 text-sm font-bold leading-tight">LegalAI</p>
              <p className="text-slate-400 text-[10px]">A inteligência que fundamenta suas vitórias.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Shield className="w-3.5 h-3.5" />
            <span>As respostas não substituem análise jurídica formal de advogado habilitado.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
