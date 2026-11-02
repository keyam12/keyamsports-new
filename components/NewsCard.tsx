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

export default function NewsCard({ article, featured = false }: { article: any; featured?: boolean }) {
  return (
    <article
      className={`border rounded-2xl bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-fade-up overflow-hidden ${
        featured ? 'p-7 ring-2 ring-primary/20 border-primary/30' : 'p-5'
      }`}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${CATEGORY_STYLE[article.category] || 'bg-gray-100 text-gray-600'}`}>
          {CATEGORY_EMOJI[article.category] || '📰'} {article.category}
        </span>
        {article.ai && (
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 text-violet-700">
            🤖 AI-generated
          </span>
        )}
        {article.date && <span className="text-xs text-gray-400 ml-auto">{article.date}</span>}
      </div>
      <h2 className={`font-bold mb-2 leading-snug ${featured ? 'text-2xl' : 'text-xl'}`}>{article.title}</h2>
      <p className={`text-gray-700 ${featured ? 'text-base' : 'text-[15px]'} leading-relaxed`}>{article.summary}</p>
    </article>
  );
}
