-- Additive publication audit. Existing publications and credentials are unchanged.
create table public.agent_publications (
  job_id uuid primary key references public.agent_jobs(id),
  article_id uuid not null references public.articles(id),
  state text not null check(state in ('hold','pending','published','failed')),
  risk_tier integer not null check(risk_tier between 1 and 3),
  reasons jsonb not null default '[]',
  public_url text,
  verified_at timestamptz,
  verification_attempts integer not null default 0 check(verification_attempts between 0 and 3),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.agent_alerts (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.agent_jobs(id),
  code text not null,
  message text not null,
  created_at timestamptz not null default now(),
  unique(job_id,code)
);
alter table public.agent_publications enable row level security;
alter table public.agent_alerts enable row level security;
revoke all on public.agent_publications, public.agent_alerts from public,anon,authenticated;
grant all on public.agent_publications, public.agent_alerts to service_role;

create function public.decide_agent_publication(p_job uuid, p_url text) returns jsonb
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
create function public.reserve_publication_verification(p_job uuid) returns boolean
language plpgsql set search_path=public,pg_temp as $$
declare n integer;
begin
  update public.agent_publications set verification_attempts=verification_attempts+1,updated_at=now()
    where job_id=p_job and state='pending' and verification_attempts<3;
  get diagnostics n=row_count;
  return n=1;
end $$;
create function public.verify_agent_publication(p_job uuid,p_ok boolean) returns jsonb
language plpgsql set search_path=public,pg_temp as $$
declare n integer;
begin
  update public.agent_publications set state=case when p_ok then 'published' else 'failed' end,
    verified_at=case when p_ok then now() else null end,updated_at=now()
    where job_id=p_job and (state='pending' or (p_ok and state='failed'));
  get diagnostics n=row_count;
  if not p_ok and n>0 then
    insert into public.agent_alerts(job_id,code,message) values(p_job,'PUBLIC_URL_FAILED','Public URL verification failed after three attempts; article was not deleted or bulk-unpublished.') on conflict do nothing;
  end if;
  return (select to_jsonb(p) from public.agent_publications p where job_id=p_job);
end $$;
revoke all on function public.decide_agent_publication(uuid,text),public.verify_agent_publication(uuid,boolean),public.reserve_publication_verification(uuid) from public,anon,authenticated;
grant execute on function public.decide_agent_publication(uuid,text),public.verify_agent_publication(uuid,boolean),public.reserve_publication_verification(uuid) to service_role;

create or replace function public.fail_agent_job(p_id uuid, p_lease uuid) returns void
language plpgsql set search_path=public,pg_temp as $$
begin
  update public.agent_jobs set state='failed',error_code='GENERATION_OR_STORAGE_FAILED',updated_at=now()
    where id=p_id and lease=p_lease and state='running';
  if exists(select 1 from public.agent_jobs where id=p_id and lease=p_lease) then
    insert into public.agent_alerts(job_id,code,message) values(p_id,'EDITORIAL_RUN_FAILED','Editorial generation or storage failed. Consult the job and publication audit; existing publications were not removed.') on conflict do nothing;
  end if;
end $$;
