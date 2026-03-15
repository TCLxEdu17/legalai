'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Upload,
  MessageSquare,
  FileText,
  Scale,
  Loader2,
  Send,
  Trash2,
  Download,
  Plus,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  BookOpen,
  Brain,
  Mic,
  Handshake,
  ChevronRight,
  ShieldAlert,
  Lightbulb,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';

type Tab = 'chat' | 'documentos' | 'pecas' | 'analise' | 'audiencia' | 'acordo';

const STYLE_OPTIONS = [
  { value: 'formal_classico', label: 'Formal Clássico', desc: 'Linguagem jurídica tradicional' },
  { value: 'moderno', label: 'Moderno', desc: 'Claro e direto, sem rebuscamento' },
  { value: 'agressivo', label: 'Agressivo', desc: 'Tom firme e incisivo' },
  { value: 'tecnico', label: 'Técnico', desc: 'Foco em doutrina e jurisprudência' },
  { value: 'custom', label: 'Personalizado', desc: 'Defina seu próprio estilo' },
];

interface CaseDocument {
  id: string;
  title: string;
  docType: string;
  fileName: string;
  fileSize: number;
  uploadStatus: string;
  processingStatus: string;
  chunkCount: number;
  createdAt: string;
}

interface Message {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: Array<{
    documentId: string;
    documentTitle: string;
    documentType: string;
    chunkIndex: number;
    similarity: string;
    excerpt: string;
  }>;
  createdAt: string;
}

interface Piece {
  id: string;
  title: string;
  pieceType: string;
  createdAt: string;
}

const DOC_TYPES = [
  { value: 'PETICAO_INICIAL', label: 'Petição Inicial' },
  { value: 'CONTESTACAO', label: 'Contestação' },
  { value: 'REPLICA', label: 'Réplica' },
  { value: 'SENTENCA', label: 'Sentença' },
  { value: 'ACORDAO', label: 'Acórdão' },
  { value: 'LAUDO_PERICIAL', label: 'Laudo Pericial' },
  { value: 'CONTRATO', label: 'Contrato' },
  { value: 'OUTROS', label: 'Outros' },
];

const PIECE_TYPES = [
  { value: 'CONTESTACAO', label: 'Contestação' },
  { value: 'PETICAO_INICIAL', label: 'Petição Inicial' },
  { value: 'RECURSO', label: 'Recurso' },
  { value: 'APELACAO', label: 'Apelação' },
  { value: 'AGRAVO', label: 'Agravo' },
  { value: 'EMBARGOS', label: 'Embargos de Declaração' },
  { value: 'REPLICA', label: 'Réplica' },
  { value: 'ALEGACOES_FINAIS', label: 'Alegações Finais' },
  { value: 'OUTROS', label: 'Outro documento' },
];

const processingStatusIcon = {
  NOT_STARTED: <Clock className="w-3.5 h-3.5 text-slate-500" />,
  CHUNKING: <Loader2 className="w-3.5 h-3.5 text-yellow-400 animate-spin" />,
  EMBEDDING: <Loader2 className="w-3.5 h-3.5 text-brand-400 animate-spin" />,
  INDEXED: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
  FAILED: <AlertCircle className="w-3.5 h-3.5 text-red-400" />,
};

