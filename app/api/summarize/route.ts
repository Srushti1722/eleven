import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

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

    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SUMMARY_SYSTEM_PROMPT },
        { role: 'user', content: convoText },
      ],
      temperature: 0.3,
      max_tokens: 600,
    });

    const raw = response.choices[0].message.content?.trim() ?? '';

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
    console.error('[summarize]', err);
    return NextResponse.json({ error: 'Failed to generate summary.' }, { status: 500 });
  }
}
