// 📰 Editor — assembles the final KEYAM SPORTS article.
import type { EmitFn, RunContext } from "./types";
import { completeFor, hasApiKey, sleep } from "./llm";

export async function runEditor(
  ctx: Pick<RunContext, "topic" | "recap" | "stats" | "demo" | "sources">,
  emit: EmitFn
): Promise<string> {
  emit({ type: "agent_started", agent: "editor", message: "Editor is assembling the final article…" });
  await sleep(800);

  const date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let headline: string;
  if (hasApiKey()) {
    emit({ type: "agent_log", agent: "editor", message: "Writing the headline with AI…" });
    headline = await completeFor("editor",
      `Write ONE punchy sports headline (max 10 words) for: ${ctx.topic}. No quotes, no emoji.`
    );
  } else {
    headline = `${ctx.topic}: the story everyone's talking about`;
  }

  const demoNote = ctx.demo
    ? `\n\n⚠️ DEMO MODE — this is simulated content, not real news. Add OPENAI_API_KEY to generate real AI content.`
    : "";

  const sourcesBlock =
    ctx.sources && ctx.sources.length > 0
      ? `\n\nSources:\n${ctx.sources.map((s) => `- ${s}`).join("\n")}`
      : "";

  const article =
    `${headline}\n` +
    `KEYAM SPORTS • ${date}\n\n` +
    `${ctx.recap}\n\n` +
    `Key statistic: ${ctx.stats}` +
    sourcesBlock +
    demoNote;

  await sleep(500);
  emit({ type: "agent_done", agent: "editor", message: "Draft assembled for editorial review." });
  return article;
}
