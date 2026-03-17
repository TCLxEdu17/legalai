'use client';

import Link from 'next/link';
import {
  MessageSquare, FileText, Scale, Brain, Mic, Handshake,
  Bot, ScanSearch, TrendingUp, ClipboardCheck, FileEdit,
  Gavel, Search, GitCompare, Calculator, CalendarDays,
  BookOpen, StickyNote, FileSignature, DollarSign,
  CheckSquare, Scroll, Calendar, Users, FileBarChart,
  Heart, CreditCard, Zap, ShieldAlert, Lightbulb,
  FolderOpen, ChevronRight,
} from 'lucide-react';
import { BentoGrid, type BentoItem } from '@/components/ui/bento-grid';

interface Feature {
  icon: React.ElementType;
  title: string;
  tagline: string;
  description: string;
  example?: string;
  href: string;
  tab?: string;
  color: string;
  glow: string;
  status: 'live' | 'beta' | 'soon';
}

interface Category {
  label: string;
  description: string;
  features: Feature[];
}

const CATEGORIES: Category[] = [
  {
    label: 'IA dentro dos seus Casos',
    description: 'Ferramentas de inteligência artificial que analisam os documentos de cada processo e trabalham por você.',
    features: [
      {
        icon: MessageSquare,
        title: 'Chat com os Autos',
        tagline: 'Converse com seu processo como se fosse um especialista',
        description: 'Faça perguntas em linguagem natural sobre qualquer documento do caso. "Qual foi a decisão sobre a liminar?" — a IA lê os autos e responde com as fontes.',
        example: 'Pergunta: "O juiz deferiu a tutela antecipada?" → Resposta: "Sim. Na decisão de fl. 45, o juiz deferiu a tutela em caráter liminar..."',
        href: '/dashboard/casos',
        tab: 'chat',
        color: 'from-brand-500 to-blue-500',
        glow: 'shadow-brand-500/20',
        status: 'live',
      },
      {
        icon: Brain,
        title: 'Narrativa Jurídica',
        tagline: 'A história jurídica perfeita do caso, montada automaticamente',
        description: 'O sistema lê todos os documentos e constrói a narrativa cronológica dos fatos, o enquadramento jurídico aplicável e os pontos-chave para a tese defensiva.',
        example: 'Enquadramento: Art. 186 CC + Art. 14 CDC • Pontos-chave: dano comprovado, nexo causal estabelecido',
        href: '/dashboard/casos',
        tab: 'analise',
        color: 'from-violet-500 to-purple-600',
        glow: 'shadow-violet-500/20',
        status: 'live',
      },
      {
        icon: ShieldAlert,
        title: 'Motor de Provas',
        tagline: 'Saiba exatamente quais provas faltam antes de ir a juízo',
        description: 'A IA analisa o caso e lista as provas necessárias, quais já estão presentes nos autos, quais estão faltando e alerta sobre riscos probatórios críticos.',
        example: 'Faltando: comprovante de pagamento (urgência alta) • Presente: contrato assinado (força: forte)',
        href: '/dashboard/casos',
        tab: 'analise',
        color: 'from-amber-500 to-orange-600',
        glow: 'shadow-amber-500/20',
        status: 'live',
      },
      {
        icon: Lightbulb,
        title: 'Detecção de Teses',
        tagline: 'Upload do processo → teses jurídicas identificadas em segundos',
        description: 'O sistema analisa os documentos e detecta automaticamente as teses jurídicas aplicáveis, com a lei correspondente, nível de confiança e favorabilidade para cada parte.',
        example: 'Responsabilidade objetiva (90% confiança, favorável ao autor) • Falha na prestação de serviço',
        href: '/dashboard/casos',
        tab: 'analise',
        color: 'from-yellow-500 to-amber-600',
        glow: 'shadow-yellow-500/20',
        status: 'live',
      },
      {
        icon: Mic,
        title: 'Preparação para Audiência',
        tagline: 'Chega de improviso. Entrar na audiência com perguntas prontas e estratégia definida.',
        description: 'Informe o nome e papel da testemunha. O sistema gera as perguntas ideais (diretas, esclarecedoras e provocativas) com o objetivo de cada uma, mais a estratégia completa para a audiência.',
        example: 'Pergunta 1: "O sr. foi avisado da dívida antes da negativação?" → Objetivo: Expor ausência de notificação prévia',
        href: '/dashboard/casos',
        tab: 'audiencia',
        color: 'from-blue-500 to-cyan-500',
        glow: 'shadow-blue-500/20',
        status: 'live',
      },
      {
        icon: Handshake,
        title: 'Análise de Acordo',
        tagline: 'Valor ideal de acordo calculado com base nos documentos do caso',
        description: 'A IA analisa posição probatória, histórico do caso e contexto para recomendar: litigar ou fazer acordo? Qual valor mínimo, ideal e máximo? Quais os cenários?',
        example: 'Recomendação: Acordo • Valor ideal: R$ 25.000 • Probabilidade de vitória: 70%',
        href: '/dashboard/casos',
        tab: 'acordo',
        color: 'from-emerald-500 to-green-600',
        glow: 'shadow-emerald-500/20',
        status: 'live',
      },
    ],
  },
  {
    label: 'Copiloto do Escritório',
    description: 'Visão estratégica de todo o seu portfólio de casos. A IA que acompanha o escritório inteiro.',
    features: [
      {
        icon: Bot,
        title: 'Copiloto IA',
        tagline: 'Briefing diário automático: prazos urgentes, casos de risco e ações recomendadas',
        description: 'Toda vez que você abre o copiloto, a IA analisa todos os seus casos e entrega um briefing com o que é urgente, o que está em risco e o que você precisa fazer primeiro.',
        example: 'Prazo crítico: Contestação vence em 3 dias — Caso A • Alto risco: Caso B sem provas suficientes',
        href: '/dashboard/copiloto',
        color: 'from-brand-500 to-violet-500',
        glow: 'shadow-brand-500/20',
        status: 'live',
      },
      {
        icon: TrendingUp,
        title: 'Radar de Oportunidades',
        tagline: 'A IA detecta padrões entre seus casos e indica oportunidades estratégicas',
        description: 'Com vários casos similares, o sistema identifica padrões: "Você tem 4 casos trabalhistas com a mesma empresa — consolide os argumentos para aumentar seu poder de negociação."',
        example: 'Oportunidade: 4 casos trabalhistas contra Empresa X → Consolidar recursos',
        href: '/dashboard/copiloto',
        color: 'from-emerald-500 to-teal-500',
        glow: 'shadow-emerald-500/20',
        status: 'live',
      },
      {
        icon: Calculator,
        title: 'Previsão de Indenização',
        tagline: 'Quanto vale esse caso? Resposta baseada em jurisprudência real.',
        description: 'Informe o tipo de caso, o estado e a duração. O sistema calcula a faixa de indenização com base em precedentes reais do tribunal, e mostra os fatores que aumentam ou reduzem o valor.',
        example: 'Negativação indevida / SP / 3 meses → R$ 5.200 – R$ 9.000 • Baseado em decisões do TJSP',
        href: '/dashboard/copiloto',
        color: 'from-violet-500 to-pink-500',
        glow: 'shadow-violet-500/20',
        status: 'live',
      },
    ],
  },
  {
    label: 'Assistente Jurídico Geral',
    description: 'IA para responder dúvidas, analisar documentos e gerar peças sem precisar de um processo específico.',
    features: [
      {
        icon: MessageSquare,
        title: 'Assistente Jurídico',
        tagline: 'Seu assistente jurídico disponível 24/7',
        description: 'Pergunte qualquer coisa: "Qual o prazo para recurso de apelação?", "Explique o Art. 1.016 do CPC", "Quais são os requisitos da tutela de urgência?" — respostas precisas, em segundos.',
        href: '/dashboard/chat',
        color: 'from-slate-500 to-slate-600',
        glow: 'shadow-slate-500/20',
        status: 'live',
      },
      {
        icon: ScanSearch,
        title: 'Análise de Documento',
        tagline: 'Suba qualquer peça e receba uma análise completa',
        description: 'Envie contratos, decisões, petições ou qualquer documento jurídico e obtenha análise dos pontos críticos, riscos identificados e recomendações de ação.',
        href: '/dashboard/analise',
        color: 'from-blue-500 to-indigo-600',
        glow: 'shadow-blue-500/20',
        status: 'live',
      },
      {
        icon: ClipboardCheck,
        title: 'Revisor de Peças',
        tagline: 'Revisão automática antes de protocolar',
        description: 'Envie sua peça antes de protocolar e o sistema verifica: erros gramaticais, coerência dos pedidos, fundamentação jurídica, citações e possíveis inconsistências.',
        href: '/dashboard/revisor',
        color: 'from-teal-500 to-emerald-500',
        glow: 'shadow-teal-500/20',
        status: 'live',
      },
      {
        icon: FileEdit,
        title: 'Minutas Automáticas',
        tagline: 'Gere minutas de petições e documentos em segundos',
        description: 'Selecione o tipo de documento, informe os dados básicos das partes e o sistema gera a minuta completa, pronta para revisão e personalização.',
        href: '/dashboard/minutas',
        color: 'from-orange-500 to-red-500',
        glow: 'shadow-orange-500/20',
        status: 'live',
      },
      {
        icon: TrendingUp,
        title: 'Análise Preditiva',
        tagline: 'Qual a chance de ganhar esse caso?',
        description: 'A IA analisa os documentos do caso e histórico jurisprudencial para prever a probabilidade de êxito, identificar pontos fracos e recomendar ajustes na estratégia.',
        href: '/dashboard/predicao',
        color: 'from-pink-500 to-rose-600',
        glow: 'shadow-pink-500/20',
        status: 'live',
      },
    ],
  },
  {
    label: 'Pesquisa Jurídica',
    description: 'Pesquise leis, jurisprudência, processos e decisões de forma rápida e inteligente.',
    features: [
      {
        icon: FileText,
        title: 'Jurisprudências',
        tagline: 'Base de jurisprudência com busca semântica por IA',
        description: 'Pesquise decisões por tema, não apenas por palavras-chave. A IA entende o contexto da sua busca e encontra os precedentes mais relevantes para sua tese.',
        href: '/dashboard/jurisprudencias',
        color: 'from-brand-500 to-blue-500',
        glow: 'shadow-brand-500/20',
        status: 'live',
      },
      {
        icon: Gavel,
        title: 'Consulta de Processos',
        tagline: 'Acompanhe o andamento processual em tempo real',
        description: 'Busque processos por número, OAB ou CPF e acompanhe movimentações, prazos e andamentos diretamente na plataforma.',
        href: '/dashboard/processos',
        color: 'from-slate-500 to-slate-600',
        glow: 'shadow-slate-500/20',
        status: 'live',
      },
      {
        icon: Search,
        title: 'Consultas CEP/CNPJ',
        tagline: 'Dados de empresas e endereços em um clique',
        description: 'Consulte dados completos de CNPJ (razão social, sócios, situação) e CEP (endereço completo) para qualificar partes nas peças.',
        href: '/dashboard/consultas',
        color: 'from-cyan-500 to-blue-500',
        glow: 'shadow-cyan-500/20',
        status: 'live',
      },
      {
        icon: GitCompare,
        title: 'Comparador de Decisões',
        tagline: 'Compare como diferentes tribunais decidiram o mesmo tema',
        description: 'Selecione duas ou mais decisões e o sistema compara os argumentos, fundamentos e conclusões — ideal para identificar divergências e construir teses.',
        href: '/dashboard/comparador',
        color: 'from-indigo-500 to-violet-600',
        glow: 'shadow-indigo-500/20',
        status: 'live',
      },
      {
        icon: BookOpen,
        title: 'Dicionário Jurídico',
        tagline: 'Termos em latim, brocardos e abreviaturas explicados',
        description: 'Mais de 100 termos jurídicos, expressões em latim e brocardos explicados de forma clara, com exemplos de uso e quiz interativo para fixação.',
        href: '/dashboard/dicionario',
        color: 'from-amber-500 to-yellow-600',
        glow: 'shadow-amber-500/20',
        status: 'live',
      },
    ],
  },
  {
    label: 'Ferramentas Práticas',
    description: 'Calculadoras, calendários e utilitários para o dia a dia do escritório.',
    features: [
      {
        icon: Calculator,
        title: 'Calculadora de Honorários',
        tagline: 'Calcule honorários conforme a Tabela da OAB',
        description: 'Insira o valor da causa, tipo de serviço e jurisdição para calcular honorários contratuais e sucumbenciais conforme os parâmetros da OAB, com memória de cálculo.',
        href: '/dashboard/calculadora',
        color: 'from-emerald-500 to-green-600',
        glow: 'shadow-emerald-500/20',
        status: 'live',
      },
      {
        icon: TrendingUp,
        title: 'Atualização Monetária',
        tagline: 'Atualize valores monetários com os índices corretos',
        description: 'Calcule a atualização de valores com SELIC, IPCA, INPC ou IGP-M, com juros moratórios e multa, gerando memória de cálculo pronta para peça.',
        href: '/dashboard/atualizacao',
        color: 'from-teal-500 to-cyan-500',
        glow: 'shadow-teal-500/20',
        status: 'live',
      },
      {
        icon: CalendarDays,
        title: 'Prazos Processuais',
        tagline: 'Nunca mais perca um prazo',
        description: 'Calcule prazos processuais levando em conta feriados, dias úteis e recessos forenses. Receba alertas antes dos vencimentos.',
        href: '/dashboard/prazos',
        color: 'from-red-500 to-rose-600',
        glow: 'shadow-red-500/20',
        status: 'live',
      },
      {
        icon: StickyNote,
        title: 'Bloco de Notas',
        tagline: 'Suas anotações sempre à mão, vinculadas aos casos',
        description: 'Crie notas rápidas durante audiências, reuniões ou ligações. Organize por caso ou data, com busca rápida.',
        href: '/dashboard/notas',
        color: 'from-slate-400 to-slate-600',
        glow: 'shadow-slate-500/20',
        status: 'live',
      },
    ],
  },
  {
    label: 'Gestão do Escritório',
    description: 'Controle financeiro, agenda, clientes e documentos operacionais do escritório.',
    features: [
      {
        icon: FileSignature,
        title: 'Contratos de Honorários',
        tagline: 'Gere contratos de honorários profissionais em minutos',
        description: 'Selecione o modelo (fixo, êxito ou misto), preencha os dados das partes e o sistema gera o contrato completo, personalizado e pronto para assinatura.',
        href: '/dashboard/contratos',
        color: 'from-brand-500 to-violet-500',
        glow: 'shadow-brand-500/20',
        status: 'live',
      },
      {
        icon: DollarSign,
        title: 'Financeiro',
        tagline: 'Controle de entradas e saídas do escritório',
        description: 'Registre honorários recebidos, despesas processuais e custas. Acompanhe o fluxo financeiro do escritório com relatórios mensais.',
        href: '/dashboard/financeiro',
        color: 'from-emerald-500 to-green-600',
        glow: 'shadow-emerald-500/20',
        status: 'live',
      },
      {
        icon: CheckSquare,
        title: 'Diligências e Tarefas',
        tagline: 'Gerencie todas as tarefas processuais em um só lugar',
        description: 'Crie e atribua diligências, prazo e responsável. Acompanhe o andamento e receba notificações de vencimento.',
        href: '/dashboard/tarefas',
        color: 'from-blue-500 to-indigo-600',
        glow: 'shadow-blue-500/20',
        status: 'live',
      },
      {
        icon: Calendar,
        title: 'Agenda de Audiências',
        tagline: 'Sua pauta de audiências organizada e sincronizada',
        description: 'Cadastre audiências com local, processo, partes e tipo. Receba lembretes e visualize sua semana de audiências.',
        href: '/dashboard/agenda',
        color: 'from-orange-500 to-amber-500',
        glow: 'shadow-orange-500/20',
        status: 'live',
      },
      {
        icon: Users,
        title: 'Clientes',
        tagline: 'CRM jurídico básico para gerenciar sua carteira',
        description: 'Cadastre clientes, vincule casos e mantenha histórico de contatos. Visualize todos os casos de um cliente em uma tela.',
        href: '/dashboard/clientes',
        color: 'from-pink-500 to-rose-500',
        glow: 'shadow-pink-500/20',
        status: 'live',
      },
      {
        icon: Scroll,
        title: 'Procurações',
        tagline: 'Modelos de procuração gerados e organizados',
        description: 'Selecione o tipo de procuração, preencha os dados e o sistema gera o documento pronto, com armazenamento organizado por cliente.',
        href: '/dashboard/procuracoes',
        color: 'from-teal-500 to-emerald-500',
        glow: 'shadow-teal-500/20',
        status: 'live',
      },
      {
        icon: FileBarChart,
        title: 'Relatório Mensal',
        tagline: 'Relatório automático da produtividade do escritório',
        description: 'Gere relatórios mensais com: casos ativos/encerrados, honorários recebidos, audiências realizadas e produtividade geral.',
        href: '/dashboard/relatorio',
        color: 'from-violet-500 to-purple-600',
        glow: 'shadow-violet-500/20',
        status: 'live',
      },
    ],
  },
];

