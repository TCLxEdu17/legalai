import { cn } from '@/lib/utils';

type LoaderSize = 'xs' | 'sm' | 'md' | 'lg';

const SIZES: Record<LoaderSize, number> = {
  xs: 20,   // inline buttons (replaces Loader2 w-4/w-3.5)
  sm: 32,   // small section states
  md: 56,   // medium section states
  lg: 96,   // full-page / large loading states
};

interface PlanetLoaderProps {
  size?: LoaderSize;
  className?: string;
}

export function PlanetLoader({ size = 'md', className }: PlanetLoaderProps) {
  const px = SIZES[size];
  return (
    <svg
      width={px}
      height={px}
      viewBox="0 0 240 240"
      className={cn('shrink-0', className)}
      aria-label="Carregando…"
      role="status"
    >
      <circle className="pl-ring-a" cx="120" cy="120" r="105" fill="none" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round" />
      <circle className="pl-ring-b" cx="120" cy="120" r="35"  fill="none" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round" />
      <circle className="pl-ring-c" cx="85"  cy="120" r="70"  fill="none" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round" />
      <circle className="pl-ring-d" cx="155" cy="120" r="70"  fill="none" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round" />
    </svg>
  );
}
