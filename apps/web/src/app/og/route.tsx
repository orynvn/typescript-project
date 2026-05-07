import { ImageResponse } from 'next/og';

export const runtime = 'edge';

export async function GET(request: Request): Promise<ImageResponse> {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || process.env.NEXT_PUBLIC_APP_NAME || 'MyApp';

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        background: 'linear-gradient(135deg, #0f172a, #2563eb)',
        color: 'white',
        padding: 40,
        fontSize: 52,
        fontWeight: 700,
        textAlign: 'center',
      }}
    >
      <div>{title}</div>
    </div>,
    {
      width: 1200,
      height: 630,
    },
  );
}
