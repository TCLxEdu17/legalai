'use client';

import { cn } from '@/lib/utils';
import React, { ReactNode } from 'react';

interface AuroraBackgroundProps extends React.HTMLProps<HTMLDivElement> {
  children?: ReactNode;
  showRadialGradient?: boolean;
}

export const AuroraBackground = ({
  className,
  children,
  showRadialGradient = true,
  ...props
}: AuroraBackgroundProps) => {
  return (
    <div
      className={cn(
        'relative flex flex-col h-[100vh] items-center justify-center bg-white text-slate-950 transition-bg',
        className,
      )}
      {...props}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={cn(
            'absolute -inset-[10px] opacity-60',
            showRadialGradient &&
              '[mask-image:radial-gradient(ellipse_at_80%_0%,black_10%,transparent_70%)]',
          )}
          style={{
            background:
              'radial-gradient(ellipse 80% 60% at 70% -10%, #bfdbfe 0%, #c4b5fd 40%, transparent 70%)',
          }}
        />
      </div>
      {children}
    </div>
  );
};
