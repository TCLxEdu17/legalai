'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Loader2, MessageSquare, Plus, Trash2, ChevronRight } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { ChatMessageBubble } from '@/components/chat/chat-message-bubble';
import { extractApiErrorMessage, formatRelativeTime } from '@/lib/utils';
import type { ChatMessage, ChatSession } from '@/types';
import { cn } from '@/lib/utils';

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
      apiClient.sendMessage(message, sessionId),
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

  const onSubmit = (data: MessageForm) => {
    reset({ message: '' });
    sendMutation.mutate({ message: data.message, sessionId: activeSessionId });
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

  const isLoading = sendMutation.isPending;

  return (
    <div className="flex h-full gap-0 -m-6 overflow-hidden">
      {/* Sidebar de sessões */}
      {showSidebar && (
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-4 border-b border-slate-100">
            <button
              onClick={startNewChat}
              className="w-full flex items-center gap-2 px-3 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova consulta
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.length === 0 && (
              <p className="text-slate-400 text-xs text-center py-8 px-4">
                Nenhuma consulta ainda. Inicie uma nova.
              </p>
            )}
            {sessions.map((session) => (
              <div
                key={session.id}
                className={cn(
                  'group flex items-start gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors',
                  activeSessionId === session.id
                    ? 'bg-brand-50 text-brand-700'
                    : 'hover:bg-slate-50 text-slate-700',
                )}
                onClick={() => setActiveSessionId(session.id)}
              >
                <MessageSquare className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate leading-tight">{session.title}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {formatRelativeTime(session.updatedAt)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteMutation.mutate(session.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50">
        {/* Toggle sidebar */}
        <div className="flex items-center gap-2 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
          <button
            onClick={() => setShowSidebar((v) => !v)}
            className="text-slate-500 hover:text-slate-700 transition-colors"
          >
            <ChevronRight
              className={cn(
                'w-4 h-4 transition-transform',
                !showSidebar && 'rotate-180',
              )}
            />
          </button>
          <h2 className="text-sm font-medium text-slate-700">
            {activeSessionId ? 'Assistente Jurídico' : 'Nova consulta'}
          </h2>
        </div>

        {/* Mensagens */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          {messages.length === 0 && !loadingMessages && (
            <div className="flex flex-col items-center justify-center h-full text-center py-16">
              <div className="w-14 h-14 bg-brand-100 rounded-2xl flex items-center justify-center mb-4">
                <MessageSquare className="w-7 h-7 text-brand-600" />
              </div>
              <h3 className="text-slate-800 font-semibold mb-2">Como posso ajudar?</h3>
              <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
                Seu assistente jurídico. Pergunte sobre legislação, jurisprudência, prazos, estratégias processuais ou qualquer questão de direito brasileiro.
              </p>
              <div className="mt-6 space-y-2">
                {[
                  'Quais os requisitos para tutela de urgência antecipada e como argumentar pelo cabimento?',
                  'Qual o prazo prescricional para ação de reparação de danos morais e como se conta?',
                  'Como funciona a desconsideração da personalidade jurídica no CPC e no CDC?',
                  'Quais as súmulas do STJ sobre juros em contratos bancários?',
                ].map((example) => (
                  <button
                    key={example}
                    onClick={() => {
                      reset({ message: example });
                    }}
                    className="block w-full text-left px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 hover:border-brand-200 hover:text-brand-700 transition-colors"
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
        <div className="shrink-0 bg-white border-t border-slate-200 p-4">
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
                  className="text-xs px-3 py-1.5 bg-brand-50 text-brand-700 border border-brand-200 rounded-full hover:bg-brand-100 transition-colors text-left"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit(onSubmit)}>
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
                  className="w-full resize-none px-4 py-3 bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl
                             placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                             disabled:opacity-60 transition-colors"
                />
                {errors.message && (
                  <p className="text-red-500 text-xs mt-1">{errors.message.message}</p>
                )}
              </div>
              <button
                type="submit"
                disabled={isLoading || !messageValue?.trim()}
                className="px-4 py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-200 disabled:cursor-not-allowed
                           text-white rounded-xl transition-colors flex items-center justify-center shrink-0 self-start mt-0"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </button>
            </div>
            <p className="text-slate-400 text-xs mt-2">
              Enter para enviar • Shift+Enter para nova linha
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
