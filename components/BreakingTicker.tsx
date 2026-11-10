import { getPublishedArticles } from '../lib/articles';

export default async function BreakingTicker() {
  const articles = await getPublishedArticles();
  const text = articles[0]?.title || 'KEYAM SPORTS — 24/7 AI — Never Miss Anything ⚡️';
  const loop = `${text}   •   ${text}   •   `;
  return (
    <div className="bg-gray-900 text-white overflow-hidden">
      <div className="flex items-stretch">
        <span className="bg-red-600 px-3 py-1.5 text-xs font-extrabold tracking-wider shrink-0 z-10 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
          HEADLINES
        </span>
        <div className="relative flex-1 overflow-hidden">
          <div className="animate-marquee whitespace-nowrap py-1.5 text-sm inline-block will-change-transform">{loop}</div>
        </div>
      </div>
    </div>
  );
}
