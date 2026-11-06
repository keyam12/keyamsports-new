import NewsCard from '../../components/NewsCard';
import AdSlot from '../../components/AdSlot';
import { getPublishedArticles } from '../../lib/articles';

export default async function Football() {
  const articles = await getPublishedArticles();
  const filtered = articles.filter((a: any) => a.category === 'football');
  return (
    <div>
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white p-8 rounded-2xl shadow-lg mb-6">
        <h1 className="text-3xl font-bold">🏈 Football</h1>
        <p className="opacity-90">NFL headlines, powered by AI</p>
      </div>
      <div className="space-y-4">
        {filtered.slice(0, 2).map((a: any, i: number) => (<NewsCard key={i} article={a} />))}
        <AdSlot slot="" format="infeed" label="In-feed · category" />
        {filtered.slice(2).map((a: any, i: number) => (<NewsCard key={i + 2} article={a} />))}
      </div>
    </div>
  );
}
