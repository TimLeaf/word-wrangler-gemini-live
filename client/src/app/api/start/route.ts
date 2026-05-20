import { NextRequest, NextResponse } from 'next/server';
import { PERSONALITY_PRESETS, PersonalityType } from '@/types/personality';

const VALID_PERSONALITIES = Object.keys(PERSONALITY_PRESETS) as PersonalityType[];

function isValidPersonality(value: unknown): value is PersonalityType {
  return (
    typeof value === 'string' &&
    (VALID_PERSONALITIES as readonly string[]).includes(value)
  );
}

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  if (typeof payload !== 'object' || payload === null) {
    return NextResponse.json(
      { error: 'Request body must be an object' },
      { status: 400 }
    );
  }

  const { personality } = payload as { personality?: unknown };

  if (!isValidPersonality(personality)) {
    return NextResponse.json(
      {
        error: `Invalid personality. Must be one of: ${VALID_PERSONALITIES.join(', ')}`,
      },
      { status: 400 }
    );
  }

  const botStartUrl =
    process.env.BOT_START_URL || 'http://localhost:7860/start';

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (process.env.BOT_START_PUBLIC_API_KEY) {
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
