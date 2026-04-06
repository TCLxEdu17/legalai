'use client';

import Link from 'next/link';
import { Scale, ArrowLeft } from 'lucide-react';
import PricingSection from '@/components/ui/pricing-section';
import { useRouter } from 'next/navigation';

export default function PlanosPublicPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-black">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/[0.07]">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-violet-600 flex items-center justify-center shadow-sm">
              <Scale className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight text-white">LegalAI</span>
          </Link>

          <Link href="/" className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </Link>
        </div>
      </header>

      {/* Pricing */}
      <PricingSection
        onSelectPlan={() => router.push('/trial')}
      />
    </div>
  );
}
