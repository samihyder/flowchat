import { ImageResponse } from 'next/og';

/** PWA install icon (192x192) — reuses the same teal "F" mark as icon.tsx/apple-icon.tsx. */
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
          fontSize: 108,
          fontFamily: 'sans-serif',
        }}
      >
        F
      </div>
    ),
    { width: 192, height: 192 }
  );
}
