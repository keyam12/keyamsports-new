import { AsyncLocalStorage } from "node:async_hooks";
import type { AgentId } from "./types";
export interface ModelUsage {
  agent: AgentId; model: string; inputTokens: number; outputTokens: number; incomplete: boolean;
}
interface RunBudget { calls: number; accountingFailed?: boolean; record: (usage: ModelUsage) => Promise<void>; }
const budgets = new AsyncLocalStorage<RunBudget>();
export function withUsageTracking<T>(record: RunBudget["record"], run: () => Promise<T>): Promise<T> {
  const budget: RunBudget = { calls: 0, record };
  return budgets.run(budget, async () => {
    const result = await run();
    if (budget.accountingFailed) throw new Error("Usage accounting unavailable");
    return result;
  });
}
export function reserveModelCall(prompt: string, system: string) {
  if (Buffer.byteLength(prompt, "utf8") > 16_000 || Buffer.byteLength(system, "utf8") > 2_000) {
    throw new Error("Model input limit exceeded");
  }
  const budget = budgets.getStore();
  if (budget?.accountingFailed) throw new Error("Usage accounting unavailable");
  if (budget && ++budget.calls > 10) throw new Error("Model call limit exceeded");
}
export async function recordModelUsage(usage: ModelUsage) {
  const budget = budgets.getStore();
  if (!budget) return;
  try { await budget.record(usage); }
  catch (error) { budget.accountingFailed = true; throw error; }
}
