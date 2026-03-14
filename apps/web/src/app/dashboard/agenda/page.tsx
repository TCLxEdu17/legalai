'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Plus, Trash2, ChevronLeft, ChevronRight, List, CalendarDays, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

interface Hearing {
  id: string;
  title: string;
  client?: string;
  processNumber?: string;
  court?: string;
  date: string;
  location?: string;
  notes?: string;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function isToday(d: Date) {
  return isSameDay(d, new Date());
}

function isPast(d: Date) {
  return d < new Date() && !isToday(d);
}

export default function AgendaPage() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [currentMonth, setCurrentMonth] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', client: '', processNumber: '', court: '', date: '', location: '', notes: '' });
  const queryClient = useQueryClient();

  const { data: hearings = [] } = useQuery<Hearing[]>({
    queryKey: ['hearings'],
    queryFn: () => apiClient.getHearings(),
  });

  const createMutation = useMutation({
    mutationFn: () => apiClient.createHearing(form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['hearings'] });
      toast.success('Audiência criada');
      setShowForm(false);
      setForm({ title: '', client: '', processNumber: '', court: '', date: '', location: '', notes: '' });
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiClient.deleteHearing(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['hearings'] }); toast.success('Audiência excluída'); },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  // Calendar grid
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (Date | null)[] = Array(firstDay).fill(null).concat(
    Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1))
  );

  const hearingsForDay = (d: Date) =>
    hearings.filter((h) => isSameDay(new Date(h.date), d));

  const selectedDayHearings = selectedDay ? hearingsForDay(selectedDay) : [];

  const upcomingHearings = [...hearings]
    .filter((h) => new Date(h.date) >= new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Agenda de Audiências</h1>
          <p className="text-slate-500 text-sm mt-1">{hearings.length} audiência{hearings.length !== 1 ? 's' : ''} cadastrada{hearings.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button onClick={() => setView('calendar')} className={cn('px-3 py-1.5 rounded text-xs transition-colors', view === 'calendar' ? 'bg-white/10 text-slate-200' : 'text-slate-500')}>
              <CalendarDays className="w-3.5 h-3.5" />
            </button>
            <button onClick={() => setView('list')} className={cn('px-3 py-1.5 rounded text-xs transition-colors', view === 'list' ? 'bg-white/10 text-slate-200' : 'text-slate-500')}>
              <List className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-3 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova audiência
          </button>
        </div>
      </div>

      {view === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-[#141414] border border-white/[0.07] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-200">{MONTHS[month]} {year}</h2>
              <div className="flex gap-1">
                <button onClick={() => setCurrentMonth(new Date(year, month - 1))} className="p-1.5 hover:bg-white/5 rounded text-slate-400"><ChevronLeft className="w-4 h-4" /></button>
                <button onClick={() => setCurrentMonth(new Date(year, month + 1))} className="p-1.5 hover:bg-white/5 rounded text-slate-400"><ChevronRight className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-0.5">
              {DAYS_SHORT.map((d) => (
                <div key={d} className="text-center text-[10px] text-slate-500 py-1">{d}</div>
              ))}
              {days.map((day, i) => {
                if (!day) return <div key={`empty-${i}`} />;
                const dayHearings = hearingsForDay(day);
                const selected = selectedDay && isSameDay(day, selectedDay);
                const today = isToday(day);
                const past = isPast(day);
                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      'aspect-square flex flex-col items-center justify-start p-1 rounded-lg text-xs transition-colors',
                      selected ? 'bg-brand-600/20 border border-brand-500/30' : 'hover:bg-white/5',
                      today ? 'font-bold' : '',
                      past ? 'opacity-40' : ''
                    )}
                  >
                    <span className={cn('w-6 h-6 flex items-center justify-center rounded-full', today ? 'bg-brand-600 text-white' : 'text-slate-400')}>
                      {day.getDate()}
                    </span>
                    {dayHearings.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayHearings.slice(0, 3).map((_, j) => (
                          <div key={j} className={cn('w-1 h-1 rounded-full', past ? 'bg-slate-500' : today ? 'bg-brand-400' : 'bg-emerald-400')} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Day detail */}
          <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-4">
            {selectedDay ? (
              <>
                <h3 className="text-sm font-semibold text-slate-200 mb-3">
                  {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </h3>
                {selectedDayHearings.length === 0 ? (
                  <p className="text-slate-500 text-xs">Sem audiências neste dia</p>
                ) : (
                  <div className="space-y-2">
                    {selectedDayHearings.map((h) => (
                      <HearingCard key={h.id} hearing={h} onDelete={() => deleteMutation.mutate(h.id)} />
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-8 text-center">
                <Calendar className="w-8 h-8 text-slate-600 mb-2" />
                <p className="text-slate-500 text-xs">Clique em um dia para ver as audiências</p>
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'list' && (
        <div className="bg-[#141414] border border-white/[0.07] rounded-xl divide-y divide-white/[0.05]">
          {upcomingHearings.length === 0 && (
            <div className="py-12 text-center">
              <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Sem audiências próximas</p>
            </div>
          )}
          {upcomingHearings.map((h) => (
            <div key={h.id} className="px-4 py-4 flex items-start gap-4">
              <div className="shrink-0 text-center min-w-[48px]">
                <p className="text-2xl font-bold text-emerald-400">{new Date(h.date).getDate()}</p>
                <p className="text-xs text-slate-500">{MONTHS[new Date(h.date).getMonth()].slice(0,3)}</p>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-slate-200 font-medium text-sm">{h.title}</p>
                <p className="text-slate-500 text-xs mt-0.5">
                  {new Date(h.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  {h.client && ` • ${h.client}`}
                  {h.court && ` • ${h.court}`}
                </p>
              </div>
              <button onClick={() => deleteMutation.mutate(h.id)} className="text-slate-600 hover:text-red-400 p-1 rounded transition-colors shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/10 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.07]">
              <h3 className="font-semibold text-slate-100">Nova audiência</h3>
              <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-slate-300 text-xl">×</button>
            </div>
            <div className="p-5 space-y-3">
              {[
                { key: 'title', label: 'Título *', placeholder: 'Ex: Audiência de instrução' },
                { key: 'client', label: 'Cliente', placeholder: 'Nome do cliente' },
                { key: 'processNumber', label: 'Nº do processo', placeholder: '0000000-00.0000.0.00.0000' },
                { key: 'court', label: 'Vara / Tribunal', placeholder: 'Ex: 1ª Vara do Trabalho de SP' },
                { key: 'location', label: 'Local', placeholder: 'Endereço ou link de videoconferência' },
              ].map(({ key, label, placeholder }) => (
                <div key={key}>
                  <label className="text-xs text-slate-500 mb-1 block">{label}</label>
                  <input
                    type="text"
                    value={(form as any)[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    placeholder={placeholder}
                    className="w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              ))}
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Data e hora *</label>
                <input
                  type="datetime-local"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className="w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Observações</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <button
                onClick={() => createMutation.mutate()}
                disabled={!form.title || !form.date || createMutation.isPending}
                className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Salvar audiência
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function HearingCard({ hearing, onDelete }: { hearing: Hearing; onDelete: () => void }) {
  return (
    <div className="p-2.5 bg-white/[0.03] border border-white/[0.06] rounded-lg">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-slate-200 text-xs font-medium">{hearing.title}</p>
          {hearing.client && <p className="text-slate-500 text-[11px] mt-0.5">{hearing.client}</p>}
          <p className="text-slate-500 text-[11px]">
            {new Date(hearing.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            {hearing.court && ` • ${hearing.court}`}
          </p>
        </div>
        <button onClick={onDelete} className="text-slate-600 hover:text-red-400 p-0.5 rounded transition-colors shrink-0">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
