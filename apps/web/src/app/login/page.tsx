'use client';

import { useState } from 'react';
import { PlanetLoader } from '@/components/ui/planet-loader';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Scale, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { login } from '@/lib/auth';
import { extractApiErrorMessage } from '@/lib/utils';
import { AuroraBackground } from '@/components/ui/aurora-background';

const loginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter ao menos 6 caracteres'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      // Reseta o timestamp de atividade para evitar falso "sessão expirada"
      localStorage.setItem('legalai_last_activity', String(Date.now()));
      toast.success('Login realizado com sucesso');
      router.push('/dashboard');
    } catch (error) {
      toast.error(extractApiErrorMessage(error));
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 relative">
      <AuroraBackground />
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-brand-600/20 border border-brand-500/30 rounded-xl flex items-center justify-center">
              <Scale className="w-6 h-6 text-brand-400" />
            </div>
            <span className="text-slate-100 font-semibold text-xl tracking-tight">LegalAI</span>
          </Link>
          <p className="text-slate-500 text-sm mt-2">Assistente Jurídico com IA</p>
        </div>

        {/* Card */}
        <div className="bg-[#141414] border border-white/10 rounded-2xl p-8">
          <h1 className="text-slate-100 font-semibold text-lg mb-6">Acesse sua conta</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* E-mail */}
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">
                E-mail
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder="seu@email.com.br"
                className="w-full px-4 py-3 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm
                           placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                           transition-colors"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* Senha */}
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm
                             placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                             transition-colors pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 bg-brand-600 hover:bg-brand-700 disabled:bg-brand-800 disabled:cursor-not-allowed
                         text-white rounded-lg font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              {isSubmitting && <PlanetLoader size="xs" />}
              {isSubmitting ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        <p className="text-slate-600 text-xs text-center mt-6">
          Acesso restrito a usuários autorizados.
        </p>
      </div>
    </div>
  );
}