const processingStatusLabel: Record<string, string> = {
  NOT_STARTED: 'Na fila',
  CHUNKING: 'Dividindo texto...',
  EMBEDDING: 'Indexando...',
  INDEXED: 'Indexado',
  FAILED: 'Falhou',
};

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<Tab>('chat');
  const [message, setMessage] = useState('');
  const [showPieceModal, setShowPieceModal] = useState(false);
  const [pieceForm, setPieceForm] = useState({ pieceType: 'CONTESTACAO', title: '', instructions: '', style: '', customStyle: '' });
  const [witnessForm, setWitnessForm] = useState({ name: '', role: '' });
  const [selectedPiece, setSelectedPiece] = useState<{ id: string; title: string; content: string } | null>(null);
  const [uploadDocType, setUploadDocType] = useState('OUTROS');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: caseData, isLoading: caseLoading } = useQuery({
    queryKey: ['case', id],
    queryFn: () => apiClient.getCase(id),
    refetchInterval: (data: any) => {
      // Refetch enquanto houver documentos processando
      const processing = data?.documents?.some(
        (d: CaseDocument) => d.processingStatus === 'CHUNKING' || d.processingStatus === 'EMBEDDING'
      );
      return processing ? 4000 : false;
    },
  });

  const { data: chatHistory = [], isLoading: historyLoading } = useQuery<Message[]>({
    queryKey: ['case-chat', id],
    queryFn: () => apiClient.getCaseChatHistory(id),
  });

  const chatMutation = useMutation({
    mutationFn: (msg: string) => apiClient.chatWithCase(id, msg),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['case-chat', id] }),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, docType }: { file: File; docType: string }) =>
      apiClient.uploadCaseDocument(id, file, docType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      toast.success('Documento enviado e em processamento');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (docId: string) => apiClient.deleteCaseDocument(id, docId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      toast.success('Documento removido');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const narrativeMutation = useMutation({
    mutationFn: () => apiClient.buildCaseNarrative(id),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const evidenceMutation = useMutation({
    mutationFn: () => apiClient.analyzeCaseEvidence(id),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const thesesMutation = useMutation({
    mutationFn: () => apiClient.detectCaseTheses(id),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const hearingMutation = useMutation({
    mutationFn: () => apiClient.generateHearingQuestions(id, witnessForm.name || undefined, witnessForm.role || undefined),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const settlementMutation = useMutation({
    mutationFn: () => apiClient.analyzeCaseSettlement(id),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const generatePieceMutation = useMutation({
    mutationFn: () =>
      apiClient.generateCasePiece(id, {
        pieceType: pieceForm.pieceType,
        title: pieceForm.title,
        instructions: pieceForm.instructions || undefined,
        style: (pieceForm.style as any) || undefined,
        customStyle: pieceForm.customStyle || undefined,
      }),
    onSuccess: (piece) => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      setShowPieceModal(false);
      setPieceForm({ pieceType: 'CONTESTACAO', title: '', instructions: '', style: '', customStyle: '' });
      toast.success('Peça gerada com sucesso');
      setSelectedPiece(piece);
      setTab('pecas');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const loadPieceMutation = useMutation({
    mutationFn: (pieceId: string) => apiClient.getCasePiece(id, pieceId),
    onSuccess: (piece) => setSelectedPiece(piece),
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const deletePieceMutation = useMutation({
    mutationFn: (pieceId: string) => apiClient.deleteCasePiece(id, pieceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      setSelectedPiece(null);
      toast.success('Peça excluída');
    },
    onError: (e) => toast.error(extractApiErrorMessage(e)),
  });

  const clearHistoryMutation = useMutation({
    mutationFn: () => apiClient.clearCaseChatHistory(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['case-chat', id] });
      toast.success('Histórico limpo');
    },
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  function handleSend() {
    const msg = message.trim();
    if (!msg || chatMutation.isPending) return;
    setMessage('');
    chatMutation.mutate(msg);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadMutation.mutate({ file, docType: uploadDocType });
    e.target.value = '';
  }

  function downloadPiece(piece: { title: string; content: string }) {
    const blob = new Blob([piece.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${piece.title.replace(/[^a-zA-Z0-9\s]/g, '')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (caseLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#0d0d0d]">
        <Loader2 className="w-6 h-6 text-brand-400 animate-spin" />
      </div>
    );
  }

  if (!caseData) return null;

  const indexedDocs = caseData.documents?.filter((d: CaseDocument) => d.processingStatus === 'INDEXED').length ?? 0;

  return (
    <div className="flex flex-col h-full bg-[#0d0d0d]">
      {/* Header */}
      <div className="border-b border-white/[0.06] px-6 py-4">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.push('/dashboard/casos')}
            className="text-slate-500 hover:text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-slate-100 font-semibold text-sm truncate">{caseData.title}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {caseData.area && <span className="text-xs text-slate-500">{caseData.area}</span>}
              {caseData.court && <span className="text-xs text-slate-600">· {caseData.court}</span>}
              {caseData.processNumber && (
                <span className="text-xs text-slate-600">· {caseData.processNumber}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-600">
              {indexedDocs}/{caseData.documents?.length ?? 0} docs indexados
            </span>
            <button
              onClick={() => setShowPieceModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs rounded-lg transition-colors"
            >
              <Scale className="w-3.5 h-3.5" />
              Gerar Peça
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3 flex-wrap">
          {([
            { id: 'chat', icon: MessageSquare, label: 'Chat com Autos' },
            { id: 'documentos', icon: FileText, label: `Documentos (${caseData.documents?.length ?? 0})` },
            { id: 'pecas', icon: Scale, label: `Peças (${caseData.pieces?.length ?? 0})` },
            { id: 'analise', icon: Brain, label: 'Análise IA' },
            { id: 'audiencia', icon: Mic, label: 'Audiência' },
            { id: 'acordo', icon: Handshake, label: 'Acordo' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as Tab)}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                tab === t.id
                  ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.04]',
              )}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── TAB: CHAT ─────────────────────────────────────────────────── */}
      {tab === 'chat' && (
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Aviso se não há docs */}
          {indexedDocs === 0 && (
            <div className="mx-6 mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-yellow-300/80 text-xs">
                Nenhum documento indexado ainda. Vá para a aba <strong>Documentos</strong> e faça upload dos autos para
                habilitar o chat com contexto real.
              </p>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {historyLoading ? (
              <div className="flex justify-center pt-10">
                <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
              </div>
            ) : chatHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <MessageSquare className="w-10 h-10 text-slate-700 mb-3" />
                <p className="text-slate-500 text-sm">Faça uma pergunta sobre os autos</p>
                <p className="text-slate-700 text-xs mt-1">Ex: &quot;Qual foi a decisão sobre a liminar?&quot;</p>
              </div>
            ) : (
              chatHistory.map((msg) => (
                <div key={msg.id} className={cn('flex', msg.role === 'USER' ? 'justify-end' : 'justify-start')}>
                  <div
                    className={cn(
                      'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
                      msg.role === 'USER'
                        ? 'bg-brand-600/20 border border-brand-500/30 text-slate-200'
                        : 'bg-white/[0.04] border border-white/[0.08] text-slate-300',
                    )}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                    {msg.sources && msg.sources.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/[0.08]">
                        <p className="text-xs text-slate-500 mb-1.5 font-medium">Fontes citadas:</p>
                        <div className="space-y-1">
                          {msg.sources.map((s, i) => (
                            <div key={i} className="text-xs text-slate-600 bg-white/[0.03] rounded px-2 py-1">
                              <span className="text-brand-400/80">{s.documentTitle}</span>
                              <span className="text-slate-700"> · Chunk #{s.chunkIndex + 1}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {chatMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white/[0.04] border border-white/[0.08] rounded-2xl px-4 py-3">
                  <Loader2 className="w-4 h-4 text-brand-400 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="p-4 border-t border-white/[0.06]">
            <div className="flex items-end gap-2">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                }}
                placeholder="Pergunte sobre os autos... (Enter para enviar, Shift+Enter para nova linha)"
                rows={2}
                className="flex-1 bg-white/[0.03] border border-white/[0.08] rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 resize-none"
              />
              <div className="flex flex-col gap-2">
                <button
                  onClick={handleSend}
                  disabled={!message.trim() || chatMutation.isPending}
                  className="p-3 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
                {chatHistory.length > 0 && (
                  <button
                    onClick={() => { if (confirm('Limpar histórico do chat?')) clearHistoryMutation.mutate(); }}
                    className="p-3 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
                    title="Limpar histórico"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── TAB: DOCUMENTOS ───────────────────────────────────────────── */}
      {tab === 'documentos' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Upload area */}
          <div className="bg-white/[0.02] border border-dashed border-white/[0.10] rounded-xl p-5">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <p className="text-slate-300 text-sm font-medium">Adicionar documento aos autos</p>
                <p className="text-slate-600 text-xs mt-0.5">PDF, DOCX ou TXT · máx 50MB</p>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={uploadDocType}
                  onChange={(e) => setUploadDocType(e.target.value)}
                  className="bg-white/[0.05] border border-white/[0.08] rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                >
                  {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.docx,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadMutation.isPending}
                  className="flex items-center gap-2 px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 text-brand-400 text-xs rounded-lg transition-colors disabled:opacity-50"
                >
                  {uploadMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  Selecionar arquivo
                </button>
              </div>
            </div>
          </div>

          {/* Document list */}
          {caseData.documents?.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <FileText className="w-10 h-10 text-slate-700 mb-3" />
              <p className="text-slate-500 text-sm">Nenhum documento carregado</p>
              <p className="text-slate-700 text-xs mt-1">Faça upload dos autos para habilitar o chat e geração de peças</p>
            </div>
          ) : (
            <div className="space-y-2">
              {caseData.documents?.map((doc: CaseDocument) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 bg-white/[0.02] border border-white/[0.06] rounded-xl px-4 py-3"
                >
                  <FileText className="w-4 h-4 text-slate-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-300 text-sm truncate">{doc.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-slate-600">
                        {DOC_TYPES.find((t) => t.value === doc.docType)?.label ?? doc.docType}
                      </span>
                      <span className="text-slate-700">·</span>
                      <span className="text-xs text-slate-600">{(doc.fileSize / 1024).toFixed(0)} KB</span>
                      {doc.chunkCount > 0 && (
                        <>
                          <span className="text-slate-700">·</span>
                          <span className="text-xs text-slate-600">{doc.chunkCount} chunks</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5">
                      {processingStatusIcon[doc.processingStatus as keyof typeof processingStatusIcon]}
                      <span className="text-xs text-slate-600">
                        {processingStatusLabel[doc.processingStatus] ?? doc.processingStatus}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Remover "${doc.title}"?`)) deleteDocMutation.mutate(doc.id);
                      }}
                      className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ─── TAB: PEÇAS ────────────────────────────────────────────────── */}
      {tab === 'pecas' && (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar de peças */}
          <div className="w-64 border-r border-white/[0.06] flex flex-col">
            <div className="p-4 border-b border-white/[0.04]">
              <button
                onClick={() => setShowPieceModal(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 text-brand-400 text-xs rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Nova Peça
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {caseData.pieces?.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-center px-4">
                  <Scale className="w-8 h-8 text-slate-700 mb-2" />
                  <p className="text-slate-600 text-xs">Nenhuma peça gerada</p>
                </div>
              ) : (
                caseData.pieces?.map((piece: Piece) => (
                  <button
                    key={piece.id}
                    onClick={() => loadPieceMutation.mutate(piece.id)}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-lg transition-all',
                      selectedPiece?.id === piece.id
                        ? 'bg-brand-600/15 border border-brand-500/20'
                        : 'hover:bg-white/[0.04] border border-transparent',
                    )}
                  >
                    <p className={cn('text-xs font-medium truncate', selectedPiece?.id === piece.id ? 'text-brand-400' : 'text-slate-300')}>
                      {piece.title}
                    </p>
                    <p className="text-[10px] text-slate-600 mt-0.5">
                      {PIECE_TYPES.find((t) => t.value === piece.pieceType)?.label}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Conteúdo da peça */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedPiece ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <BookOpen className="w-12 h-12 text-slate-700 mb-4" />
                <p className="text-slate-500 text-sm">Selecione uma peça para visualizar</p>
                <p className="text-slate-700 text-xs mt-1">ou gere uma nova com base nos documentos do caso</p>
              </div>
            ) : loadPieceMutation.isPending ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-5 h-5 text-brand-400 animate-spin" />
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06]">
                  <div>
                    <p className="text-slate-200 text-sm font-medium">{selectedPiece.title}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => downloadPiece(selectedPiece)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.05] text-xs rounded-lg transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Baixar .txt
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Excluir esta peça?')) {
                          deletePieceMutation.mutate(selectedPiece.id);
                        }
                      }}
                      className="p-1.5 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                  <pre className="text-slate-300 text-xs leading-relaxed whitespace-pre-wrap font-mono">
                    {selectedPiece.content}
                  </pre>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: ANÁLISE IA ────────────────────────────────────────────── */}
      {tab === 'analise' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {indexedDocs === 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-yellow-300/80 text-xs">Faça upload e indexe documentos para usar as análises de IA.</p>
            </div>
          )}

          {/* Narrativa */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-brand-400" />
                <h3 className="text-slate-200 text-sm font-medium">Narrativa Jurídica</h3>
              </div>
              <button
                onClick={() => narrativeMutation.mutate()}
                disabled={narrativeMutation.isPending || indexedDocs === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 text-brand-400 text-xs rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {narrativeMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                Gerar Narrativa
              </button>
            </div>
            {narrativeMutation.data ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-slate-500 mb-2 font-medium">Narrativa</p>
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{narrativeMutation.data.narrativa}</p>
                </div>
                {narrativeMutation.data.enquadramentoJuridico && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium">Enquadramento Jurídico</p>
                    <p className="text-slate-400 text-sm">{narrativeMutation.data.enquadramentoJuridico}</p>
                  </div>
                )}
                {narrativeMutation.data.pontosChave?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium">Pontos-Chave</p>
                    <ul className="space-y-1">
                      {narrativeMutation.data.pontosChave.map((p: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                          <ChevronRight className="w-3.5 h-3.5 text-brand-400 shrink-0 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {narrativeMutation.data.recomendacaoEstrategica && (
                  <div className="p-3 bg-brand-600/10 border border-brand-500/20 rounded-lg">
                    <p className="text-xs text-brand-400 font-medium mb-1">Recomendação Estratégica</p>
                    <p className="text-slate-300 text-sm">{narrativeMutation.data.recomendacaoEstrategica}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-600 text-sm">Gere a narrativa jurídica cronológica do caso com base nos documentos indexados.</p>
            )}
          </div>

          {/* Análise de Provas */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <h3 className="text-slate-200 text-sm font-medium">Análise Probatória</h3>
              </div>
              <button
                onClick={() => evidenceMutation.mutate()}
                disabled={evidenceMutation.isPending || indexedDocs === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 text-brand-400 text-xs rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {evidenceMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldAlert className="w-3.5 h-3.5" />}
                Analisar Provas
              </button>
            </div>
            {evidenceMutation.data ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Avaliação geral:</span>
                  <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', {
                    'bg-emerald-500/10 text-emerald-400': evidenceMutation.data.avaliacaoGeral === 'forte',
                    'bg-blue-500/10 text-blue-400': evidenceMutation.data.avaliacaoGeral === 'adequada',
                    'bg-yellow-500/10 text-yellow-400': evidenceMutation.data.avaliacaoGeral === 'fraca',
                    'bg-red-500/10 text-red-400': evidenceMutation.data.avaliacaoGeral === 'critica',
                  })}>
                    {evidenceMutation.data.avaliacaoGeral}
                  </span>
                </div>
                {evidenceMutation.data.alertas?.length > 0 && (
                  <div className="space-y-1">
                    {evidenceMutation.data.alertas.map((a: string, i: number) => (
                      <div key={i} className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                        <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                        <p className="text-yellow-300/80 text-xs">{a}</p>
                      </div>
                    ))}
                  </div>
                )}
                {evidenceMutation.data.provasFaltando?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium">Provas Faltando</p>
                    <div className="space-y-2">
                      {evidenceMutation.data.provasFaltando.map((p: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                          <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded mt-0.5', {
                            'bg-red-500/10 text-red-400': p.urgencia === 'alta',
                            'bg-yellow-500/10 text-yellow-400': p.urgencia === 'media',
                            'bg-slate-500/10 text-slate-400': p.urgencia === 'baixa',
                          })}>{p.urgencia}</span>
                          <div>
                            <p className="text-slate-300 text-xs font-medium">{p.descricao}</p>
                            {p.sugestao && <p className="text-slate-500 text-xs mt-0.5">{p.sugestao}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {evidenceMutation.data.provasPresentes?.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 mb-2 font-medium">Provas Presentes</p>
                    <div className="space-y-1">
                      {evidenceMutation.data.provasPresentes.map((p: any, i: number) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="text-slate-300">{p.descricao}</span>
                          <span className={cn('ml-auto text-[10px] px-1.5 py-0.5 rounded', {
                            'bg-emerald-500/10 text-emerald-400': p.forca === 'forte',
                            'bg-yellow-500/10 text-yellow-400': p.forca === 'media',
                            'bg-slate-500/10 text-slate-500': p.forca === 'fraca',
                          })}>{p.forca}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-slate-600 text-sm">Analise o quadro probatório: provas presentes, faltando e alertas críticos.</p>
            )}
          </div>

          {/* Teses Jurídicas */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-yellow-400" />
                <h3 className="text-slate-200 text-sm font-medium">Teses Jurídicas</h3>
              </div>
              <button
                onClick={() => thesesMutation.mutate()}
                disabled={thesesMutation.isPending || indexedDocs === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600/20 hover:bg-brand-600/30 border border-brand-500/30 text-brand-400 text-xs rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {thesesMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lightbulb className="w-3.5 h-3.5" />}
                Detectar Teses
              </button>
            </div>
            {thesesMutation.data?.teses?.length > 0 ? (
              <div className="space-y-3">
                {thesesMutation.data.teses.map((t: any, i: number) => (
                  <div key={i} className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <p className="text-slate-200 text-sm font-medium">{t.nome}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn('text-[10px] px-1.5 py-0.5 rounded', {
                          'bg-blue-500/10 text-blue-400': t.favorabilidade === 'autor',
                          'bg-red-500/10 text-red-400': t.favorabilidade === 'reu',
                          'bg-slate-500/10 text-slate-400': t.favorabilidade === 'neutra',
                        })}>{t.favorabilidade}</span>
                        <span className="text-xs text-slate-500">{Math.round((t.confianca ?? 0) * 100)}%</span>
                      </div>
                    </div>
                    <p className="text-slate-400 text-xs mb-2">{t.descricao}</p>
                    {t.leis?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {t.leis.map((lei: string, j: number) => (
                          <span key={j} className="text-[10px] px-2 py-0.5 bg-brand-600/10 border border-brand-500/20 text-brand-400 rounded-full">{lei}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : thesesMutation.data ? (
              <p className="text-slate-500 text-sm">Nenhuma tese identificada nos documentos.</p>
            ) : (
              <p className="text-slate-600 text-sm">Identifique automaticamente as teses jurídicas aplicáveis ao caso.</p>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB: AUDIÊNCIA ──────────────────────────────────────────────── */}
      {tab === 'audiencia' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {indexedDocs === 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-yellow-300/80 text-xs">Indexe documentos para gerar perguntas de audiência.</p>
            </div>
          )}

          <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Mic className="w-4 h-4 text-brand-400" />
              <h3 className="text-slate-200 text-sm font-medium">Preparação para Audiência</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Nome da Testemunha</label>
                <input
                  value={witnessForm.name}
                  onChange={(e) => setWitnessForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: José da Silva"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Papel / Função</label>
                <input
                  value={witnessForm.role}
                  onChange={(e) => setWitnessForm((f) => ({ ...f, role: e.target.value }))}
                  placeholder="Ex: Sócio da empresa"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                />
              </div>
            </div>
            <button
              onClick={() => hearingMutation.mutate()}
              disabled={hearingMutation.isPending || indexedDocs === 0}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              {hearingMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mic className="w-4 h-4" />}
              Gerar Perguntas
            </button>
          </div>

          {hearingMutation.data && (
            <>
              {hearingMutation.data.estrategia && (
                <div className="p-4 bg-brand-600/10 border border-brand-500/20 rounded-xl">
                  <p className="text-xs text-brand-400 font-medium mb-1">Estratégia para a Audiência</p>
                  <p className="text-slate-300 text-sm">{hearingMutation.data.estrategia}</p>
                </div>
              )}

              {hearingMutation.data.alertas?.length > 0 && (
                <div className="space-y-1">
                  {hearingMutation.data.alertas.map((a: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 p-2 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                      <AlertCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                      <p className="text-yellow-300/80 text-xs">{a}</p>
                    </div>
                  ))}
                </div>
              )}

              {hearingMutation.data.perguntas?.length > 0 && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-5">
                  <p className="text-slate-300 text-sm font-medium mb-3">Perguntas Geradas ({hearingMutation.data.perguntas.length})</p>
                  <div className="space-y-3">
                    {hearingMutation.data.perguntas.map((p: any, i: number) => (
                      <div key={i} className="p-3 bg-white/[0.02] border border-white/[0.06] rounded-lg">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="text-slate-200 text-sm">{i + 1}. {p.pergunta}</p>
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded shrink-0', {
                            'bg-blue-500/10 text-blue-400': p.tipo === 'direta',
                            'bg-red-500/10 text-red-400': p.tipo === 'provocativa',
                            'bg-emerald-500/10 text-emerald-400': p.tipo === 'esclarecedora',
                          })}>{p.tipo}</span>
                        </div>
                        {p.objetivo && <p className="text-slate-500 text-xs">→ {p.objetivo}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {hearingMutation.data.pontosCriticos?.length > 0 && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Pontos Críticos</p>
                  <ul className="space-y-1">
                    {hearingMutation.data.pontosCriticos.map((p: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-slate-400">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ─── TAB: ACORDO ─────────────────────────────────────────────────── */}
      {tab === 'acordo' && (
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {indexedDocs === 0 && (
            <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-yellow-300/80 text-xs">Indexe documentos para a análise de acordo.</p>
            </div>
          )}

          <div className="flex justify-between items-center">
            <h3 className="text-slate-200 text-sm font-medium flex items-center gap-2">
              <Handshake className="w-4 h-4 text-brand-400" />
              Análise de Acordo
            </h3>
            <button
              onClick={() => settlementMutation.mutate()}
              disabled={settlementMutation.isPending || indexedDocs === 0}
              className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
            >
              {settlementMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
              Analisar Acordo
            </button>
          </div>

          {!settlementMutation.data && (
            <p className="text-slate-600 text-sm">Analise a viabilidade de acordo: valor sugerido, cenários e fatores de risco.</p>
          )}

          {settlementMutation.data && (
            <>
              {/* Recomendação + valores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <p className="text-xs text-slate-500 mb-2">Recomendação</p>
                  <span className={cn('text-lg font-bold', {
                    'text-emerald-400': settlementMutation.data.recomendacao === 'acordo',
                    'text-red-400': settlementMutation.data.recomendacao === 'litigio',
                    'text-yellow-400': settlementMutation.data.recomendacao === 'depende',
                  })}>
                    {settlementMutation.data.recomendacao === 'acordo' ? 'Acordo Recomendado' :
                     settlementMutation.data.recomendacao === 'litigio' ? 'Litigar' : 'Avaliar Caso a Caso'}
                  </span>
                </div>
                {settlementMutation.data.valorSugerido?.ideal > 0 && (
                  <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                    <p className="text-xs text-slate-500 mb-1">Valor Ideal de Acordo</p>
                    <p className="text-lg font-bold text-brand-400">
                      {settlementMutation.data.valorSugerido.ideal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {settlementMutation.data.valorSugerido.minimo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })} — {settlementMutation.data.valorSugerido.maximo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                )}
              </div>

              {settlementMutation.data.racional && (
                <div className="p-4 bg-white/[0.02] border border-white/[0.06] rounded-xl">
                  <p className="text-xs text-slate-500 mb-2 font-medium">Racional</p>
                  <p className="text-slate-300 text-sm leading-relaxed">{settlementMutation.data.racional}</p>
                </div>
              )}

              {/* Cenários */}
              {settlementMutation.data.cenarios?.length > 0 && (
                <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                  <p className="text-xs text-slate-500 mb-3 font-medium">Cenários</p>
                  <div className="space-y-2">
                    {settlementMutation.data.cenarios.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-white/[0.02] border border-white/[0.04] rounded-lg">
                        <div className="flex-1">
                          <p className="text-slate-300 text-sm font-medium">{c.nome}</p>
                          <p className="text-slate-500 text-xs">{c.descricao}</p>
                        </div>
                        <div className="text-right shrink-0">
                          {c.valorEstimado > 0 && (
                            <p className="text-slate-200 text-sm font-medium">
                              {c.valorEstimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          )}
                          <span className={cn('text-[10px] px-1.5 py-0.5 rounded', {
                            'bg-emerald-500/10 text-emerald-400': c.probabilidade === 'alta',
                            'bg-yellow-500/10 text-yellow-400': c.probabilidade === 'media',
                            'bg-red-500/10 text-red-400': c.probabilidade === 'baixa',
                          })}>{c.probabilidade}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pontos e riscos */}
              <div className="grid grid-cols-2 gap-4">
                {settlementMutation.data.pontosFavoraveis?.length > 0 && (
                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                    <p className="text-xs text-emerald-400 font-medium mb-2">Pontos Favoráveis</p>
                    <ul className="space-y-1">
                      {settlementMutation.data.pontosFavoraveis.map((p: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0 mt-0.5" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {settlementMutation.data.fatoresRisco?.length > 0 && (
                  <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-xl">
                    <p className="text-xs text-red-400 font-medium mb-2">Fatores de Risco</p>
                    <ul className="space-y-1">
                      {settlementMutation.data.fatoresRisco.map((r: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                          <AlertCircle className="w-3 h-3 text-red-400 shrink-0 mt-0.5" />
                          {r}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}

      {/* ─── MODAL: GERAR PEÇA ─────────────────────────────────────────── */}
      {showPieceModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#141414] border border-white/[0.08] rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-white/[0.06]">
              <h2 className="text-slate-100 font-semibold">Gerar Peça Jurídica</h2>
              <button
                onClick={() => setShowPieceModal(false)}
                className="text-slate-500 hover:text-slate-300"
              >
                ✕
              </button>
            </div>
            <div className="p-5 space-y-4">
              {indexedDocs === 0 && (
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-300/80 text-xs">
                  Nenhum documento indexado. A peça será gerada sem contexto dos autos — faça upload dos documentos primeiro para resultado de qualidade.
                </div>
              )}
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Tipo de peça *</label>
                <select
                  value={pieceForm.pieceType}
                  onChange={(e) => setPieceForm((f) => ({ ...f, pieceType: e.target.value }))}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500/50"
                >
                  {PIECE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Título da peça *</label>
                <input
                  value={pieceForm.title}
                  onChange={(e) => setPieceForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder="Ex: Contestação — João Silva vs. Banco Itaú"
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Estilo de redação (opcional)</label>
                <div className="grid grid-cols-2 gap-2">
                  {STYLE_OPTIONS.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setPieceForm((f) => ({ ...f, style: f.style === s.value ? '' : s.value }))}
                      className={cn(
                        'text-left px-3 py-2 rounded-lg border text-xs transition-all',
                        pieceForm.style === s.value
                          ? 'bg-brand-600/15 border-brand-500/30 text-brand-400'
                          : 'bg-white/[0.02] border-white/[0.08] text-slate-400 hover:border-white/20',
                      )}
                    >
                      <p className="font-medium">{s.label}</p>
                      <p className="text-[10px] text-slate-600 mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
                {pieceForm.style === 'custom' && (
                  <textarea
                    value={pieceForm.customStyle}
                    onChange={(e) => setPieceForm((f) => ({ ...f, customStyle: e.target.value }))}
                    placeholder="Descreva o estilo desejado..."
                    rows={2}
                    className="mt-2 w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 resize-none"
                  />
                )}
              </div>
              <div>
                <label className="text-slate-400 text-xs font-medium block mb-1">Instruções específicas (opcional)</label>
                <textarea
                  value={pieceForm.instructions}
                  onChange={(e) => setPieceForm((f) => ({ ...f, instructions: e.target.value }))}
                  placeholder="Ex: Enfatizar a ausência de dolo. Incluir argumento de excludente de responsabilidade..."
                  rows={3}
                  className="w-full bg-white/[0.03] border border-white/[0.08] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-brand-500/50 resize-none"
                />
              </div>
              <p className="text-slate-600 text-xs">
                A peça será gerada com base nos {indexedDocs} documento{indexedDocs !== 1 ? 's' : ''} indexado{indexedDocs !== 1 ? 's' : ''} neste caso. O processo pode levar 30-90 segundos.
              </p>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-white/[0.06]">
              <button
                onClick={() => setShowPieceModal(false)}
                className="px-4 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => generatePieceMutation.mutate()}
                disabled={!pieceForm.title.trim() || generatePieceMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
              >
                {generatePieceMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Scale className="w-4 h-4" />
                    Gerar Peça
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
