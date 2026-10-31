// Small helper shared by the agents: real OpenAI calls when an API key
// is configured, otherwise the agents fall back to demo content so the
// page works live without any setup.
import OpenAI from "openai";

let client: OpenAI | null = null;

export function hasApiKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export async function complete(prompt: string, system?: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  const res = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user" as const, content: prompt },
    ],
    temperature: 0.8,
  });
  return res.choices[0]?.message?.content?.trim() || "";
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
