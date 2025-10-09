
import NewsCard from '../../components/NewsCard';
import sample from '../../data/sample.json';

export default function Soccer() {
  const filtered = sample.articles.filter((a: any) => a.category === 'soccer');
  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Soccer</h1>
      <div className="space-y-4">
        {filtered.map((a: any, i: number) => (<NewsCard key={i} article={a} />))}
      </div>
    </div>
  );
}
