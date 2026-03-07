'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Scale,
  MessageSquare,
  FileText,
  Upload,
  Settings,
  LayoutDashboard,
  ChevronRight,
  Globe,
  Activity,
  Key,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { isAdmin } from '@/lib/auth';
import { useState, useEffect } from 'react';

const navItems = [
  {
    href: '/dashboard',
    icon: LayoutDashboard,
    label: 'Painel',
    exact: true,
  },
  {
    href: '/dashboard/chat',
    icon: MessageSquare,
    label: 'Assistente Jurídico',
  },
  {
    href: '/dashboard/jurisprudencias',
    icon: FileText,
    label: 'Jurisprudências',
  },
  {
    href: '/dashboard/upload',
    icon: Upload,
    label: 'Upload Manual',
    adminOnly: true,
  },
  {
    href: '/dashboard/fontes',
    icon: Globe,
    label: 'Fontes Automáticas',
    adminOnly: true,
  },
  {
    href: '/dashboard/ingestoes',
    icon: Activity,
    label: 'Histórico de Ingestões',
    adminOnly: true,
  },
  {
    href: '/dashboard/api',
    icon: Key,
    label: 'API & Chaves',
  },
  {
    href: '/dashboard/configuracoes',
    icon: Settings,
    label: 'Configurações',
    adminOnly: true,
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    setAdmin(isAdmin());
  }, []);

  const isActive = (item: (typeof navItems)[0]) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  };

  return (
    <aside className="w-60 bg-slate-900 border-r border-slate-800 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">LegalAI</p>
            <p className="text-slate-500 text-xs">Assistente Jurídico</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems
          .filter((item) => !item.adminOnly || admin)
          .map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                  active
                    ? 'bg-brand-600/15 text-brand-400'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800',
                )}
              >
                <item.icon
                  className={cn(
                    'w-4 h-4 shrink-0',
                    active ? 'text-brand-400' : 'text-slate-500 group-hover:text-slate-300',
                  )}
                />
                <span className="flex-1 truncate">{item.label}</span>
                {active && <ChevronRight className="w-3 h-3 text-brand-400" />}
              </Link>
            );
          })}
      </nav>

      {/* Version */}
      <div className="p-4 border-t border-slate-800">
        <p className="text-slate-600 text-xs text-center">v1.0.0 — MVP</p>
      </div>
    </aside>
  );
}
