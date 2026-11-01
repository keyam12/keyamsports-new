import OpenAI from "openai";
import { NextResponse } from "next/server";
import { rateLimit, clientIp } from "../../../lib/rateLimit";

export const dynamic = "force-dynamic";

function getClient(): OpenAI {
  const apiKey =
    process.env.OPENAI_API_KEY ||
    process.env.KEYAMSPORTS_MUSE ||
    process.env.KEYAMSPORTS_MUSES;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  return new OpenAI({ apiKey });
}

export async function GET(req: Request) {
  const rl = rateLimit(`run-agent:${clientIp(req)}`, 10, 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Too many requests — slow down." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }
  try {
    const client = getClient();
    const prompt = `
    Generate a short AI-powered sports recap for KEYAM SPORTS.
    Include trending updates about NBA, MLB, NFL, or Soccer.
    Format like this:
    ---
    🏆 Headline: [title]
    📰 Recap: [2 short paragraphs]
    📊 Key Stat: [stat highlight]
    `;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
    });

    const output = response.choices[0].message?.content || 'No output';
    return NextResponse.json({ ok: true, text: output });
  } catch (error: any) {
    console.error('Agent error:', error);
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 500 }
    );
  }
}
