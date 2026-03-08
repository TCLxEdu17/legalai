import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'LegalAI — Assistente Jurídico com Inteligência Artificial',
  description:
    'Sistema de análise de jurisprudência com IA. Encontre precedentes relevantes, analise decisões e fundamente suas teses jurídicas com base em tecnologia RAG.',
  keywords: ['jurisprudência', 'IA', 'direito', 'advocacia', 'legaltech'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
        <Toaster
          position="top-right"
          richColors
          closeButton
          toastOptions={{
            style: { fontFamily: 'Inter, sans-serif' },
          }}
        />
      </body>
    </html>
  );
}
