'use client';

import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { getStoredUser } from '@/lib/auth';
import {
  Cloud, CloudRain, CloudSnow, Sun, CloudLightning, Wind,
  Newspaper, ExternalLink, Plus, Trash2, Check, MapPin, RefreshCw,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// ─── Saudação ────────────────────────────────────────────────────────────────
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Bom dia';
  if (h < 18) return 'Boa tarde';
  return 'Boa noite';
}

// ─── Checklist ───────────────────────────────────────────────────────────────
interface Task { id: string; text: string; done: boolean }

const INITIAL_TASKS: Task[] = [
  { id: '1', text: 'Verificar prazos processuais do dia', done: false },
  { id: '2', text: 'Revisar petições pendentes', done: false },
  { id: '3', text: 'Retornar ligações de clientes', done: false },
];

function useChecklist() {
  const [tasks, setTasks] = useState<Task[]>([]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('legalai_checklist');
      setTasks(saved ? JSON.parse(saved) : INITIAL_TASKS);
    } catch {
      setTasks(INITIAL_TASKS);
    }
  }, []);

  const save = useCallback((updated: Task[]) => {
    setTasks(updated);
    localStorage.setItem('legalai_checklist', JSON.stringify(updated));
  }, []);

  const toggle = (id: string) => save(tasks.map(t => t.id === id ? { ...t, done: !t.done } : t));
  const remove = (id: string) => save(tasks.filter(t => t.id !== id));
  const add = (text: string) => {
    if (!text.trim()) return;
    save([...tasks, { id: Date.now().toString(), text: text.trim(), done: false }]);
  };

  return { tasks, toggle, remove, add };
}

// ─── Weather ─────────────────────────────────────────────────────────────────
interface WeatherData { temp: number; apparent: number; code: number; city: string }

function weatherIcon(code: number) {
  if (code === 0) return <Sun className="w-6 h-6 text-yellow-400" />;
  if (code <= 3) return <Cloud className="w-6 h-6 text-slate-400" />;
  if (code <= 67) return <CloudRain className="w-6 h-6 text-blue-400" />;
  if (code <= 77) return <CloudSnow className="w-6 h-6 text-sky-300" />;
  if (code <= 82) return <CloudRain className="w-6 h-6 text-blue-400" />;
  if (code <= 99) return <CloudLightning className="w-6 h-6 text-yellow-300" />;
  return <Wind className="w-6 h-6 text-slate-400" />;
}

function weatherDesc(code: number) {
  if (code === 0) return 'Céu limpo';
  if (code === 1) return 'Principalmente limpo';
  if (code === 2) return 'Parcialmente nublado';
  if (code === 3) return 'Nublado';
  if (code <= 48) return 'Neblina';
  if (code <= 57) return 'Chuvisco';
  if (code <= 67) return 'Chuva';
  if (code <= 77) return 'Neve';
  if (code <= 82) return 'Pancadas de chuva';
  return 'Tempestade';
}

