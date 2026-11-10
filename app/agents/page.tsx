import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAdmin } from "../../lib/adminAuth";
import AgentsConsole from "./AgentsConsole";

export const dynamic = "force-dynamic";
export const metadata = { title: "Editorial Agents — KEYAM SPORTS", robots: { index: false, follow: false } };
export default async function AgentsPage() {
  const incoming = await headers();
  if (!isAdmin(new Request("https://keyam.invalid/agents", { headers: incoming }))) redirect("/admin");
  return <AgentsConsole />;
}
