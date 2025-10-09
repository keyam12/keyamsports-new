
import sample from "../data/sample.json";

export default function LiveScoresWidget() {
  const games = sample.articles.slice(0, 3);
  return (
    <div className="border rounded p-4 bg-white">
      <h4 className="font-bold">Live Scores</h4>
      <div className="mt-3 space-y-3">
        {games.map((g: any, i: number) => (
          <div key={i} className="flex justify-between">
            <div>
              <div className="text-sm font-semibold">{g.category.toUpperCase()}</div>
              <div className="text-xs text-gray-600">Status: LIVE</div>
            </div>
            <div className="text-lg font-bold">1 - 0</div>
          </div>
        ))}
      </div>
    </div>
  );
}
