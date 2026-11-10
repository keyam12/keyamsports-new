export const dynamic = 'force-dynamic';
export const metadata = { title: 'Basketball — KEYAM SPORTS', description: 'Latest basketball coverage from KEYAM SPORTS.', alternates: { canonical: '/basketball' } };
import NewsCard from '../../components/NewsCard';
import AdSlot from '../../components/AdSlot';
import { getPublishedArticles } from '../../lib/articles';

export default async function Basketball() {
  const articles = await getPublishedArticles();
  const filtered = articles.filter((a: any) => a.category === 'basketball');
  return (
    <div>
      <div className="bg-gradient-to-r from-orange-500 to-red-600 text-white p-8 rounded-2xl shadow-lg mb-6">
        <h1 className="text-3xl font-bold">🏀 Basketball</h1>
        <p className="opacity-90">Hoops headlines, powered by AI</p>
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
