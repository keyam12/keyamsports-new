-- A freshly fetched old announcement is not fresh reporting. Missing dates retain the story.
create or replace function public.decide_agent_publication(p_job uuid, p_url text) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare j public.agent_jobs; a public.articles; p public.agent_publications; approved boolean;
begin
  select * into j from public.agent_jobs where id=p_job for update;
  if not found or j.article_id is null or j.state not in ('needs_review','duplicate') then raise exception 'No completed article for publication';end if;
  select * into p from public.agent_publications where job_id=p_job;
  if found then return to_jsonb(p);end if;
  select * into a from public.articles where id=j.article_id for update;
  approved := j.state='needs_review' and a.status='draft'
    and j.context->>'seniorEditorVerdict'='APPROVED'
    and j.context#>>'{automation,decision}'='APPROVE'
    and j.context#>>'{automation,riskTier}' in ('1','2')
    and j.context#>>'{automation,allClaimsSupported}'='true'
    and j.context#>>'{automation,contradictions}'='false'
    and j.context#>>'{research,primaryVerified}'='true'
    and exists(select 1 from jsonb_array_elements(j.context#>'{research,evidence}') e
      where e->>'primary'='true' and e->>'relevant'='true'
      and (e->>'publishedAt')::timestamptz between now()-interval '48 hours' and now()
      and (e->>'checkedAt')::timestamptz between now()-interval '15 minutes' and now())
    and a.category=j.context->>'category'
    and a.sources=array(select jsonb_array_elements_text(j.context->'sources'))
    and a.summary=trim(j.context->>'article')
    and a.title=trim(split_part(j.context->>'article',chr(10),1))
    and p_url like 'https://keyamsports-new.vercel.app/news/%'
    and right(p_url,36)=a.id::text;
  if coalesce(approved,false) then
    update public.articles set status='published' where id=a.id and status='draft';
    insert into public.agent_publications(job_id,article_id,state,risk_tier,public_url)
      values(j.id,a.id,'pending',(j.context#>>'{automation,riskTier}')::integer,p_url) returning * into p;
  else
    insert into public.agent_publications(job_id,article_id,state,risk_tier,reasons)
      values(j.id,a.id,'hold',3,case when jsonb_array_length(coalesce(j.context#>'{automation,reasons}','[]'::jsonb))>0 then j.context#>'{automation,reasons}' else '["Editorial checks, source freshness or unchanged-article check not satisfied."]'::jsonb end) returning * into p;
    insert into public.agent_alerts(job_id,code,message) values(j.id,'EDITORIAL_HOLD','Publication retained by automated editorial policy; inspect evidence and recorded reasons.') on conflict do nothing;
  end if;
  return to_jsonb(p);
end $$;
