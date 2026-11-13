import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { getPublishedArticles } from '../../../lib/articles';
import { articlePath } from '../../../lib/articleUrls';
export const dynamic='force-dynamic';
async function lookup(slug:string) {
  const id=slug.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})$/i)?.[1];
  if(!id)return null;
  return (await getPublishedArticles()).find(a=>a.id===id) || null;
}
export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata> {
  const article=await lookup((await params).slug);
  if(!article)return {title:'Article unavailable',robots:{index:false,follow:false}};
  const description=article.summary.replace(/\s+/g,' ').slice(0,160);
  return {title:`${article.title} — KEYAM SPORTS`,description,alternates:{canonical:articlePath(article)},
    openGraph:{title:article.title,description,type:'article'},twitter:{card:'summary',title:article.title,description}};
}
export default async function ArticlePage({params}:{params:Promise<{slug:string}>}) {
  const {slug}=await params;const article=await lookup(slug);if(!article)notFound();
  const path=articlePath(article)!;if(path!==`/news/${slug}`)redirect(path);
  const origin=(process.env.NEXT_PUBLIC_SITE_URL || 'https://keyamsports-new.vercel.app').replace(/\/$/,'');
  const schema={'@context':'https://schema.org','@type':'NewsArticle',headline:article.title,datePublished:article.date,
    mainEntityOfPage:origin+path,author:{'@type':'Organization',name:'KEYAM SPORTS'},publisher:{'@type':'Organization',name:'KEYAM SPORTS'},citation:article.sources || []};
  return <article data-article-id={article.id} className="bg-white border rounded-2xl p-6 md:p-8 shadow-sm max-w-3xl mx-auto">
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(schema).replace(/</g,'\\u003c')}} />
    <Link href={`/${article.category}`} className="text-sm text-primary hover:underline">{article.category}</Link>
    <h1 className="text-3xl md:text-4xl font-bold mt-3 mb-4 leading-tight">{article.title}</h1>
    <p className="text-sm text-gray-500 mb-6">KEYAM SPORTS · <time dateTime={article.date}>{article.date}</time>{article.ai ? ' · Asistido por IA' : ''}</p>
    <div className="text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{article.summary}</div>
    {!!article.sources?.length && <section className="border-t mt-6 pt-4"><h2 className="font-bold mb-2">Fuentes</h2><ul className="space-y-2">{article.sources.map(url=><li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="text-primary text-sm break-all hover:underline">{url}</a></li>)}</ul></section>}
  </article>;
}
