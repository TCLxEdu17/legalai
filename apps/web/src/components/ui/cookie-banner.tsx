'use client';
import { useState, useEffect } from 'react';

export function CookieBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const accepted = localStorage.getItem('legalai_cookies_accepted');
    if (!accepted) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem('legalai_cookies_accepted', '1');
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a] border-t border-white/10 px-6 py-4 flex items-center justify-between gap-4">
      <p className="text-slate-400 text-sm">
        Usamos cookies para melhorar sua experiência e coletar métricas de uso anonimizadas, em
        conformidade com a LGPD.
      </p>
      <button
        onClick={accept}
        className="shrink-0 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium rounded-lg transition-colors"
      >
        Aceitar
      </button>
    </div>
  );
}
