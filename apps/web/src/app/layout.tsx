import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import { Toaster } from 'sonner';
import { MetaPixelPageView } from '@/components/meta-pixel';
import { FB_PIXEL_ID } from '@/lib/pixel';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#2535ea',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'LegalAI — Assistente Jurídico com Inteligência Artificial',
  description:
    'Sistema de análise de jurisprudência com IA. Encontre precedentes relevantes, analise decisões e fundamente suas teses jurídicas com base em tecnologia RAG.',
  keywords: ['jurisprudência', 'IA', 'direito', 'advocacia', 'legaltech'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'LegalAI',
  },
  formatDetection: {
    telephone: false,
  },
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
        {FB_PIXEL_ID && (
          <>
            <Script
              id="meta-pixel"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  !function(f,b,e,v,n,t,s){
                    if(f.fbq)return;n=f.fbq=function(){n.callMethod?
                    n.callMethod.apply(n,arguments):n.queue.push(arguments)};
                    if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
                    n.queue=[];t=b.createElement(e);t.async=!0;
                    t.src=v;s=b.getElementsByTagName(e)[0];
                    s.parentNode.insertBefore(t,s)
                  }(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
                  fbq('init','${FB_PIXEL_ID}');
                `.trim(),
              }}
            />
            <MetaPixelPageView />
          </>
        )}
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
