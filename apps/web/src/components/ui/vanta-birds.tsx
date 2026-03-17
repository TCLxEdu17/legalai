'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function VantaBirds() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<{ destroy(): void } | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // THREE precisa estar global para o vanta
    (window as any).THREE = THREE;

    const script = document.createElement('script');
    script.src = '/vanta.birds.min.js';
    script.async = true;

    script.onload = () => {
      if (!containerRef.current) return;
      const VantaEffect = (window as any)._vantaEffect;
      if (!VantaEffect) return;

      effectRef.current = VantaEffect({
        el: containerRef.current,
        THREE,
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
    };

    document.head.appendChild(script);

    return () => {
      effectRef.current?.destroy();
      effectRef.current = null;
      script.remove();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  );
}
