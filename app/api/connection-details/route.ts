import { NextResponse } from 'next/server';
import { AccessToken, type AccessTokenOptions, type VideoGrant, RoomServiceClient } from 'livekit-server-sdk';
import { RoomConfiguration } from '@livekit/protocol';

type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export const revalidate = 0;

export async function POST(req: Request) {
  try {
    if (LIVEKIT_URL === undefined) throw new Error('LIVEKIT_URL is not defined');
    if (API_KEY === undefined) throw new Error('LIVEKIT_API_KEY is not defined');
    if (API_SECRET === undefined) throw new Error('LIVEKIT_API_SECRET is not defined');

    const body = await req.json();
    const agentName: string = body?.room_config?.agents?.[0]?.agent_name;

    const participantName = body?.name ?? 'user';
    // Use the supplied identity (user email/ID) or fall back to a random one
    const participantIdentity =
      body?.identity ?? `voice_assistant_user_${Math.floor(Math.random() * 10_000)}`;

    const safeIdentity = participantIdentity.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 40);
    const roomName = `voice_assistant_room_${safeIdentity}_${Date.now()}`;

    // Create the room with metadata BEFORE the agent joins
    // so ctx.room.metadata is populated when entrypoint() runs
    const roomService = new RoomServiceClient(
      LIVEKIT_URL,
      API_KEY,
      API_SECRET,
    );
    await roomService.createRoom({
      name: roomName,
      metadata: JSON.stringify({ user_id: participantIdentity }),
    });

    const participantToken = await createParticipantToken(
      { identity: participantIdentity, name: participantName },
      roomName,
      agentName,
    );

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName,
      participantToken,
      participantName,
    };

    return NextResponse.json(data, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
      return new NextResponse(error.message, { status: 500 });
    }
  }
}

function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string,
  agentName?: string,
): Promise<string> {
  const at = new AccessToken(API_KEY, API_SECRET, {
    ...userInfo,
    ttl: '15m',
  });
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  at.addGrant(grant);

  if (agentName) {
    at.roomConfig = new RoomConfiguration({
      agents: [{ agentName }],
    });
  }

  return at.toJwt();
}