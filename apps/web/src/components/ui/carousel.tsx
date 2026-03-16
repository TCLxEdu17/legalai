'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CarouselProps {
  items: React.ReactNode[];
  className?: string;
  autoPlay?: boolean;
  showDots?: boolean;
  showArrows?: boolean;
}

export function Carousel({
  items,
  className,
  showDots = true,
  showArrows = true,
}: CarouselProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const dragStart = useRef<number | null>(null);

  function go(next: number) {
    const clamped = (next + items.length) % items.length;
    setDirection(next > index ? 1 : -1);
    setIndex(clamped);
  }

  const variants = {
    enter: (d: number) => ({ x: d > 0 ? '60%' : '-60%', opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? '-60%' : '60%', opacity: 0 }),
  };

  return (
    <div className={cn('relative select-none', className)}>
      {/* Viewport */}
      <div className="overflow-hidden rounded-xl">
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={index}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.35, ease: 'easeInOut' }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            onDragStart={(_, info) => { dragStart.current = info.point.x; }}
            onDragEnd={(_, info) => {
              if (!dragStart.current) return;
              const delta = info.point.x - dragStart.current;
              if (Math.abs(delta) > 40) go(delta < 0 ? index + 1 : index - 1);
              dragStart.current = null;
            }}
          >
            {items[index]}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Arrows */}
      {showArrows && items.length > 1 && (
        <>
          <button
            onClick={() => go(index - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => go(index + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 flex items-center justify-center bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors z-10"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      )}

      {/* Dots */}
      {showDots && items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => go(i)}
              className={cn(
                'rounded-full transition-all',
                i === index ? 'w-4 h-1.5 bg-brand-400' : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40',
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
