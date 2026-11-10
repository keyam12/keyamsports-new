export const dynamic = 'force-dynamic';
export const metadata = { title: 'Baseball — KEYAM SPORTS', description: 'Latest baseball coverage from KEYAM SPORTS.', alternates: { canonical: '/baseball' } };
import NewsCard from '../../components/NewsCard';
import AdSlot from '../../components/AdSlot';
import { getPublishedArticles } from '../../lib/articles';

export default async function Baseball() {
  const articles = await getPublishedArticles();
  const filtered = articles.filter((a: any) => a.category === 'baseball');
  return (
    <div>
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-8 rounded-2xl shadow-lg mb-6">
        <h1 className="text-3xl font-bold">⚾ Baseball</h1>
        <p className="opacity-90">Diamond headlines, powered by AI</p>
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
