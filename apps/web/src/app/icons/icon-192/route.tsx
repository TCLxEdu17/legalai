import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 192,
          height: 192,
          background: '#2535ea',
          borderRadius: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <rect x="15" y="7" width="2" height="16" rx="1" fill="white" />
          <rect x="10" y="23" width="12" height="2" rx="1" fill="white" />
          <rect x="7" y="9" width="18" height="1.5" rx="0.75" fill="white" />
          <path d="M7.5 11 Q9.5 15 11.5 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <line x1="7.5" y1="11" x2="7" y2="10.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="11.5" y1="11" x2="12" y2="10.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M20.5 11 Q22.5 15 24.5 11" stroke="white" strokeWidth="1.5" strokeLinecap="round" fill="none" />
          <line x1="20.5" y1="11" x2="20" y2="10.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          <line x1="24.5" y1="11" x2="25" y2="10.5" stroke="white" strokeWidth="1.2" strokeLinecap="round" />
          <circle cx="16" cy="7" r="1.5" fill="#96aeff" />
        </svg>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
