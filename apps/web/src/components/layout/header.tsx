'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon, ChevronDown } from 'lucide-react';
import { useState, useEffect } from 'react';
import { logout, getStoredUser } from '@/lib/auth';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

export function Header() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success('Sessão encerrada');
    router.replace('/login');
  };

  return (
    <header className="h-14 bg-[#0d0d16]/80 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-6 shrink-0 relative z-20">
      <div />
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
        >
          <div className="w-7 h-7 bg-brand-600/20 border border-brand-500/30 rounded-full flex items-center justify-center">
            <UserIcon className="w-3.5 h-3.5 text-brand-400" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-slate-200 text-sm font-medium leading-tight">{user?.name || 'Usuário'}</p>
            <p className="text-slate-500 text-xs capitalize">
              {user?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
            </p>
          </div>
          <ChevronDown className={cn('w-3.5 h-3.5 text-slate-500 transition-transform', open && 'rotate-180')} />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-44 bg-[#14141e] border border-white/10 rounded-xl shadow-2xl z-20 py-1">
              <div className="px-3 py-2 border-b border-white/[0.06]">
                <p className="text-slate-500 text-xs truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
