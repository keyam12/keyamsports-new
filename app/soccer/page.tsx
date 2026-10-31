import NewsCard from '../../components/NewsCard';
import sample from '../../data/sample.json';

export default function Soccer() {
  const filtered = sample.articles.filter((a: any) => a.category === 'soccer');
  return (
    <div>
      <div className="bg-gradient-to-r from-green-600 to-emerald-800 text-white p-8 rounded-2xl shadow-lg mb-6">
        <h1 className="text-3xl font-bold">⚽ Soccer</h1>
        <p className="opacity-90">Pitch headlines, powered by AI</p>
      </div>
      <div className="space-y-4">
        {filtered.map((a: any, i: number) => (<NewsCard key={i} article={a} />))}
      </div>
    </div>
  );
}
