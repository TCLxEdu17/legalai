'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

export function VantaBirds() {
  const containerRef = useRef<HTMLDivElement>(null);
  const effectRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    import('vanta/dist/vanta.birds.min').then((mod) => {
      if (cancelled || !containerRef.current) return;
      const VANTA = mod.default ?? mod;
      effectRef.current = VANTA({
        el: containerRef.current,
        THREE,
        mouseControls: true,
        touchControls: true,
        gyroControls: false,
        minHeight: 200,
        minWidth: 200,
        scale: 1.0,
        scaleMobile: 1.0,
        // Dark navy theme to match landing page
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
    });

    return () => {
      cancelled = true;
      effectRef.current?.destroy?.();
      effectRef.current = null;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 -z-10"
      aria-hidden="true"
    />
  );
}
