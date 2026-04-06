'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Scale, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

const schema = z.object({
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  confirm: z.string(),
}).refine(d => d.password === d.confirm, { message: 'As senhas não coincidem', path: ['confirm'] });
type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    if (!token) { setError('Token inválido. Solicite um novo link.'); return; }
    setLoading(true);
    setError('');
    try {
      await apiClient.resetPassword(token, data.password);
      setDone(true);
      setTimeout(() => router.push('/login'), 3000);
    } catch {
      setError('Token inválido ou expirado. Solicite um novo link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm">
              <Scale className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-slate-900">LegalAI</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
          {done ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 mb-2">Senha redefinida!</h2>
              <p className="text-slate-500 text-sm">Redirecionando para o login...</p>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900 mb-2">Nova senha</h1>
              <p className="text-slate-500 text-sm mb-6">Crie uma senha com pelo menos 8 caracteres.</p>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg mb-4">
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Nova senha</label>
                  <div className="relative">
                    <input
                      {...register('password')}
                      type={showPw ? 'text' : 'password'}
                      placeholder="Mínimo 8 caracteres"
                      className="w-full pr-10 pl-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirmar senha</label>
                  <input
                    {...register('confirm')}
                    type={showPw ? 'text' : 'password'}
                    placeholder="Repita a senha"
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {errors.confirm && <p className="text-red-500 text-xs mt-1">{errors.confirm.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-gradient-to-r from-blue-600 to-violet-600 text-white rounded-lg font-medium text-sm hover:brightness-110 transition disabled:opacity-60"
                >
                  {loading ? 'Redefinindo...' : 'Redefinir senha'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
                  Solicitar novo link
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return <Suspense><ResetPasswordForm /></Suspense>;
}
