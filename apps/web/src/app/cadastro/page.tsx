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
import { register } from '@/lib/auth';
import { extractApiErrorMessage } from '@/lib/utils';
import { AuroraBackground } from '@/components/ui/aurora-background';

const registerSchema = z
  .object({
    name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
    email: z.string().email('E-mail inválido'),
    password: z.string().min(8, 'Senha deve ter ao menos 8 caracteres'),
    confirmPassword: z.string(),
    oabNumber: z.string().max(20).optional().or(z.literal('')),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'As senhas não conferem',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function CadastroPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const {
    register: field,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    try {
      await register(data.name, data.email, data.password, data.oabNumber || undefined);
      localStorage.setItem('legalai_last_activity', String(Date.now()));
      toast.success('Conta criada com sucesso! Bem-vindo ao LegalAI.');
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
          <h1 className="text-slate-100 font-semibold text-lg mb-6">Criar conta</h1>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Nome */}
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">Nome completo</label>
              <input
                {...field('name')}
                type="text"
                autoComplete="name"
                placeholder="João Silva"
                className="w-full px-4 py-3 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm
                           placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                           transition-colors"
              />
              {errors.name && (
                <p className="text-red-400 text-xs mt-1.5">{errors.name.message}</p>
              )}
            </div>

            {/* E-mail */}
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">E-mail</label>
              <input
                {...field('email')}
                type="email"
                autoComplete="email"
                placeholder="seu@escritorio.com.br"
                className="w-full px-4 py-3 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm
                           placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                           transition-colors"
              />
              {errors.email && (
                <p className="text-red-400 text-xs mt-1.5">{errors.email.message}</p>
              )}
            </div>

            {/* OAB (opcional) */}
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">
                Nº OAB <span className="text-slate-600 font-normal">(opcional)</span>
              </label>
              <input
                {...field('oabNumber')}
                type="text"
                autoComplete="off"
                placeholder="SP123456"
                className="w-full px-4 py-3 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm
                           placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                           transition-colors"
              />
            </div>

            {/* Senha */}
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">Senha</label>
              <div className="relative">
                <input
                  {...field('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="Mín. 8 caracteres"
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

            {/* Confirmar senha */}
            <div>
              <label className="block text-slate-400 text-sm font-medium mb-2">
                Confirmar senha
              </label>
              <div className="relative">
                <input
                  {...field('confirmPassword')}
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#111111] border border-white/10 text-slate-100 rounded-lg text-sm
                             placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent
                             transition-colors pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1.5">{errors.confirmPassword.message}</p>
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
              {isSubmitting ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>

          <p className="text-slate-500 text-sm text-center mt-6">
            Já tem uma conta?{' '}
            <Link href="/login" className="text-blue-400 hover:text-blue-300 hover:underline transition-colors">
              Entrar
            </Link>
          </p>
        </div>

        <p className="text-slate-600 text-xs text-center mt-6">
          Ao criar uma conta, você concorda com os nossos termos de uso.
        </p>
      </div>
    </div>
  );
}
