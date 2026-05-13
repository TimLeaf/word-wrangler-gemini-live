import { GoogleAuth } from 'google-auth-library';
import { NextRequest, NextResponse } from 'next/server';

let cachedAuth: GoogleAuth | null = null;

async function fetchIdToken(targetUrl: string): Promise<string> {
  if (!cachedAuth) {
    cachedAuth = new GoogleAuth();
  }
  const audience = new URL(targetUrl).origin;
  const client = await cachedAuth.getIdTokenClient(audience);
  return client.idTokenProvider.fetchIdToken(audience);
}

export async function POST(request: NextRequest) {
  const { personality } = await request.json();
  const botStartUrl =
    process.env.BOT_START_URL || 'http://localhost:7860/start';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (
      process.env.NODE_ENV === 'production' &&
      botStartUrl.startsWith('https://')
    ) {
      const idToken = await fetchIdToken(botStartUrl);
      headers.Authorization = `Bearer ${idToken}`;
    } else if (process.env.BOT_START_PUBLIC_API_KEY) {
      headers.Authorization = `Bearer ${process.env.BOT_START_PUBLIC_API_KEY}`;
    }

    const response = await fetch(botStartUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        createDailyRoom: true,
        dailyRoomProperties: { start_video_off: true },
        body: {
          personality,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to connect to Pipecat: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: `Failed to process connection request: ${error}` },
      { status: 500 }
    );
  }
}