function useWeather() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!navigator.geolocation) { setLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        try {
          const [meteo, geo] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${coords.latitude}&longitude=${coords.longitude}&current=temperature_2m,apparent_temperature,weather_code&timezone=America%2FSao_Paulo`).then(r => r.json()),
            fetch(`https://nominatim.openstreetmap.org/reverse?lat=${coords.latitude}&lon=${coords.longitude}&format=json`).then(r => r.json()),
          ]);
          setWeather({
            temp: Math.round(meteo.current.temperature_2m),
            apparent: Math.round(meteo.current.apparent_temperature),
            code: meteo.current.weather_code,
            city: geo.address?.city || geo.address?.town || geo.address?.municipality || 'Sua cidade',
          });
        } catch { /* silently fail */ }
        setLoading(false);
      },
      () => setLoading(false),
      { timeout: 6000 },
    );
  }, []);

  return { weather, loading };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  STF: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  STJ: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CNJ: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
  Geral: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 2) return 'agora';
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  return `${Math.floor(h / 24)}d atrás`;
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const user = getStoredUser();
  const firstName = user?.name?.split(' ')[0] ?? 'Advogado';
  const greeting = getGreeting();
  const today = format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const todayCap = today.charAt(0).toUpperCase() + today.slice(1);

  const { weather, loading: weatherLoading } = useWeather();
  const { tasks, toggle, remove, add } = useChecklist();
  const [newTask, setNewTask] = useState('');

  const { data: news, isLoading: newsLoading, refetch: refetchNews, isRefetching } = useQuery({
    queryKey: ['legal-news'],
    queryFn: () => apiClient.getLegalNews(),
    staleTime: 10 * 60 * 1000,
    retry: 1,
  });

  const handleAddTask = () => { add(newTask); setNewTask(''); };
  const done = tasks.filter(t => t.done).length;

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">
            {greeting}, {firstName}! 👋
          </h1>
          <p className="text-slate-500 text-sm mt-1">{todayCap}</p>
        </div>

        {/* Clima */}
        <div className="flex items-center gap-3 bg-[#141414] border border-white/[0.07] rounded-xl px-4 py-3 min-w-[220px]">
          {weatherLoading ? (
            <div className="flex gap-3 items-center w-full">
              <div className="w-6 h-6 bg-white/5 rounded-full animate-pulse shrink-0" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 bg-white/5 rounded w-16 animate-pulse" />
                <div className="h-2 bg-white/5 rounded w-24 animate-pulse" />
              </div>
            </div>
          ) : weather ? (
            <>
              {weatherIcon(weather.code)}
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-slate-100">{weather.temp}°C</span>
                  <span className="text-xs text-slate-600">sensação {weather.apparent}°C</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-slate-500 mt-0.5">
                  <MapPin className="w-3 h-3 shrink-0" />
                  <span className="truncate max-w-[120px]">{weather.city}</span>
                  <span>·</span>
                  <span>{weatherDesc(weather.code)}</span>
                </div>
              </div>
            </>
          ) : (
            <span className="text-slate-600 text-sm">Clima indisponível</span>
          )}
        </div>
      </div>

      {/* Grid principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* Notícias — 2/3 */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Newspaper className="w-4 h-4 text-brand-400" />
              <h2 className="text-sm font-semibold text-slate-300">Notícias Jurídicas do Dia</h2>
            </div>
            <button
              onClick={() => refetchNews()}
              disabled={isRefetching}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-300 hover:bg-white/5 transition-colors disabled:opacity-40"
              title="Atualizar"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {newsLoading ? (
            <div className="space-y-2">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="bg-[#141414] border border-white/[0.07] rounded-xl p-4 animate-pulse">
                  <div className="flex gap-2 mb-2">
                    <div className="h-4 w-12 bg-white/5 rounded-full" />
                    <div className="h-4 w-10 bg-white/5 rounded-full" />
                  </div>
                  <div className="h-3.5 bg-white/5 rounded w-4/5 mb-1.5" />
                  <div className="h-2.5 bg-white/5 rounded w-full mb-1" />
                  <div className="h-2.5 bg-white/5 rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : news && news.length > 0 ? (
            <div className="space-y-2">
              {news.map((item, i) => (
                <a
                  key={i}
                  href={item.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-[#141414] border border-white/[0.07] hover:border-white/[0.15] rounded-xl p-4 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CATEGORY_COLORS[item.category] ?? CATEGORY_COLORS.Geral}`}>
                          {item.source}
                        </span>
                        <span className="text-[10px] text-slate-600">{timeAgo(item.pubDate)}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-200 group-hover:text-white line-clamp-2 leading-snug">
                        {item.title}
                      </p>
                      {item.summary && (
                        <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                          {item.summary}
                        </p>
                      )}
                    </div>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors shrink-0 mt-1" />
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="bg-[#141414] border border-white/[0.07] rounded-xl p-10 text-center">
              <Newspaper className="w-8 h-8 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Não foi possível carregar as notícias</p>
              <button onClick={() => refetchNews()} className="text-brand-400 text-xs mt-2 hover:underline">
                Tentar novamente
              </button>
            </div>
          )}
        </div>

        {/* Checklist — 1/3 */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-slate-300">Meu Dia</h2>
            </div>
            {tasks.length > 0 && (
              <span className="text-[10px] text-slate-600">{done}/{tasks.length} concluídas</span>
            )}
          </div>

          <div className="bg-[#141414] border border-white/[0.07] rounded-xl overflow-hidden">
            {/* Barra de progresso */}
            {tasks.length > 0 && (
              <div className="h-0.5 bg-white/[0.04]">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.round((done / tasks.length) * 100)}%` }}
                />
              </div>
            )}

            {/* Lista */}
            <div className="divide-y divide-white/[0.04]">
              {tasks.length === 0 && (
                <div className="p-8 text-center text-slate-600 text-sm">
                  Sem tarefas. Adicione uma abaixo ↓
                </div>
              )}
              {tasks.map(task => (
                <div
                  key={task.id}
                  className="flex items-start gap-3 px-4 py-3 group hover:bg-white/[0.02] transition-colors"
                >
                  <button
                    onClick={() => toggle(task.id)}
                    className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                      task.done
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                        : 'border-white/20 hover:border-emerald-400/50'
                    }`}
                  >
                    {task.done && <Check className="w-2.5 h-2.5" />}
                  </button>
                  <span className={`flex-1 text-sm leading-snug pt-0.5 ${task.done ? 'line-through text-slate-600' : 'text-slate-300'}`}>
                    {task.text}
                  </span>
                  <button
                    onClick={() => remove(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-700 hover:text-red-400 transition-all mt-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-white/[0.04] px-4 py-3 flex items-center gap-2">
              <input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                placeholder="Digite e pressione Enter ou +"
                className="flex-1 bg-transparent text-sm text-slate-300 placeholder:text-slate-600 outline-none"
              />
              <button
                onClick={handleAddTask}
                disabled={!newTask.trim()}
                title={newTask.trim() ? 'Adicionar tarefa' : 'Digite uma tarefa primeiro'}
                className="p-1.5 rounded-lg bg-brand-600 text-white hover:bg-brand-500 disabled:bg-white/5 disabled:text-slate-700 disabled:cursor-not-allowed transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {tasks.length > 0 && done === tasks.length && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 text-center">
              <p className="text-emerald-400 text-sm font-medium">🎉 Tudo concluído!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
