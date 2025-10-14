import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function GET() {
  try {
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
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
