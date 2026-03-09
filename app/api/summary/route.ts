import { NextRequest, NextResponse } from 'next/server';

const AGENT_SERVER_URL = process.env.AGENT_SERVER_URL ?? 'http://localhost:8080';

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get('room');

  if (!room) {
    return NextResponse.json({ error: "Missing 'room' query parameter" }, { status: 400 });
  }

  try {
    const upstream = await fetch(`${AGENT_SERVER_URL}/summary?room=${encodeURIComponent(room)}`, {
      cache: 'no-store',
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (err) {
    console.error('[summary proxy] Failed to reach agent server:', err);
    return NextResponse.json({ error: 'Could not reach agent server' }, { status: 502 });
  }
}
