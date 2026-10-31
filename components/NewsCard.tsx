const CATEGORY_STYLE: Record<string, string> = {
  basketball: 'bg-orange-100 text-orange-700',
  baseball: 'bg-red-100 text-red-700',
  soccer: 'bg-green-100 text-green-700',
};

const CATEGORY_EMOJI: Record<string, string> = {
  basketball: '🏀',
  baseball: '⚾',
  soccer: '⚽',
};

export default function NewsCard({ article }: any) {
  return (
    <div className="border p-5 rounded-2xl bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
      <div className="flex items-center gap-2 mb-2">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_STYLE[article.category] || 'bg-gray-100 text-gray-600'}`}>
          {CATEGORY_EMOJI[article.category] || '📰'} {article.category}
        </span>
      </div>
      <h2 className="text-xl font-bold mb-2">{article.title}</h2>
      <p className="text-gray-700">{article.summary}</p>
    </div>
  );
}
