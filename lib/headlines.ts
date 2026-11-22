// Existing ESPN discovery integration. Commercial permissions are not implied.
export interface Headline {
  sport: string; headline: string; description: string; link: string; published: string; providerId?: string;
}
export interface FeedObservation { id: string; available: boolean; accepted: number; error: string | null; }
export interface HeadlineBatch { headlines: Headline[]; feeds: FeedObservation[]; }
const FEEDS = [
  { id:'espn:nba',sport:'NBA',url:'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/news?limit=6' },
  { id:'espn:nfl',sport:'NFL',url:'https://site.api.espn.com/apis/site/v2/sports/football/nfl/news?limit=6' },
  { id:'espn:mlb',sport:'MLB',url:'https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/news?limit=6' },
  { id:'espn:soccer',sport:'Soccer',url:'https://site.api.espn.com/apis/site/v2/sports/soccer/eng.1/news?limit=6' },
];
export function validateHeadline(value:Headline): boolean {
  try {
    const u=new URL(value.link);const time=Date.parse(value.published);
    return ['NBA','NFL','MLB','Soccer'].includes(value.sport) && value.headline.trim().length>0 && value.headline.length<=500 &&
      value.description.length<=4000 && value.link.length<=2048 && u.protocol==='https:' && !u.username && !u.password && !u.port &&
      (u.hostname==='espn.com'||u.hostname.endsWith('.espn.com')) && Number.isFinite(time) && time<=Date.now() && Date.now()-time<48*3600_000;
  } catch {return false;}
}
async function fetchFeed(feed:typeof FEEDS[number]):Promise<HeadlineBatch> {
  try {
    const response=await fetch(feed.url,{cache:'no-store',signal:AbortSignal.timeout(7000)});
    if(!response.ok)throw new Error('UPSTREAM_HTTP_'+response.status);
    const data=await response.json();
    if(!Array.isArray(data?.articles))throw new Error('INVALID_FEED');
    const headlines:Headline[]=data.articles.slice(0,6).map((a:any)=>({sport:feed.sport,providerId:feed.id,
      headline:String(a.headline||'').trim(),description:String(a.description||'').trim(),link:String(a.links?.web?.href||''),published:String(a.published||'')})).filter(validateHeadline);
    return {headlines,feeds:[{id:feed.id,available:true,accepted:headlines.length,error:null}]};
  }catch(error){
    const code=error instanceof Error && /^(UPSTREAM_HTTP_\d+|INVALID_FEED)$/.test(error.message)?error.message:'FETCH_FAILED';
    return {headlines:[],feeds:[{id:feed.id,available:false,accepted:0,error:code}]};
  }
}
export async function getHeadlineBatch(sport?:string):Promise<HeadlineBatch> {
  const batch=await Promise.all((sport?FEEDS.filter(f=>f.sport===sport):FEEDS).map(fetchFeed));
  return {headlines:batch.flatMap(b=>b.headlines),feeds:batch.flatMap(b=>b.feeds)};
}
export async function getHeadlines(sport?:string):Promise<Headline[]> {return (await getHeadlineBatch(sport)).headlines;}
export function formatHeadlines(headlines:Headline[]):string {
  return headlines.map((h,i)=>`${i+1}. [${h.sport}] ${h.headline}${h.description?' — '+h.description:''}\n   Source: ${h.link}`).join('\n');
}
