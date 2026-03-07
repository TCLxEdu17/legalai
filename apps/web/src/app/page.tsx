import Link from 'next/link';
import { Scale, BookOpen, Search, ShieldCheck, ArrowRight, CheckCircle, Zap, FileText } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-lg tracking-tight">LegalAI</span>
          </div>
          <Link
            href="/login"
            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Acessar sistema
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-brand-600/10 border border-brand-600/20 rounded-full text-brand-400 text-xs font-medium mb-8">
          <Zap className="w-3 h-3" />
          RAG • Busca Semântica • IA Jurídica
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Pesquisa jurídica com{' '}
          <span className="text-brand-400">inteligência artificial</span>
        </h1>

        <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Encontre precedentes relevantes, analise jurisprudências e fundamente suas teses
          com um assistente que conhece sua base documental e sempre cita as fontes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-medium transition-colors"
          >
            Acessar o sistema
            <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#como-funciona"
            className="inline-flex items-center gap-2 px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
          >
            Como funciona
          </a>
        </div>
      </section>

      {/* Recursos */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid md:grid-cols-3 gap-6">
          {[
            {
              icon: Search,
              title: 'Busca semântica',
              description:
                'Encontre jurisprudências pelo significado, não apenas por palavras-chave. A IA entende o contexto jurídico da sua pergunta.',
            },
            {
              icon: BookOpen,
              title: 'Base própria',
              description:
                'Suba suas jurisprudências em PDF, DOCX ou TXT. O sistema indexa e torna cada documento consultável pela IA.',
            },
            {
              icon: ShieldCheck,
              title: 'Respostas fundamentadas',
              description:
                'Cada resposta é baseada exclusivamente nos documentos indexados, com citação da fonte, trecho e nível de confiança.',
            },
          ].map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-slate-700 transition-colors"
            >
              <div className="w-10 h-10 bg-brand-600/10 rounded-lg flex items-center justify-center mb-4">
                <Icon className="w-5 h-5 text-brand-400" />
              </div>
              <h3 className="font-semibold text-white mb-2">{title}</h3>
              <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section
        id="como-funciona"
        className="border-t border-slate-800 bg-slate-900"
      >
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Como funciona</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              Tecnologia RAG (Retrieval-Augmented Generation) aplicada ao direito.
              Suas perguntas, respondidas com base no seu acervo.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              {
                step: '01',
                icon: FileText,
                title: 'Upload do acervo',
                description: 'Administrador sobe jurisprudências em PDF ou DOCX com metadados.',
              },
              {
                step: '02',
                icon: Zap,
                title: 'Indexação automática',
                description: 'Sistema extrai texto, gera chunks e embeddings vetoriais.',
              },
              {
                step: '03',
                icon: Search,
                title: 'Busca semântica',
                description: 'Pergunta do usuário é comparada vetorialmente ao acervo.',
              },
              {
                step: '04',
                icon: ShieldCheck,
                title: 'Resposta fundamentada',
                description: 'IA gera resposta jurídica com citação das fontes utilizadas.',
              },
            ].map(({ step, icon: Icon, title, description }) => (
              <div key={step} className="text-center">
                <div className="text-4xl font-bold text-slate-800 mb-4">{step}</div>
                <div className="w-12 h-12 bg-brand-600/10 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <Icon className="w-5 h-5 text-brand-400" />
                </div>
                <h3 className="font-semibold text-white mb-2">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Garantias */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 md:p-12">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl font-bold mb-4">
                Desenvolvido para a realidade do direito brasileiro
              </h2>
              <p className="text-slate-400 mb-6 leading-relaxed">
                Prompts calibrados para linguagem jurídica técnica. A IA nunca inventa
                jurisprudência e sempre informa quando não encontrou base suficiente.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Começar agora
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="space-y-4">
              {[
                'Respostas baseadas exclusivamente em fontes indexadas',
                'Citação automática de tribunal, processo e relator',
                'Nível de confiança por resposta',
                'Aviso jurídico automático em cada consulta',
                'Histórico de conversas por sessão',
                'Controle de acesso por perfil',
              ].map((item) => (
                <div key={item} className="flex items-center gap-3">
                  <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span className="text-slate-300 text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Scale className="w-4 h-4" />
            <span>LegalAI — MVP v1.0</span>
          </div>
          <p className="text-slate-600 text-xs">
            As respostas não substituem análise jurídica formal de advogado habilitado.
          </p>
        </div>
      </footer>
    </div>
  );
}
