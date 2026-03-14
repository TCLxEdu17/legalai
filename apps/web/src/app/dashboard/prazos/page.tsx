'use client';

import { useState } from 'react';
import { CalendarDays, Download, Info } from 'lucide-react';

const BRAZILIAN_HOLIDAYS: string[] = [
  // 2025
  '2025-01-01', '2025-04-18', '2025-04-19', '2025-04-21', '2025-05-01',
  '2025-06-19', '2025-09-07', '2025-10-12', '2025-11-02', '2025-11-15',
  '2025-11-20', '2025-12-25',
  // 2026
  '2026-01-01', '2026-04-03', '2026-04-04', '2026-04-21', '2026-05-01',
  '2026-06-04', '2026-09-07', '2026-10-12', '2026-11-02', '2026-11-15',
  '2026-11-20', '2026-12-25',
];

const TIPOS_PRAZO = [
  { label: 'Recurso Ordinário Trabalhista', dias: 8 },
  { label: 'Recurso de Apelação', dias: 15 },
  { label: 'Embargos de Declaração', dias: 5 },
  { label: 'Agravo Interno', dias: 15 },
  { label: 'Recurso Especial/Extraordinário', dias: 15 },
  { label: 'Contestação', dias: 15 },
  { label: 'Prazo personalizado', dias: 0 },
];

const COMARCAS = ['Geral', 'São Paulo', 'Rio de Janeiro'];

function isHoliday(date: Date): boolean {
  const dateStr = date.toISOString().slice(0, 10);
  return BRAZILIAN_HOLIDAYS.includes(dateStr);
}

function isWeekend(date: Date): boolean {
  const day = date.getDay();
  return day === 0 || day === 6;
}

function addWorkingDays(start: Date, days: number): { endDate: Date; timeline: Date[] } {
  const timeline: Date[] = [];
  let count = 0;
  let current = new Date(start);
  current.setDate(current.getDate() + 1); // prazos contam a partir do dia seguinte

  while (count < days) {
    if (!isWeekend(current) && !isHoliday(current)) {
      count++;
      timeline.push(new Date(current));
    }
    if (count < days) current.setDate(current.getDate() + 1);
  }

  return { endDate: current, timeline };
}

function formatDateBR(date: Date): string {
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function generateICS(title: string, date: Date): void {
  const dateStr = date.toISOString().replace(/[-:]/g, '').slice(0, 8);
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART;VALUE=DATE:${dateStr}`,
    `DTEND;VALUE=DATE:${dateStr}`,
    `SUMMARY:Prazo: ${title}`,
    'DESCRIPTION:Prazo processual calculado pelo LegalAI',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\n');

  const blob = new Blob([ics], { type: 'text/calendar' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'prazo.ics';
  a.click();
  URL.revokeObjectURL(url);
}

export default function PrazosPage() {
  const [eventDate, setEventDate] = useState('');
  const [tipoIndex, setTipoIndex] = useState(0);
  const [customDays, setCustomDays] = useState(10);
  const [comarca, setComarca] = useState('Geral');
  const [result, setResult] = useState<{ endDate: Date; timeline: Date[]; dias: number } | null>(null);

  const selectedTipo = TIPOS_PRAZO[tipoIndex];
  const dias = selectedTipo.dias || customDays;

  const calculate = () => {
    if (!eventDate) return;
    const start = new Date(eventDate + 'T00:00:00');
    const { endDate, timeline } = addWorkingDays(start, dias);
    setResult({ endDate, timeline, dias });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Calculadora de Prazos Processuais</h1>
        <p className="text-slate-500 text-sm mt-1">Calcule prazos considerando finais de semana e feriados nacionais</p>
      </div>

      {/* Form */}
      <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Data do evento / intimação</label>
            <input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Comarca</label>
            <select
              value={comarca}
              onChange={(e) => setComarca(e.target.value)}
              className="w-full px-3 py-2.5 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-brand-500"
            >
              {COMARCAS.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Tipo de prazo</label>
          <select
            value={tipoIndex}
            onChange={(e) => setTipoIndex(Number(e.target.value))}
            className="w-full px-3 py-2.5 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            {TIPOS_PRAZO.map((t, i) => (
              <option key={i} value={i}>{t.label}{t.dias ? ` (${t.dias} dias)` : ''}</option>
            ))}
          </select>
        </div>

        {selectedTipo.dias === 0 && (
          <div>
            <label className="text-xs text-slate-500 mb-1.5 block">Número de dias úteis</label>
            <input
              type="number"
              min={1}
              max={365}
              value={customDays}
              onChange={(e) => setCustomDays(Number(e.target.value))}
              className="w-full px-3 py-2.5 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg
                         focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        )}

        <button
          onClick={calculate}
          disabled={!eventDate}
          className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed
                     text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
        >
          <CalendarDays className="w-4 h-4" />
          Calcular prazo
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-4">
          <div className="bg-[#141414] border border-emerald-500/20 rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs text-slate-500 mb-1">Data limite do prazo</p>
                <p className="text-3xl font-bold text-emerald-400">{formatDateBR(result.endDate)}</p>
                <p className="text-slate-400 text-sm mt-1">
                  {result.dias} dias úteis a partir de {formatDateBR(new Date(eventDate + 'T00:00:00'))}
                </p>
                {comarca !== 'Geral' && (
                  <div className="flex items-center gap-1.5 mt-2 text-xs text-amber-400">
                    <Info className="w-3.5 h-3.5" />
                    <span>Verificar feriados municipais de {comarca}</span>
                  </div>
                )}
              </div>
              <button
                onClick={() => generateICS(selectedTipo.label || 'Prazo personalizado', result.endDate)}
                className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 rounded-lg text-xs transition-colors shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                .ics
              </button>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Cronograma de dias úteis</h3>
            <div className="flex flex-wrap gap-2">
              {result.timeline.map((day, i) => {
                const isLast = i === result.timeline.length - 1;
                const isFirst = i === 0;
                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center px-2.5 py-2 rounded-lg border text-xs ${
                      isLast
                        ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
                        : isFirst
                        ? 'bg-brand-600/10 border-brand-500/20 text-brand-400'
                        : 'bg-white/[0.03] border-white/[0.06] text-slate-500'
                    }`}
                  >
                    <span className="font-semibold">{i + 1}º</span>
                    <span className="mt-0.5 text-[10px]">{day.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</span>
                    <span className="text-[9px] opacity-70">{day.toLocaleDateString('pt-BR', { weekday: 'short' })}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
