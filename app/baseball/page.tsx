import NewsCard from '../../components/NewsCard';
import AdSlot from '../../components/AdSlot';
import sample from '../../data/sample.json';

export default function Baseball() {
  const filtered = sample.articles.filter((a: any) => a.category === 'baseball');
  return (
    <div>
      <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-8 rounded-2xl shadow-lg mb-6">
        <h1 className="text-3xl font-bold">⚾ Baseball</h1>
        <p className="opacity-90">Diamond headlines, powered by AI</p>
      </div>
      <div className="space-y-4">
        {filtered.slice(0, 2).map((a: any, i: number) => (<NewsCard key={i} article={a} />))}
        <AdSlot slot="" format="infeed" label="In-feed · category" />
        {filtered.slice(2).map((a: any, i: number) => (<NewsCard key={i + 2} article={a} />))}
      </div>
    </div>
  );
}
