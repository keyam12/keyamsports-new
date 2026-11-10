// Legacy programmatic entry point. Importing this module has no side effects.
// Drafts are returned to the caller; never write to Vercel's ephemeral disk.
import { runCrew } from "./AgentRunner";
export async function runMainAgent() {
  if (process.env.KEYAM_ENABLE_AI !== "true") throw new Error("AI generation is disabled");
  return runCrew(() => {});
}
