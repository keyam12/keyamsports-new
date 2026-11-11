-- Private, additive infrastructure. No automatic publication or new service.
create table public.agent_daily_usage (
  day date primary key,
  runs integer not null default 0 check (runs >= 0),
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0
);
create table public.agent_jobs (
  id uuid primary key default gen_random_uuid(),
  job_key text not null unique check (length(job_key) between 1 and 100),
  state text not null check (state in ('running','needs_review','duplicate','failed')),
  attempts integer not null default 1 check (attempts between 1 and 3),
  lease uuid not null default gen_random_uuid(),
  lease_until timestamptz not null default now() + interval '10 minutes',
  usage_day date not null default (now() at time zone 'UTC')::date,
  article_id uuid references public.articles(id) on delete set null,
  context jsonb,
  error_code text,
  usage jsonb not null default '[]',
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  usage_incomplete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.private_rate_limits (
  key_hash text primary key,
  count integer not null,
  expires_at timestamptz not null
);
alter table public.agent_daily_usage enable row level security;
alter table public.agent_jobs enable row level security;
alter table public.private_rate_limits enable row level security;
revoke all on public.agent_daily_usage, public.agent_jobs, public.private_rate_limits from public, anon, authenticated;
grant all on public.agent_daily_usage, public.agent_jobs, public.private_rate_limits to service_role;

create function public.claim_agent_job(p_key text, p_limit integer) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare j public.agent_jobs; d date := (now() at time zone 'UTC')::date; n integer;
begin
  if p_key !~ '^[a-zA-Z0-9:_-]{1,100}$' or p_limit not between 1 and 100 then
    raise exception 'Invalid job configuration';
  end if;
  perform pg_advisory_xact_lock(hashtext('keyam:claim-agent-job'));
  select * into j from public.agent_jobs where job_key = p_key for update;
  if found and j.state='running' and j.lease_until<=now() then
    update public.agent_jobs set usage_incomplete=true,
      state=case when attempts>=3 then 'failed' else state end,
      error_code=case when attempts>=3 then 'LEASE_EXPIRED' else error_code end,
      updated_at=now() where id=j.id returning * into j;
  end if;
  if j.id is not null and (j.state in ('needs_review','duplicate') or
      (j.state = 'running' and j.lease_until > now()) or j.attempts >= 3) then
    return jsonb_build_object('claimed',false,'job',to_jsonb(j));
  end if;
  insert into public.agent_daily_usage(day) values(d) on conflict do nothing;
  update public.agent_daily_usage set runs = runs + 1 where day = d and runs < p_limit;
  get diagnostics n = row_count;
  if n = 0 then return jsonb_build_object('claimed',false,'limited',true); end if;
  if j.id is null then
    insert into public.agent_jobs(job_key,state,usage_day) values(p_key,'running',d) returning * into j;
  else
    update public.agent_jobs set state='running', attempts=attempts+1, lease=gen_random_uuid(),
      lease_until=now()+interval '10 minutes', usage_day=d, context=null, error_code=null,
      updated_at=now() where id=j.id returning * into j;
  end if;
  return jsonb_build_object('claimed',true,'job',to_jsonb(j));
end $$;

create function public.record_agent_usage(p_id uuid, p_lease uuid, p_usage jsonb) returns void
language plpgsql set search_path = public, pg_temp as $$
declare j public.agent_jobs; i bigint; o bigint;
begin
  select * into j from public.agent_jobs where id=p_id and lease=p_lease and state='running' and lease_until>now() for update;
  if not found then raise exception 'Agent lease expired'; end if;
  i := coalesce((p_usage->>'inputTokens')::bigint,0);
  o := coalesce((p_usage->>'outputTokens')::bigint,0);
  if i<0 or o<0 or length(p_usage::text)>2000 then raise exception 'Invalid usage'; end if;
  update public.agent_jobs set input_tokens=input_tokens+i, output_tokens=output_tokens+o,
    usage=usage||jsonb_build_array(p_usage), usage_incomplete=usage_incomplete or coalesce((p_usage->>'incomplete')::boolean,false),
    updated_at=now() where id=p_id;
  update public.agent_daily_usage set input_tokens=input_tokens+i, output_tokens=output_tokens+o where day=j.usage_day;
end $$;

create function public.finish_agent_job(p_id uuid, p_lease uuid, p_context jsonb, p_draft jsonb) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare j public.agent_jobs; a public.articles; src text[];
begin
  perform pg_advisory_xact_lock(hashtext('keyam:finish-agent-job'));
  select * into j from public.agent_jobs where id=p_id and lease=p_lease and state='running' and lease_until>now() for update;
  if not found then raise exception 'Agent lease expired'; end if;
  select array_agg(value) into src from jsonb_array_elements_text(p_draft->'sources');
  if p_draft->>'status' is distinct from 'draft' or coalesce(length(p_draft->>'title'),0) not between 1 and 250
    or coalesce(length(p_draft->>'summary'),0) not between 1 and 20000 or coalesce(array_length(src,1),0) not between 1 and 20
    or p_context->>'publicationStatus' is distinct from 'needs_review' then raise exception 'Incomplete draft'; end if;
  select * into a from public.articles where sources && src or
    regexp_replace(lower(title),'[^[:alnum:]]','','g')=regexp_replace(lower(p_draft->>'title'),'[^[:alnum:]]','','g') limit 1;
  if found then
    update public.agent_jobs set state='duplicate', article_id=a.id, context=p_context, updated_at=now() where id=p_id returning * into j;
  else
    insert into public.articles(category,title,summary,date,ai,status,sources)
      values(p_draft->>'category',p_draft->>'title',p_draft->>'summary',(p_draft->>'date')::date,true,'draft',src) returning * into a;
    update public.agent_jobs set state='needs_review',article_id=a.id,context=p_context,updated_at=now() where id=p_id returning * into j;
  end if;
  return to_jsonb(j);
end $$;

create function public.fail_agent_job(p_id uuid, p_lease uuid) returns void
language sql set search_path = public, pg_temp as $$
  update public.agent_jobs set state='failed', error_code='GENERATION_OR_STORAGE_FAILED', updated_at=now()
    where id=p_id and lease=p_lease and state='running';
$$;

create function public.check_private_rate_limit(p_key text, p_limit integer, p_window integer) returns jsonb
language plpgsql set search_path = public, pg_temp as $$
declare n integer; expiry timestamptz;
begin
  if p_key !~ '^[a-f0-9]{64}$' or p_limit not between 1 and 1000 or p_window not between 1 and 86400 then
    raise exception 'Invalid rate limit'; end if;
  delete from public.private_rate_limits where expires_at < now() - interval '1 day';
  insert into public.private_rate_limits(key_hash,count,expires_at) values(p_key,1,now()+make_interval(secs=>p_window))
    on conflict(key_hash) do update set
      count=case when private_rate_limits.expires_at<=now() then 1 else least(private_rate_limits.count+1,p_limit+1) end,
      expires_at=case when private_rate_limits.expires_at<=now() then now()+make_interval(secs=>p_window) else private_rate_limits.expires_at end
    returning count,expires_at into n,expiry;
  return jsonb_build_object('ok',n<=p_limit,'retryAfter',case when n<=p_limit then 0 else greatest(1,ceil(extract(epoch from expiry-now()))::integer) end);
end $$;

revoke all on function public.claim_agent_job(text,integer), public.record_agent_usage(uuid,uuid,jsonb), public.finish_agent_job(uuid,uuid,jsonb,jsonb), public.fail_agent_job(uuid,uuid), public.check_private_rate_limit(text,integer,integer) from public, anon, authenticated;
grant execute on function public.claim_agent_job(text,integer), public.record_agent_usage(uuid,uuid,jsonb), public.finish_agent_job(uuid,uuid,jsonb,jsonb), public.fail_agent_job(uuid,uuid), public.check_private_rate_limit(text,integer,integer) to service_role;
