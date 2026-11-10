import Icon, { sportIconName } from './Icon';

/** Shows a clean domain name (reuters.com) instead of the raw URL. */
function sourceLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function NewsCard({ article, featured = false }: { article: any; featured?: boolean }) {
  return (
    <article
      className={`border rounded-2xl bg-white shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-fade-up overflow-hidden ${
        featured ? 'p-7 ring-2 ring-primary/20 border-primary/30' : 'p-5'
      }`}
    >
      <div className="flex items-center gap-2 mb-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-gray-700">
          <Icon name={sportIconName(article.category)} className="h-4 w-4 text-primary" /> {article.category}
        </span>
        {article.ai && (
          <span className="text-xs font-medium text-gray-500">
            Asistido por IA
          </span>
        )}
        {article.date && <time dateTime={article.date} className="text-xs text-gray-500 ml-auto">{article.date}</time>}
      </div>
      <h2 className={`font-bold mb-2 leading-snug ${featured ? 'text-2xl' : 'text-xl'}`}>{article.title}</h2>
      <p className={`text-gray-700 ${featured ? 'text-base' : 'text-[15px]'} leading-relaxed`}>{article.summary}</p>
      {article.sources?.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-1"><Icon name="link" className="h-3.5 w-3.5" /> Fuentes</p>
          <ul className="flex flex-wrap gap-x-3 gap-y-1">
            {article.sources.map((s: string, i: number) => (
              <li key={i}>
                <a href={s} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline">
                  {sourceLabel(s)}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}
