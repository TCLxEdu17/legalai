'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Loader2, MessageSquare, Plus, Trash2, ChevronRight, Paperclip, X, Scale } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { ChatMessageBubble } from '@/components/chat/chat-message-bubble';
import { extractApiErrorMessage, formatRelativeTime } from '@/lib/utils';
import type { ChatMessage, ChatSession } from '@/types';
import { cn } from '@/lib/utils';
import { getStoredUser } from '@/lib/auth';

const EXAMPLE_QUESTIONS = [
  // Processo Civil
  'Quais os requisitos para tutela de urgência antecipada e como argumentar pelo cabimento?',
  'Como funciona a desconsideração da personalidade jurídica no CPC e no CDC?',
  'Quais são os efeitos da revelia e quando ela não se aplica?',
  'Como calcular e comprovar o dano moral em ação indenizatória?',
  'Quais são os fundamentos para pedir a inversão do ônus da prova?',
  'Como funciona a execução de título extrajudicial e quais os embargos cabíveis?',
  // Direito do Trabalho
  'Quais verbas rescisórias são devidas em demissão sem justa causa após a Reforma Trabalhista?',
  'Como configurar assédio moral no ambiente de trabalho para fins processuais?',
  'Quais os requisitos para reconhecimento de vínculo empregatício de trabalhador informal?',
  'Como funciona a prescrição trabalhista após a Emenda Constitucional 45?',
  // Direito do Consumidor
  'Quais as hipóteses de responsabilidade objetiva do fornecedor no CDC?',
  'Como aplicar o prazo decadencial para reclamar vício do produto ou serviço?',
  'Quais práticas abusivas são vedadas pelo CDC em contratos de adesão?',
  // Direito Tributário
  'Quais as súmulas do STJ sobre juros e correção em contratos bancários?',
  'Como funciona a exclusão do ICMS da base de cálculo do PIS/COFINS após o STF?',
  'Quais os limites da responsabilidade tributária do sócio-gerente pela Súmula 435 do STJ?',
  'Como impugnar a CDA e quais os vícios que a tornam nula?',
  // Direito Penal
  'Quais os requisitos para concessão de habeas corpus preventivo?',
  'Como funciona a colaboração premiada e quais seus efeitos no processo?',
  'Quais as condições para substituição de pena privativa de liberdade por restritiva de direitos?',
  // Direito Civil
  'Quais os requisitos para usucapião urbana especial e como provar a posse?',
  'Como funciona a responsabilidade civil objetiva por fato de terceiro?',
  'Quais cláusulas contratuais podem ser anuladas por abuso do direito?',
  'Como se aplica a teoria da imprevisão para revisão de contratos?',
  // Temas atuais
  'Qual o entendimento atual do STJ sobre superendividamento e renegociação de dívidas?',
  'Como funciona a proteção de dados pessoais (LGPD) e responsabilidade civil por vazamento?',
  'Quais os direitos do devedor na execução fiscal e como opor exceção de pré-executividade?',
];

function getGreeting(): string {
  const hour = new Date().getHours();
  const timeGreet = hour >= 5 && hour < 12 ? 'Bom dia' : hour >= 12 && hour < 18 ? 'Boa tarde' : 'Boa noite';
  const user = getStoredUser();
  if (!user) return `${timeGreet}! Como posso ajudar hoje?`;
  const nameAlreadyHasPrefix = /^Dr[a]?\./i.test(user.name.trim());
  const displayName = nameAlreadyHasPrefix ? user.name.split(' ').slice(0, 2).join(' ') : user.name.split(' ')[0];
  const prefix = user.role === 'ADMIN' || nameAlreadyHasPrefix ? '' : 'Dr. ';
  return `${timeGreet}, ${prefix}${displayName}!`;
}

