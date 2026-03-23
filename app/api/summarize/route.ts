import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const SUMMARY_SYSTEM_PROMPT = `You are a helpful assistant that summarises voice-call transcripts.
Given the conversation below, produce a concise, human-readable summary.

Format your response as JSON with exactly these keys:
{
  "overview": "<2-3 sentence high-level summary>",
  "key_points": ["<point 1>", "<point 2>", ...],
  "action_items": ["<item 1>", ...],
  "topics_discussed": ["<topic 1>", ...]
}

Only output valid JSON. No markdown fences, no extra text.`;

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: 'No conversation messages provided.' },
        { status: 400 }
      );
    }

    const convoText = messages
      .map((m: { role: string; content: string }) => `${m.role.toUpperCase()}: ${m.content}`)
      .join('\n');

    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? '');
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const result = await model.generateContent(
      `${SUMMARY_SYSTEM_PROMPT}\n\n${convoText}`
    );

    const raw = result.response.text().trim();

    try {
      return NextResponse.json(JSON.parse(raw));
    } catch {
      return NextResponse.json({
        overview: raw,
        key_points: [],
        action_items: [],
        topics_discussed: [],
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[summarize]', err);
    return NextResponse.json({ error: `Failed to generate summary: ${msg}` }, { status: 500 });
  }
}
