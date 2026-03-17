'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import * as THREE from 'three';

declare global {
  interface Window {
    THREE: typeof THREE;
    VANTA: { BIRDS: (opts: Record<string, unknown>) => { destroy(): void } };
  }
}

export function VantaBirds() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<{ destroy(): void } | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!scriptReady || !containerRef.current || effectRef.current) return;

    // Expõe THREE globalmente para que o vanta.birds.min.js possa usá-lo
    window.THREE = THREE;

    effectRef.current = window.VANTA.BIRDS({
      el: containerRef.current,
      mouseControls: true,
      touchControls: true,
      gyroControls: false,
      minHeight: 200,
      minWidth: 200,
      scale: 1.0,
      scaleMobile: 1.0,
      backgroundColor: 0x020818,
      color1: 0x2535ea,
      color2: 0x7c3aed,
      colorMode: 'lerpGradient',
      birdSize: 1.2,
      wingSpan: 22,
      speedLimit: 4,
      separation: 60,
      alignment: 50,
      cohesion: 50,
      quantity: 3,
    });

    return () => {
      effectRef.current?.destroy();
      effectRef.current = null;
    };
  }, [scriptReady]);

  return (
    <>
      <Script
        src="/vanta.birds.min.js"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
      />
      <div ref={containerRef} className="fixed inset-0 -z-10" aria-hidden="true" />
    </>
  );
}
