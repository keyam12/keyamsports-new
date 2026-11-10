import { getScores } from "../../../lib/sports/scores";
export const dynamic = "force-dynamic";
export async function GET() {
  return Response.json(await getScores(), { headers: { "Cache-Control": "no-store" } });
}
