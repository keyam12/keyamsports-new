// Shared types for the KEYAM SPORTS independent AI agents.

export type AgentId = "scout" | "writer" | "stats" | "editor";

export type AgentStatus = "idle" | "running" | "done" | "failed";

export type AgentEventType =
  | "agent_started"
  | "agent_log"
  | "agent_done"
  | "agent_failed"
  | "run_done";

export interface AgentEvent {
  type: AgentEventType;
  agent?: AgentId;
  message: string;
  /** Carries the final RunContext on run_done */
  payload?: unknown;
  at: string;
}

export type EmitFn = (event: Omit<AgentEvent, "at">) => void;

export interface RunContext {
  /** Topic chosen by the scout */
  topic: string;
  /** Raw findings from the scout */
  findings: string;
  /** Recap written by the writer */
  recap: string;
  /** Stat highlight from the stats agent */
  stats: string;
  /** Final article assembled by the editor */
  article: string;
  /** True when no OPENAI_API_KEY is set — agents use demo content */
  demo: boolean;
}

export interface AgentMeta {
  id: AgentId;
  name: string;
  role: string;
  emoji: string;
}

export const AGENT_META: Record<AgentId, AgentMeta> = {
  scout: { id: "scout", name: "Scout", role: "Finds the top sports storyline", emoji: "🔭" },
  writer: { id: "writer", name: "Writer", role: "Writes the recap", emoji: "✍️" },
  stats: { id: "stats", name: "Stats", role: "Digs up the key numbers", emoji: "📊" },
  editor: { id: "editor", name: "Editor", role: "Assembles the final article", emoji: "📰" },
};