const STATUS_LABELS = {
  live: { label: 'Disponível', class: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' },
  beta: { label: 'Beta', class: 'bg-blue-500/15 text-blue-400 border-blue-500/20' },
  soon: { label: 'Em breve', class: 'bg-slate-500/15 text-slate-500 border-slate-500/20' },
};

const HIGHLIGHT_ITEMS: BentoItem[] = [
  {
    title: 'Chat com os Autos',
    description: 'Faça perguntas em linguagem natural sobre qualquer documento do caso. A IA responde com as fontes dos autos.',
    icon: <MessageSquare className="w-4 h-4 text-blue-400" />,
    status: 'Disponível',
    tags: ['Casos', 'RAG', 'IA'],
    meta: 'motor semântico',
    cta: 'Acessar →',
    colSpan: 2,
    hasPersistentHover: true,
  },
  {
    title: 'Copiloto IA',
    description: 'Briefing diário automático: prazos urgentes, casos de risco e ações recomendadas para todo o escritório.',
    icon: <Bot className="w-4 h-4 text-violet-400" />,
    status: 'Disponível',
    tags: ['Escritório'],
    cta: 'Abrir →',
  },
  {
    title: 'Narrativa Jurídica',
    description: 'O sistema lê todos os documentos e constrói a narrativa cronológica, o enquadramento jurídico e os pontos-chave.',
    icon: <Brain className="w-4 h-4 text-purple-400" />,
    status: 'Disponível',
    tags: ['Análise', 'IA'],
    cta: 'Ver →',
  },
  {
    title: 'Detecção de Teses',
    description: 'Análise automática dos autos: teses jurídicas identificadas com lei, nível de confiança e favorabilidade.',
    icon: <Lightbulb className="w-4 h-4 text-amber-400" />,
    status: 'Disponível',
    tags: ['Casos', 'Estratégia'],
    cta: 'Analisar →',
    colSpan: 2,
  },
  {
    title: 'Pesquisa Semântica',
    description: 'Busca de jurisprudência por tema e contexto, não apenas palavras-chave — usando IA para entender sua tese.',
    icon: <ScanSearch className="w-4 h-4 text-sky-400" />,
    status: 'Disponível',
    tags: ['Pesquisa', 'pgvector'],
    meta: 'busca vetorial',
    cta: 'Pesquisar →',
  },
];

export default function FuncionalidadesPage() {
  const totalFeatures = CATEGORIES.reduce((acc, c) => acc + c.features.length, 0);

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d] overflow-y-auto">
      {/* Hero */}
      <div className="relative border-b border-white/[0.06] overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600/8 via-brand-600/5 to-transparent pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-40 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />

        <div className="relative px-8 py-10 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-full mb-5">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span className="text-violet-300 text-xs font-medium">{totalFeatures} funcionalidades disponíveis</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-100 mb-3">
            Tudo que o LegalAI pode fazer por você
          </h1>
          <p className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
            Do iniciante ao especialista — explore cada recurso, entenda como funciona e acesse com um clique.
          </p>

          {/* Quick stats */}
          <div className="flex items-center justify-center gap-8 mt-8">
            {[
              { value: String(totalFeatures), label: 'Funcionalidades' },
              { value: String(CATEGORIES.length), label: 'Categorias' },
              { value: '100%', label: 'Com IA' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-2xl font-bold text-slate-100">{s.value}</p>
                <p className="text-slate-600 text-xs mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Highlights BentoGrid */}
      <div className="px-6 py-8 border-b border-white/[0.06]">
        <div className="flex items-center gap-2 mb-5">
          <Zap className="w-4 h-4 text-brand-400" />
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wide">Destaques</h2>
        </div>
        <BentoGrid items={HIGHLIGHT_ITEMS} />
      </div>

      {/* Categories */}
      <div className="px-6 py-8 space-y-12">
        {CATEGORIES.map((cat) => (
          <section key={cat.label}>
            {/* Category header */}
            <div className="mb-6">
              <h2 className="text-slate-100 text-xl font-bold mb-1">{cat.label}</h2>
              <p className="text-slate-500 text-sm">{cat.description}</p>
            </div>

            {/* Feature cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cat.features.map((feature) => (
                <FeatureCard key={feature.title} feature={feature} />
              ))}
            </div>
          </section>
        ))}
      </div>

      {/* Footer CTA */}
      <div className="mx-6 mb-8 p-6 bg-gradient-to-r from-brand-600/10 to-violet-600/10 border border-white/[0.06] rounded-2xl text-center">
        <p className="text-slate-200 font-semibold mb-1">Não encontrou o que procurava?</p>
        <p className="text-slate-500 text-sm mb-4">Fale com o suporte ou use o assistente jurídico para qualquer dúvida.</p>
        <Link
          href="/dashboard/chat"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm rounded-xl font-medium transition-colors"
        >
          <MessageSquare className="w-4 h-4" />
          Falar com o Assistente
        </Link>
      </div>
    </div>
  );
}

function FeatureCard({ feature }: { feature: Feature }) {
  const status = STATUS_LABELS[feature.status];
  const href = feature.tab
    ? `${feature.href}?tab=${feature.tab}`
    : feature.href;

  return (
    <div className="group relative flex flex-col bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5 hover:border-white/10 hover:bg-white/[0.03] transition-all duration-200">
      {/* Glow on hover */}
      <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl bg-gradient-to-br ${feature.color} pointer-events-none`}
        style={{ opacity: 0 }}
      />

      {/* Icon */}
      <div className="relative mb-4">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center shadow-lg ${feature.glow}`}>
          <feature.icon className="w-5 h-5 text-white" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1">
        <div className="flex items-start justify-between gap-2 mb-2">
          <h3 className="text-slate-100 font-semibold text-sm leading-tight">{feature.title}</h3>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium shrink-0 ${status.class}`}>
            {status.label}
          </span>
        </div>

        <p className="text-brand-400/80 text-xs font-medium mb-2 leading-tight">{feature.tagline}</p>

        <p className="text-slate-500 text-xs leading-relaxed mb-3">{feature.description}</p>

        {feature.example && (
          <div className="p-2.5 bg-white/[0.03] border border-white/[0.04] rounded-lg mb-4">
            <p className="text-[10px] text-slate-600 uppercase tracking-wide font-medium mb-1">Exemplo</p>
            <p className="text-slate-400 text-xs leading-relaxed">{feature.example}</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <Link
        href={href}
        className={`mt-auto flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r ${feature.color} text-white opacity-90 hover:opacity-100 transition-opacity`}
      >
        Acessar
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