function getRandomExamples(n: number) {
  const shuffled = [...EXAMPLE_QUESTIONS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

// ===================== Specialty mode selector =====================
const LEGAL_SPECIALTY_AREAS = [
  'Generalista',
  'Civil',
  'Penal',
  'Trabalhista',
  'Tributário',
  'Administrativo',
  'Constitucional',
  'Consumidor',
  'Família e Sucessões',
  'Previdenciário',
  'Ambiental',
  'Digital / LGPD',
  'Empresarial',
  'Imobiliário',
  'Bancário / Financeiro',
  'Eleitoral',
  'Internacional',
  'Saúde',
  'Marítimo e Portuário',
] as const;

type LegalSpecialtyArea = (typeof LEGAL_SPECIALTY_AREAS)[number];
// ===================== End specialty mode =====================

// ===================== Area categorization =====================
type LegalArea = 'Trabalhista' | 'Civil' | 'Penal' | 'Tributário' | 'Previdenciário' | 'Outro';

const AREA_KEYWORDS: Record<LegalArea, string[]> = {
  Trabalhista: ['clt', 'trabalhista', 'empregado', 'rescisão', 'fgts', 'aviso prévio', 'jornada'],
  Civil: ['contrato', 'dano', 'indenização', 'responsabilidade', 'locação', 'posse', 'propriedade'],
  Penal: ['crime', 'pena', 'réu', 'absolvição', 'condenação', 'prisão', 'furto', 'roubo'],
  Tributário: ['imposto', 'tributo', 'icms', 'iss', 'irpf', 'contribuição', 'fiscal'],
  Previdenciário: ['inss', 'aposentadoria', 'benefício', 'segurado', 'previdência'],
  Outro: [],
};

const AREA_COLORS: Record<LegalArea, string> = {
  Trabalhista: 'bg-amber-500/15 text-amber-400',
  Civil: 'bg-brand-600/15 text-brand-400',
  Penal: 'bg-red-500/15 text-red-400',
  Tributário: 'bg-emerald-500/15 text-emerald-400',
  Previdenciário: 'bg-violet-500/15 text-violet-400',
  Outro: 'bg-white/5 text-slate-500',
};

function categorizeSession(title: string): LegalArea {
  const lower = title.toLowerCase();
  for (const [area, keywords] of Object.entries(AREA_KEYWORDS) as [LegalArea, string[]][]) {
    if (area === 'Outro') continue;
    if (keywords.some((kw) => lower.includes(kw))) return area;
  }
  return 'Outro';
}

// ===================== End categorization =====================

const messageSchema = z.object({
  message: z
    .string()
    .min(10, 'A pergunta deve ter pelo menos 10 caracteres')
    .max(2000, 'Máximo de 2000 caracteres'),
});

type MessageForm = z.infer<typeof messageSchema>;

interface LocalMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: any[];
  confidence?: string;
  retrievedChunks?: number;
  createdAt: string;
  isLoading?: boolean;
}

export default function ChatPage() {
  const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [showSidebar, setShowSidebar] = useState(true);
  const [examples, setExamples] = useState<string[]>([]);
  const [greeting, setGreeting] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [areaFilter, setAreaFilter] = useState<LegalArea | null>(null);
  const [selectedSpecialty, setSelectedSpecialty] = useState<LegalSpecialtyArea>('Generalista');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<MessageForm>({ resolver: zodResolver(messageSchema) });

  const messageValue = watch('message', '');

  // Listar sessões
  const { data: sessions = [] } = useQuery<ChatSession[]>({
    queryKey: ['chat-sessions'],
    queryFn: () => apiClient.getChatSessions(),
  });

  // Carregar mensagens da sessão ativa
  const { isLoading: loadingMessages, data: sessionData } = useQuery({
    queryKey: ['session-messages', activeSessionId],
    queryFn: () => apiClient.getSessionMessages(activeSessionId!),
    enabled: !!activeSessionId,
  });

  // Client-only initialization — avoid hydration mismatch
  useEffect(() => {
    setExamples(getRandomExamples(4));
    setGreeting(getGreeting());
  }, []);

  useEffect(() => {
    if (sessionData) {
      setMessages(
        (sessionData as any).messages.map((m: ChatMessage) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          sources: m.sources,
          confidence: m.metadata?.confidence,
          retrievedChunks: m.metadata?.retrievedChunks,
          createdAt: m.createdAt,
        })),
      );
    }
  }, [sessionData]);

  // Enviar mensagem
  const sendMutation = useMutation({
    mutationFn: ({ message, sessionId }: { message: string; sessionId?: string }) =>
      apiClient.sendMessage(message, sessionId, selectedSpecialty === 'Generalista' ? undefined : selectedSpecialty),
    onMutate: (vars) => {
      const tempUserMsg: LocalMessage = {
        id: `temp-user-${Date.now()}`,
        role: 'USER',
        content: vars.message,
        createdAt: new Date().toISOString(),
      };
      const tempAiMsg: LocalMessage = {
        id: `temp-ai-${Date.now()}`,
        role: 'ASSISTANT',
        content: '',
        createdAt: new Date().toISOString(),
        isLoading: true,
      };
      setMessages((prev) => [...prev, tempUserMsg, tempAiMsg]);
    },
    onSuccess: (data) => {
      if (!activeSessionId) {
        setActiveSessionId(data.sessionId);
        queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      }

      setMessages((prev) => {
        const withoutLoading = prev.filter((m) => !m.isLoading);
        return [
          ...withoutLoading,
          {
            id: data.message.id,
            role: 'ASSISTANT' as const,
            content: data.message.content,
            sources: data.message.sources,
            confidence: data.message.confidence,
            retrievedChunks: data.message.retrievedChunks,
            createdAt: data.message.createdAt,
          },
        ];
      });
    },
    onError: (error) => {
      setMessages((prev) => prev.filter((m) => !m.isLoading));
      toast.error(extractApiErrorMessage(error));
    },
  });

  // Delete session
  const deleteMutation = useMutation({
    mutationFn: (sessionId: string) => apiClient.deleteSession(sessionId),
    onSuccess: (_, sessionId) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      if (activeSessionId === sessionId) {
        setActiveSessionId(undefined);
        setMessages([]);
      }
      toast.success('Sessão encerrada');
    },
  });

  const onSubmit = async (data: MessageForm) => {
    let messageText = data.message;
    reset({ message: '' });

    if (attachedFile) {
      setIsUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', attachedFile);
        await apiClient.uploadDocument(formData);
        messageText = `[Documento anexado: ${attachedFile.name}]\n\n${messageText}`;
        toast.success(`Documento "${attachedFile.name}" carregado com sucesso`);
      } catch {
        toast.error('Falha ao fazer upload do documento');
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
        setAttachedFile(null);
      }
    }

    sendMutation.mutate({ message: messageText, sessionId: activeSessionId });
  };

  const isLoading = sendMutation.isPending || isUploading;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB.');
      return;
    }
    setAttachedFile(file);
    e.target.value = '';
  };

  // Sugestões de follow-up baseadas no conteúdo da última resposta
  const followUpSuggestions = (() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'ASSISTANT' && !m.isLoading);
    if (!lastAssistant || isLoading) return [];

    const text = lastAssistant.content.toLowerCase();
    const suggestions: string[] = [];

    if (text.match(/prazo|prescri|decad|tempest/))
      suggestions.push('Qual o prazo exato e como ele se conta?');
    if (text.match(/recurso|apela|agravo|embarg/))
      suggestions.push('Quais os requisitos de admissibilidade desse recurso?');
    if (text.match(/contrato|cláusula|rescis/))
      suggestions.push('Quais cláusulas são consideradas abusivas nesse tipo de contrato?');
    if (text.match(/indeniza|dano|repara/))
      suggestions.push('Como calcular o valor da indenização nesse caso?');
    if (text.match(/trabalhist|clt|emprego|demiss/))
      suggestions.push('Quais as verbas rescisórias devidas nessa situação?');
    if (text.match(/tribut|imposto|fisco|receita/))
      suggestions.push('Existe possibilidade de exclusão de multa ou juros?');
    if (text.match(/tutela|liminar|antecip|urgên/))
      suggestions.push('Como fundamentar o requisito de urgência para o juiz?');
    if (text.match(/súmula|tese|jurisprud|precedent/))
      suggestions.push('Essa tese já foi aplicada no meu tribunal?');

    // Sempre adiciona sugestões genéricas até completar 3
    const genericas = [
      'Quais as exceções a essa regra?',
      'Qual a jurisprudência mais recente sobre isso?',
      'Como esse entendimento se aplica na prática?',
      'Existe risco de decisão contrária? Como mitigar?',
    ];
    for (const s of genericas) {
      if (suggestions.length >= 3) break;
      if (!suggestions.includes(s)) suggestions.push(s);
    }

    return suggestions.slice(0, 3);
  })();

  const startNewChat = () => {
    setActiveSessionId(undefined);
    setMessages([]);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex h-full gap-0 -m-6 overflow-hidden">
      {/* Sidebar de sessões */}
      {showSidebar && (
        <div className="w-64 bg-[#0a0a0a] border-r border-white/[0.06] flex flex-col shrink-0">
          <div className="p-4 border-b border-white/[0.05]">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova consulta
            </button>
          </div>

          {/* Area filters */}
          <div className="px-2 py-2 border-b border-white/[0.05] flex flex-wrap gap-1">
            <button
              onClick={() => setAreaFilter(null)}
              className={cn('text-[10px] px-2 py-0.5 rounded-full transition-colors', !areaFilter ? 'bg-brand-600/20 text-brand-400' : 'bg-white/5 text-slate-500 hover:text-slate-300')}
            >
              Todas
            </button>
            {(Object.keys(AREA_COLORS) as LegalArea[]).filter(a => a !== 'Outro').map((area) => (
              <button
                key={area}
                onClick={() => setAreaFilter(areaFilter === area ? null : area)}
                className={cn('text-[10px] px-2 py-0.5 rounded-full transition-colors', areaFilter === area ? AREA_COLORS[area] : 'bg-white/5 text-slate-500 hover:text-slate-300')}
              >
                {area}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 && (
              <p className="text-slate-600 text-xs text-center py-8 px-4">
                Nenhuma consulta ainda. Inicie uma nova.
              </p>
            )}
            {sessions
              .filter((s) => !areaFilter || categorizeSession(s.title) === areaFilter)
              .map((session) => {
              const area = categorizeSession(session.title);
              return (
              <div
                key={session.id}
                className={cn(
                  'group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                  activeSessionId === session.id
                    ? 'bg-brand-600/15 text-brand-400'
                    : 'hover:bg-white/[0.04] text-slate-400',
                )}
                onClick={() => setActiveSessionId(session.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-600" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">{session.title}</p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-slate-600">
                      {formatRelativeTime(session.updatedAt)}
                    </p>
                    {area !== 'Outro' && (
                      <span className={cn('text-[9px] px-1.5 py-px rounded-full font-medium', AREA_COLORS[area])}>
                        {area}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a]">
        {/* Toggle sidebar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-[#101010]/80 border-b border-white/[0.06] shrink-0 backdrop-blur-sm">
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ChevronRight
              className={cn(
                'w-4 h-4 transition-transform',
                !showSidebar && 'rotate-180',
              )}
            />
          </button>
          <h2 className="text-sm font-medium text-slate-400">
            {activeSessionId ? 'Assistente Jurídico' : 'Nova consulta'}
          </h2>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !loadingMessages && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-14 h-14 bg-brand-600/20 border border-brand-500/20 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-brand-400" />
              </div>
              {messages.length === 0 && !activeSessionId && (
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold text-slate-100">{greeting}</h2>
                  <p className="text-slate-500 text-sm mt-1">Como posso ajudar você hoje?</p>
                </div>
              )}
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                Seu assistente jurídico. Pergunte sobre legislação, jurisprudência, prazos, estratégias processuais ou qualquer questão de direito brasileiro.
              </p>
              <div className="mt-6 space-y-2">
                {examples.map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      reset({ message: '' });
                      sendMutation.mutate({ message: example, sessionId: activeSessionId });
                    }}
                    className="block w-full text-left px-4 py-2.5 bg-[#141414] border border-white/[0.07] rounded-lg text-xs text-slate-400 hover:border-brand-500/30 hover:text-brand-400 transition-colors"
                  >
                    "{example}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}


          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="shrink-0 bg-[#101010]/80 border-t border-white/[0.06] p-4 backdrop-blur-sm">
          {/* Seletor de especialidade */}
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="text-xs text-slate-500">Especialidade do assistente</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {LEGAL_SPECIALTY_AREAS.map((area) => (
                <button
                  key={area}
                  type="button"
                  onClick={() => setSelectedSpecialty(area)}
                  className={cn(
                    'text-[11px] px-2.5 py-1 rounded-full border transition-colors',
                    selectedSpecialty === area
                      ? 'bg-brand-600/20 border-brand-500/40 text-brand-300'
                      : 'bg-white/[0.03] border-white/[0.06] text-slate-500 hover:text-slate-300 hover:border-white/10',
                  )}
                >
                  {area}
                </button>
              ))}
            </div>
          </div>
          {/* Sugestões de follow-up */}
          {followUpSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {followUpSuggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    reset({ message: '' });
                    sendMutation.mutate({ message: s, sessionId: activeSessionId });
                  }}
                  className="text-xs px-3 py-1.5 bg-brand-600/10 text-brand-400 border border-brand-500/20 rounded-full hover:bg-brand-600/15 transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* File preview chip */}
            {attachedFile && (
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-brand-600/10 border border-brand-500/20 rounded-full text-xs text-brand-400">
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-[200px] truncate">{attachedFile.name}</span>
                  <button
                    type="button"
                    onClick={() => setAttachedFile(null)}
                    className="hover:text-red-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                {isUploading && <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-400" />}
              </div>
            )}
            <div className="flex gap-3">
              <div className="flex-1">
                <textarea
                  {...register('message')}
                  placeholder="Faça sua pergunta jurídica... (legislação, jurisprudência, prazos, estratégias)"
                  rows={2}
                  disabled={isLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(onSubmit)();
                    }
                  }}
                  className="w-full resize-none px-4 py-3 bg-[#111111] border border-white/10 text-slate-100 text-sm rounded-xl
                             placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                             disabled:opacity-60 transition-colors"
                />
                {errors.message && (
                  <p className="text-red-400 text-xs mt-1">{errors.message.message}</p>
                )}
              </div>
              {/* Attach file button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-3 py-3 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed
                           text-slate-400 hover:text-slate-200 rounded-xl transition-colors flex items-center justify-center shrink-0 self-start"
                title="Anexar documento (PDF, DOCX, TXT — máx 10MB)"
              >
                <Paperclip className="w-4 h-4" />
              </button>
              <button
                type="submit"
                disabled={isLoading || !messageValue?.trim()}
                className="px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-white/5 disabled:cursor-not-allowed
                           text-white rounded-xl transition-colors flex items-center justify-center shrink-0 self-start mt-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-slate-600 text-xs mt-2">
              Enter para enviar • Shift+Enter para nova linha • 📎 anexe PDF/DOCX/TXT
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
