import Icon from '../../components/Icon';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Football — KEYAM SPORTS', description: 'Latest football coverage from KEYAM SPORTS.', alternates: { canonical: '/football' } };
import NewsCard from '../../components/NewsCard';
import AdSlot from '../../components/AdSlot';
import { getPublishedArticles } from '../../lib/articles';

export default async function Football() {
  const articles = await getPublishedArticles();
  const filtered = articles.filter((a: any) => a.category === 'football');
  return (
    <div>
      <div className="bg-gradient-to-r from-green-700 to-emerald-600 text-white p-8 rounded-2xl shadow-lg mb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold"><Icon name="football" className="h-7 w-7" />Football</h1>
        <p className="opacity-90">NFL headlines, powered by AI</p>
      </div>
      <div className="space-y-4">
        {filtered.length === 0 && <p className="text-gray-500 bg-white border rounded-2xl p-5">No published stories in this section yet.</p>}
        {filtered.slice(0, 2).map((a: any, i: number) => (<NewsCard key={a.id} article={a} />))}
        <AdSlot slot="" format="infeed" label="In-feed · category" />
        {filtered.slice(2).map((a: any, i: number) => (<NewsCard key={a.id} article={a} />))}
      </div>
    </div>
  );
}
