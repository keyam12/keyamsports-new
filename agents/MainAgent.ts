
import OpenAI from "openai";

export async function generateHeadline(sport: string, summary: string) {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const prompt = `Write a short, exciting ${sport} headline about: ${summary}`;

  const response = await client.responses.create({
    model: "gpt-4o-mini",
    input: prompt
  });

  // @ts-ignore
  return (response as any).output_text || JSON.stringify(response);
}
