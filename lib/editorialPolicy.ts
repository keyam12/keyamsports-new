import type { Research } from '../agents/ResearchAgent';
export interface EditorialDecision { decision: 'APPROVE'|'HOLD'; riskTier: 1|2|3; allClaimsSupported: boolean; contradictions: boolean; reasons: string[]; }
const SENSITIVE=/\b(alleg(?:ation|ed|edly)|arrest(?:ed)?|racis\w*|abuse|assault|lawsuit|criminal|betting|gambling|rigg\w*|injur\w*|concussion|diagnos\w*|suicid\w*|death|died|rumou?r\w*|unconfirmed|accus\w*|investigat\w*)\b/i;
export function publicationDecision(input: {topic:string;article:string;verdict:string;assessment?:Record<string,unknown>;research?:Research}): EditorialDecision {
  const a=input.assessment || {};const tier=a.riskTier;
  const reasons:string[]=[];
  if(SENSITIVE.test(input.topic+'\n'+input.article))reasons.push('Sensitive, uncertain or high-risk claims.');
  if(!input.research?.primaryVerified || !input.research.evidence.some(e=>e.primary && e.relevant && Number.isFinite(Date.parse(e.checkedAt)) && Date.now()-Date.parse(e.checkedAt)<15*60_000 && Date.parse(e.checkedAt)<=Date.now()))reasons.push('Fresh primary evidence not verified.');
  if(input.verdict!=='APPROVED' || a.decision!=='APPROVE')reasons.push('Senior Editor did not explicitly approve.');
  if(tier!==1 && tier!==2)reasons.push('Risk tier is not 1 or 2.');
  if(a.allClaimsSupported!==true || a.contradictions!==false)reasons.push('Unsupported or conflicting claims remain.');
  if(!['game_result','match_preview','player_performance','official_team_update'].includes(String(a.contentType)))reasons.push('Story type is not eligible.');
  return {decision:reasons.length?'HOLD':'APPROVE',riskTier:reasons.length?3:tier as 1|2,allClaimsSupported:a.allClaimsSupported===true,contradictions:a.contradictions!==false,reasons};
}
