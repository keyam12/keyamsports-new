/** Read-only evidence retrieval. No arbitrary hosts, redirects or invented sources. */
const PRIMARY = ['nba.com','nfl.com','fifa.com','uefa.com','premierleague.com','laliga.com','manutd.com','fcbarcelona.com','realmadrid.com'];
const REPORTERS = ['espn.com','reuters.com','apnews.com','bbc.com','bbc.co.uk','sportsnet.ca'];
export interface Evidence { url: string; primary: boolean; relevant: boolean; publishedAt?: string; text: string; checkedAt: string; }
export interface Research { primaryVerified: boolean; evidence: Evidence[]; reasons: string[]; }
const matches = (host: string, domains: string[]) => domains.some(d => host === d || host.endsWith('.'+d));
export function permittedEvidenceUrl(value: string): boolean {
  try { const u=new URL(value); return u.protocol==='https:' && !u.username && !u.password && (!u.port || u.port==='443') && matches(u.hostname,[...PRIMARY,...REPORTERS]); }
  catch { return false; }
}
function plain(html: string) {
  return html.replace(/<(script|style|nav|footer|aside)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ')
    .replace(/&(?:amp|quot|apos|lt|gt|nbsp);/g,x=>({'&amp;':'&','&quot;':'"','&apos;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '}[x] || ' '))
    .replace(/\s+/g,' ').trim();
}
function structuredArticle(html: string, expectedHeading = ''): {headline?:string;articleBody?:string;datePublished?:string} | null {
  let remaining=200;
  const normalize=(value:string)=>plain(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const visit=(value:unknown,depth=0): {headline?:string;articleBody?:string;datePublished?:string} | null => {
    if(--remaining<0 || depth>8 || !value || typeof value!=='object')return null;
    if(Array.isArray(value)){for(const item of value){const found=visit(item,depth+1);if(found)return found;}return null;}
    const obj=value as Record<string,unknown>;
    const types=Array.isArray(obj['@type'])?obj['@type']:[obj['@type']];
    if(types.some(t=>['NewsArticle','Article','SportsArticle','ReportageNewsArticle'].includes(String(t))) && typeof obj.headline==='string' && obj.headline.trim().length>0 && (!expectedHeading || normalize(obj.headline).includes(normalize(expectedHeading)) || normalize(expectedHeading).includes(normalize(obj.headline)))) {
      return {headline:obj.headline,articleBody:typeof obj.articleBody==='string'?obj.articleBody:undefined,datePublished:typeof obj.datePublished==='string'?obj.datePublished:undefined};
    }
    for(const key of ['@graph','mainEntity']){const found=visit(obj[key],depth+1);if(found)return found;}
    return null;
  };
  for(const tag of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    if(tag[1].length>200_000)continue;
    try{const found=visit(JSON.parse(tag[1]));if(found)return found;}catch{/* malformed structured data is not evidence */}
  }
  return null;
}
export function evidenceFromHtml(url: string, html: string, topic: string): Evidence | null {
  const pageHeading=plain(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '');
  const structured = structuredArticle(html,pageHeading);
  const heading=pageHeading || plain(structured?.headline || '');
  const content=html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1] || html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1];
  if (!content && !structured?.articleBody) return null; // Navigation, snippets and headlines alone are not research.
  const text=plain(content || structured!.articleBody).slice(0,6500);
  if(text.length<150 || !heading) return null;
  const words=[...new Set(topic.toLowerCase().match(/[a-z]{4,}/g) || [])].filter(w=>!['confirmed','confirms','announces','announced','official','record','sports','today','after','before','against','coach','head','news','team'].includes(w));
  let publishedAt: string | undefined;
  for(const tag of html.match(/<meta\b[^>]*>/gi) || []) {
    if(!/(?:property|name)=["'](?:article:published_time|datePublished|pubdate)["']/i.test(tag))continue;
    const value=tag.match(/content=["']([^"']+)["']/i)?.[1];
    if(value && Number.isFinite(Date.parse(value))){publishedAt=new Date(value).toISOString();break;}
  }
  if(!publishedAt){const value=structured?.datePublished;if(value && Number.isFinite(Date.parse(value)))publishedAt=new Date(value).toISOString();}
  const relevant=words.filter(w=>heading.toLowerCase().includes(w)).length>=2;
  return {url,publishedAt,primary:matches(new URL(url).hostname,PRIMARY),relevant,text:heading+'\n'+text,checkedAt:new Date().toISOString()};
}
async function sourceHtml(url: string): Promise<{url:string;html:string}> {
  const signal=AbortSignal.timeout(7000);
  for(let redirects=0;redirects<3;redirects++) {
    if(!permittedEvidenceUrl(url)) throw new Error('Source not allowed');
    const response=await fetch(url,{redirect:'manual',cache:'no-store',signal});
    if([301,302,303,307,308].includes(response.status)) { url=new URL(response.headers.get('location') || '',url).href;continue; }
    if(response.status!==200 || !response.headers.get('content-type')?.includes('text/html') || !response.body) throw new Error('Source unavailable');
    const reader=response.body.getReader();let size=0;const chunks:Uint8Array[]=[];
    try { while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>750_000)throw new Error('Source too large');chunks.push(part.value);} }
    finally { await reader.cancel().catch(()=>{}); }
    return {url,html:Buffer.concat(chunks).toString('utf8')};
  }
  throw new Error('Redirect limit');
}
export async function researchStory(sources: string[], topic: string): Promise<Research> {
  const evidence:Evidence[]=[];const officialLinks=new Set<string>();
  const originals=await Promise.allSettled(sources.slice(0,3).map(sourceHtml));
  for(const result of originals){if(result.status!=='fulfilled')continue;const {url,html}=result.value;
    const item=evidenceFromHtml(url,html,topic);if(item?.relevant)evidence.push(item);
    for(const match of html.matchAll(/href=["']([^"'<>\s]+)["']/gi)){
      try {const link=new URL(match[1].replace(/&amp;/g,'&'), url);if(permittedEvidenceUrl(link.href) && matches(link.hostname,PRIMARY) && link.pathname.length>12 && !/privacy|terms|subscribe|login|ticket/i.test(link.pathname))officialLinks.add(link.href);}catch{}
    }
  }
  const extra=await Promise.allSettled([...officialLinks].slice(0,2).map(sourceHtml));
  for(const result of extra){if(result.status!=='fulfilled')continue;const item=evidenceFromHtml(result.value.url,result.value.html,topic);if(item?.relevant)evidence.push(item);}
  const unique=[...new Map(evidence.map(e=>[e.url,e])).values()].sort((a,b)=>Number(b.primary)-Number(a.primary)).slice(0,3);
  const primaryVerified=unique.some(e=>e.primary && e.relevant && e.publishedAt && Date.parse(e.publishedAt)<=Date.now() && Date.now()-Date.parse(e.publishedAt)<48*3600_000);
  return {primaryVerified,evidence:unique,reasons:primaryVerified?[]:['No accessible, relevant primary source verified; retain without publication.']};
}
