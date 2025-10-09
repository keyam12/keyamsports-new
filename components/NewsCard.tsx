
export default function NewsCard({ article }: any) {
  return (
    <div className="border p-4 rounded-lg bg-white shadow-sm hover:shadow-md transition">
      <h2 className="text-xl font-bold mb-2">{article.title}</h2>
      <p className="text-gray-700">{article.summary}</p>
      <p className="text-sm text-gray-500 mt-2">Category: {article.category}</p>
    </div>
  );
}
