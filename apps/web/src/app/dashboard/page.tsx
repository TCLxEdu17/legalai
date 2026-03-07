'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { MessageSquare, FileText, Upload, Database, ArrowRight, Zap } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getStoredUser } from '@/lib/auth';
import type { DocumentStats, User } from '@/types';

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => { setUser(getStoredUser()); }, []);

  const { data: stats } = useQuery<DocumentStats>({
    queryKey: ['document-stats'],
    queryFn: () => apiClient.getDocumentStats(),
  });

  const quickActions = [
    {
      href: '/dashboard/chat',
      icon: MessageSquare,
      title: 'Nova consulta jurídica',
      description: 'Faça uma pergunta à IA com base nas jurisprudências indexadas',
      color: 'bg-brand-50 text-brand-600 border-brand-100',
      iconBg: 'bg-brand-600',
    },
    {
      href: '/dashboard/jurisprudencias',
      icon: FileText,
      title: 'Ver jurisprudências',
      description: 'Consulte e gerencie os documentos indexados na base',
      color: 'bg-slate-50 text-slate-700 border-slate-200',
      iconBg: 'bg-slate-600',
    },
    ...(user?.role === 'ADMIN'
      ? [
          {
            href: '/dashboard/upload',
            icon: Upload,
            title: 'Upload de documento',
            description: 'Adicione novas jurisprudências à base de conhecimento',
            color: 'bg-emerald-50 text-emerald-700 border-emerald-100',
            iconBg: 'bg-emerald-600',
          },
        ]
      : []),
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Boas-vindas */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          Olá, {user?.name?.split(' ')[0] || 'Usuário'}
        </h1>
        <p className="text-slate-500">
          Assistente jurídico com IA — consulte jurisprudências com linguagem natural.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: 'Documentos',
              value: stats.totalDocuments,
              icon: FileText,
              color: 'text-blue-600',
            },
            {
              label: 'Chunks indexados',
              value: stats.totalChunks,
              icon: Database,
              color: 'text-violet-600',
            },
            {
              label: 'Indexados',
              value: stats.byStatus?.INDEXED || 0,
              icon: Zap,
              color: 'text-emerald-600',
            },
            {
              label: 'Processando',
              value: (stats.byStatus?.CHUNKING || 0) + (stats.byStatus?.EMBEDDING || 0),
              icon: Zap,
              color: 'text-amber-600',
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="bg-white border border-slate-200 rounded-xl p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-slate-500 text-xs font-medium">{label}</p>
                <Icon className={`w-4 h-4 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {value.toLocaleString('pt-BR')}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Ações rápidas */}
      <div>
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
          Ações rápidas
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {quickActions.map(({ href, icon: Icon, title, description, iconBg }) => (
            <Link
              key={href}
              href={href}
              className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-brand-200 hover:shadow-sm transition-all"
            >
              <div className="flex items-start gap-4">
                <div
                  className={`w-10 h-10 ${iconBg} rounded-lg flex items-center justify-center shrink-0`}
                >
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">
                    {title}
                  </p>
                  <p className="text-slate-500 text-sm leading-relaxed">{description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-brand-500 shrink-0 mt-0.5 transition-colors" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Tribunais */}
      {stats?.topTribunais && stats.topTribunais.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">
            Tribunais na base
          </h2>
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
            {stats.topTribunais.slice(0, 5).map(({ tribunal, count }) => (
              <div key={tribunal} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm text-slate-700 font-medium">{tribunal}</span>
                <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {count} doc{count !== 1 ? 's' : ''}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
