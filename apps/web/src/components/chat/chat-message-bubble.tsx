'use client';

import { User, Scale, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn, getConfidenceLabel, getConfidenceColor, formatDate } from '@/lib/utils';
import type { Confidence, SourceReference } from '@/types';

interface MessageProps {
  message: {
    id: string;
    role: 'USER' | 'ASSISTANT';
    content: string;
    sources?: SourceReference[];
    confidence?: string;
    retrievedChunks?: number;
    createdAt: string;
    isLoading?: boolean;
  };
}

export function ChatMessageBubble({ message }: MessageProps) {
  const isUser = message.role === 'USER';
  const [showSources, setShowSources] = useState(false);

  if (isUser) {
    return (
      <div className="flex justify-end animate-fade-in">
        <div className="max-w-2xl bg-brand-600/20 border border-brand-500/20 text-slate-100 rounded-2xl rounded-tr-sm px-4 py-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 animate-fade-in">
      <div className="w-8 h-8 bg-white/[0.07] border border-white/10 rounded-full flex items-center justify-center shrink-0 mt-0.5">
        <Scale className="w-4 h-4 text-slate-400" />
      </div>

      <div className="flex-1 min-w-0">
        {message.isLoading ? (
          <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl rounded-tl-sm px-4 py-4">
            <div className="typing-indicator flex items-center gap-1">
              <span />
              <span />
              <span />
            </div>
            <p className="text-slate-500 text-xs mt-2">Analisando sua questão...</p>
          </div>
        ) : (
          <div className="bg-[#1a1a1a] border border-white/[0.07] rounded-2xl rounded-tl-sm overflow-hidden">
            {/* Resposta principal */}
            <div className="px-5 py-4">
              <div className="prose-legal">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {message.content}
                </ReactMarkdown>
              </div>
            </div>

            {/* Metadados da resposta — exibe apenas confiança alta */}
            {message.confidence === 'high' && (
              <div className="flex items-center gap-3 px-5 py-2.5 border-t border-white/[0.06] bg-white/[0.02]">
                <span className="text-xs font-medium px-2 py-0.5 rounded-full text-emerald-400 bg-emerald-500/15">
                  Confiança: Alta
                </span>
                {message.retrievedChunks !== undefined && (
                  <span className="text-slate-500 text-xs">
                    {message.retrievedChunks} trecho{message.retrievedChunks !== 1 ? 's' : ''} encontrado{message.retrievedChunks !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}

            {/* Fontes */}
            {message.sources && message.sources.length > 0 && (
              <div className="border-t border-white/[0.06]">
                <button
                  onClick={() => setShowSources((v) => !v)}
                  className="w-full flex items-center justify-between px-5 py-2.5 text-sm text-slate-400 hover:bg-white/[0.04] transition-colors"
                >
                  <span className="font-medium text-xs">
                    {message.sources.length} fonte{message.sources.length !== 1 ? 's' : ''} utilizada{message.sources.length !== 1 ? 's' : ''}
                  </span>
                  {showSources ? (
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  )}
                </button>

                {showSources && (
                  <div className="px-5 pb-4 space-y-3">
                    {message.sources.map((source, i) => (
                      <SourceCard key={source.documentId} source={source} index={i + 1} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SourceCard({ source, index }: { source: SourceReference; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const maxSimilarity = Math.max(...source.excerpts.map((e) => e.similarity));

  return (
    <div className="border border-white/[0.07] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 p-3 text-left hover:bg-white/[0.04] transition-colors"
      >
        <span className="w-5 h-5 bg-brand-600/15 text-brand-400 rounded text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-slate-200 leading-tight truncate">{source.title}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            {source.tribunal && (
              <span className="text-xs text-slate-500">{source.tribunal}</span>
            )}
            {source.processNumber && (
              <span className="text-xs text-slate-600">• {source.processNumber}</span>
            )}
            {source.judgmentDate && (
              <span className="text-xs text-slate-600">• {formatDate(source.judgmentDate)}</span>
            )}
          </div>
        </div>
        <span className="text-xs text-emerald-400 font-medium shrink-0">
          {(maxSimilarity * 100).toFixed(0)}%
        </span>
      </button>

      {expanded && (
        <div className="border-t border-white/[0.05] px-3 pb-3 space-y-2">
          {source.excerpts.slice(0, 2).map((excerpt, i) => (
            <div key={i} className="bg-[#0f0f0f] rounded-lg p-3 border border-white/[0.04]">
              <p className="text-xs text-slate-400 leading-relaxed line-clamp-4">
                {excerpt.content}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                Relevância: {(excerpt.similarity * 100).toFixed(1)}%
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
