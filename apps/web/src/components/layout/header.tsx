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
    <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
      <div />

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <div className="w-7 h-7 bg-brand-100 rounded-full flex items-center justify-center">
            <UserIcon className="w-3.5 h-3.5 text-brand-700" />
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-slate-800 text-sm font-medium leading-tight">{user?.name || 'Usuário'}</p>
            <p className="text-slate-500 text-xs capitalize">
              {user?.role === 'ADMIN' ? 'Administrador' : 'Usuário'}
            </p>
          </div>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 text-slate-500 transition-transform',
              open && 'rotate-180',
            )}
          />
        </button>

        {open && (
          <>
            <div
              className="fixed inset-0 z-10"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 py-1">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-slate-500 text-xs truncate">{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-red-600 hover:bg-red-50 text-sm transition-colors"
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
