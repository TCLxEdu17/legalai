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
} from 'lucide-react';
import { toast } from 'sonner';
import { apiClient } from '@/lib/api-client';
import { extractApiErrorMessage, cn } from '@/lib/utils';

type Tab = 'chat' | 'documentos' | 'pecas';

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
  const [pieceForm, setPieceForm] = useState({ pieceType: 'CONTESTACAO', title: '', instructions: '' });
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

  const generatePieceMutation = useMutation({
    mutationFn: () =>
      apiClient.generateCasePiece(id, {
        pieceType: pieceForm.pieceType,
        title: pieceForm.title,
        instructions: pieceForm.instructions || undefined,
      }),
    onSuccess: (piece) => {
      queryClient.invalidateQueries({ queryKey: ['case', id] });
      setShowPieceModal(false);
      setPieceForm({ pieceType: 'CONTESTACAO', title: '', instructions: '' });
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
        <div className="flex gap-1 mt-3">
          {([
            { id: 'chat', icon: MessageSquare, label: 'Chat com Autos' },
            { id: 'documentos', icon: FileText, label: `Documentos (${caseData.documents?.length ?? 0})` },
            { id: 'pecas', icon: Scale, label: `Peças (${caseData.pieces?.length ?? 0})` },
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
