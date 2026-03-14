'use client';

import { useRouter } from 'next/navigation';
import { LogOut, User as UserIcon, ChevronDown, Sun, Moon, Bell, CheckCheck, Menu } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { logout, getStoredUser } from '@/lib/auth';
import { apiClient } from '@/lib/api-client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { User } from '@/types';

export function Header({ onMenuToggle }: { onMenuToggle?: () => void }) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    setUser(getStoredUser());
    setMounted(true);
  }, []);

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => apiClient.getNotifications(),
    refetchInterval: 60000,
    enabled: mounted,
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => apiClient.markAllNotificationsRead(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const unreadCount = notifications.filter((n: any) => !n.read).length;

  const isDark = resolvedTheme === 'dark';

  const handleLogout = async () => {
    await logout();
    toast.success('Sessão encerrada');
    router.replace('/login');
  };

  return (
    <header className="h-14 bg-[#101010]/80 backdrop-blur-md border-b border-white/[0.06] flex items-center justify-between px-4 sm:px-6 shrink-0 relative z-20">
      {/* Left: hamburger on mobile */}
      <div className="flex items-center gap-2">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="lg:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Theme toggle */}
        {mounted && (
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200"
            title={isDark ? 'Modo claro' : 'Modo escuro'}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        )}

        {/* Notifications bell */}
        {mounted && (
          <div className="relative">
            <button
              onClick={() => setNotifOpen((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/5 transition-colors text-slate-400 hover:text-slate-200 relative"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 top-full mt-1 w-80 max-w-[calc(100vw-2rem)] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-20 max-h-96 overflow-y-auto">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
                    <p className="text-sm font-semibold text-slate-200">Notificações</p>
                    {unreadCount > 0 && (
                      <button onClick={() => markAllReadMutation.mutate()} className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300">
                        <CheckCheck className="w-3 h-3" />
                        Marcar todas
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-slate-500 text-sm">Sem notificações</div>
                  ) : (
                    <div className="divide-y divide-white/[0.05]">
                      {notifications.map((n: any) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.read) markReadMutation.mutate(n.id);
                            if (n.link) { setNotifOpen(false); router.push(n.link); }
                          }}
                          className={cn('px-4 py-3 cursor-pointer hover:bg-white/[0.04] transition-colors', !n.read && 'bg-brand-600/5')}
                        >
                          <div className="flex items-start gap-2">
                            {!n.read && <div className="w-1.5 h-1.5 bg-brand-500 rounded-full mt-1.5 shrink-0" />}
                            <div className={cn(!n.read ? '' : 'ml-3.5')}>
                              <p className="text-slate-200 text-xs font-medium">{n.title}</p>
                              <p className="text-slate-500 text-xs mt-0.5">{n.body}</p>
                              <p className="text-slate-600 text-[10px] mt-1">{new Date(n.createdAt).toLocaleDateString('pt-BR')}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2 sm:gap-2.5 px-2 sm:px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors"
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
            <ChevronDown className={cn('w-3.5 h-3.5 text-slate-500 transition-transform hidden sm:block', open && 'rotate-180')} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-44 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-20 py-1">
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
      </div>
    </header>
  );
}
