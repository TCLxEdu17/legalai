'use client';

import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Download, MessageSquare, FileText, Clock, TrendingUp } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getStoredUser } from '@/lib/auth';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

function getChatsByDay(sessions: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const s of sessions) {
    const day = new Date(s.updatedAt).toISOString().slice(0, 10);
    counts[day] = (counts[day] || 0) + 1;
  }
  return counts;
}

export default function RelatorioPage() {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const monthName = `${MONTH_NAMES[month]} de ${year}`;

  const { data: sessions = [] } = useQuery<any[]>({
    queryKey: ['chat-sessions'],
    queryFn: () => apiClient.getChatSessions(),
  });

  const { data: planInfo } = useQuery({
    queryKey: ['plan-info'],
    queryFn: () => apiClient.getPlanInfo(),
  });

  const { data: docStats } = useQuery({
    queryKey: ['document-stats'],
    queryFn: () => apiClient.getDocumentStats(),
  });

  const user = getStoredUser();
  const chatsByDay = getChatsByDay(sessions);
  const totalConsultas = sessions.length;
  const tempoEconomizado = totalConsultas * 30;
  const documentsIndexed = (planInfo?.usage?.uploads || 0);

  const allDays = Array.from({ length: now.getDate() }, (_, i) => {
    const d = new Date(year, month, i + 1);
    return d.toISOString().slice(0, 10);
  });

  const maxCount = Math.max(...allDays.map((d) => chatsByDay[d] || 0), 1);

  const downloadPDF = async () => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF();

    doc.setFontSize(22);
    doc.setTextColor(40, 40, 40);
    doc.text('LegalAI — Relatório Mensal', 20, 25);

    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`Usuário: ${user?.name || 'N/A'}`, 20, 40);
    doc.text(`Período: ${monthName}`, 20, 48);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 56);

    doc.setDrawColor(200, 200, 200);
    doc.line(20, 62, 190, 62);

    doc.setFontSize(14);
    doc.setTextColor(40, 40, 40);
    doc.text('Resumo', 20, 74);

    const metrics = [
      ['Total de consultas', `${totalConsultas}`],
      ['Documentos indexados no mês', `${documentsIndexed}`],
      ['Tempo estimado economizado', `${tempoEconomizado} minutos`],
      ['Plano atual', planInfo?.plan || 'trial'],
    ];

    let y = 84;
    for (const [label, value] of metrics) {
      doc.setFontSize(11);
      doc.setTextColor(80, 80, 80);
      doc.text(label, 20, y);
      doc.setTextColor(40, 40, 40);
      doc.text(value, 120, y);
      y += 9;
    }

    doc.line(20, y + 5, 190, y + 5);
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text('Últimas consultas', 20, y + 18);

    y += 25;
    for (const session of sessions.slice(0, 15)) {
      doc.setFontSize(10);
      doc.setTextColor(80, 80, 80);
      const title = session.title.length > 60 ? session.title.slice(0, 60) + '...' : session.title;
      doc.text(`• ${title}`, 20, y);
      y += 7;
      if (y > 270) break;
    }

    doc.save(`relatorio-legalai-${year}-${String(month + 1).padStart(2, '0')}.pdf`);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-brand-400" />
            Relatório Mensal
          </h1>
          <p className="text-slate-500 text-sm mt-1">{monthName} • {user?.name}</p>
        </div>
        <button
          onClick={downloadPDF}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download className="w-4 h-4" />
          Baixar PDF
        </button>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: MessageSquare, label: 'Consultas', value: totalConsultas, color: 'text-brand-400', bg: 'bg-brand-600/10' },
          { icon: FileText, label: 'Docs indexados', value: documentsIndexed, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { icon: Clock, label: 'Tempo economizado', value: `${tempoEconomizado}min`, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { icon: TrendingUp, label: 'Eficiência', value: totalConsultas > 10 ? 'Alta' : 'Normal', color: 'text-violet-400', bg: 'bg-violet-500/10' },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className="bg-[#141414] border border-white/[0.07] rounded-xl p-4">
            <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${color}`} />
            </div>
            <p className="text-xl font-bold text-slate-100">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-6">
        <h2 className="text-sm font-semibold text-slate-300 mb-4">Consultas por dia</h2>
        <div className="flex items-end gap-1 h-24">
          {allDays.map((day) => {
            const count = chatsByDay[day] || 0;
            const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
            const isToday = day === now.toISOString().slice(0, 10);
            return (
              <div key={day} className="flex-1 flex flex-col items-center gap-1 group relative">
                <div
                  className={`w-full rounded-sm transition-all ${isToday ? 'bg-brand-500' : 'bg-white/10 group-hover:bg-white/20'}`}
                  style={{ height: `${Math.max(4, pct)}%` }}
                />
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] text-slate-300 text-[10px] px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {count} consultas
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[10px] text-slate-600 mt-2">
          <span>1º</span>
          <span>{now.getDate()}º</span>
        </div>
      </div>

      {/* Sessions table */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05] bg-white/[0.02]">
          <h2 className="text-sm font-semibold text-slate-300">Histórico de consultas</h2>
        </div>
        {sessions.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-sm">Nenhuma consulta este mês</div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {sessions.slice(0, 20).map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                <MessageSquare className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <p className="text-slate-300 text-sm flex-1 truncate">{s.title}</p>
                <p className="text-slate-500 text-xs shrink-0">{new Date(s.updatedAt).toLocaleDateString('pt-BR')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
