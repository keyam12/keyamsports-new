// Shared LLM helper for the KEYAM SPORTS agent crew.
//
// Option A — OpenAI-only hybrid (one vendor, one API key):
//   - Scout / Stats / Editor → GPT-6 Luna  (cheap + fast, data extraction)
//   - Writer                → GPT-6.1 Sol  (editorial voice)
// Override per agent with env vars: KEYAM_MODEL_SCOUT, KEYAM_MODEL_WRITER,
// KEYAM_MODEL_STATS, KEYAM_MODEL_EDITOR.
//
// Real OpenAI calls only happen when OPENAI_API_KEY is set; otherwise the
// agents fall back to demo content so the page works without any setup.
import OpenAI from "openai";
import type { AgentId } from "./types";

let client: OpenAI | null = null;

const MODEL_DEFAULTS: Record<AgentId, string> = {
  scout: process.env.KEYAM_MODEL_SCOUT || "gpt-6-luna",
  writer: process.env.KEYAM_MODEL_WRITER || "gpt-6.1-sol",
  stats: process.env.KEYAM_MODEL_STATS || "gpt-6-luna",
  editor: process.env.KEYAM_MODEL_EDITOR || "gpt-6-luna",
};

export function hasApiKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/** Which model a given agent runs on (useful for logging / UI). */
export function modelFor(agent: AgentId): string {
  return MODEL_DEFAULTS[agent];
}

function getClient(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not set");
  }
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

export async function completeFor(
  agent: AgentId,
  prompt: string,
  system?: string
): Promise<string> {
  const res = await getClient().chat.completions.create({
    model: modelFor(agent),
    messages: [
      ...(system ? [{ role: "system" as const, content: system }] : []),
      { role: "user" as const, content: prompt },
    ],
    temperature: 0.8,
  });
  return res.choices[0]?.message?.content?.trim() || "";
}

/** Back-compat: defaults to the editor's model. */
export async function complete(prompt: string, system?: string): Promise<string> {
  return completeFor("editor", prompt, system);
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
