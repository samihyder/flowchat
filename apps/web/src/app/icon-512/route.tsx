import { ImageResponse } from 'next/og';

/** PWA install icon (512x512, also used as the maskable icon) — same mark as icon-192/route.tsx. */
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: 'linear-gradient(135deg, #2DD4BF 0%, #06B6D4 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: 700,
          fontSize: 288,
          fontFamily: 'sans-serif',
        }}
      >
        F
      </div>
    ),
    { width: 512, height: 512 }
  );
}
