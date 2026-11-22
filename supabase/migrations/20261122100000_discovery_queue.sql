-- Durable discovery, cursor, cycle lease and recovery. No schedule or credential changes.
create table public.editorial_cycles (
  cycle_key text primary key,
  state text not null check(state in ('running','completed','failed')),
  lease uuid not null default gen_random_uuid(),
  lease_until timestamptz not null default now()+interval '5 minutes',
  attempts integer not null default 1 check(attempts between 1 and 3),
  feeds jsonb not null default '[]',
  summary jsonb not null default '{}',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);
create table public.editorial_events (
  id uuid primary key default gen_random_uuid(),
  story_key text not null unique,
  sport text not null check(sport in ('NBA','NFL','MLB','Soccer')),
  published_at timestamptz not null,
  state text not null default 'queued' check(state in ('queued','processing','published','held','duplicate','failed')),
  attempts integer not null default 0 check(attempts between 0 and 3),
  lease uuid,
  lease_until timestamptz,
  available_at timestamptz not null default now(),
  job_id uuid references public.agent_jobs(id),
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index editorial_events_pending on public.editorial_events(available_at,published_at) where state in ('queued','processing');
create table public.editorial_discoveries (
  source_key text primary key,
  event_id uuid not null references public.editorial_events(id),
  provider_id text not null,
  payload jsonb not null,
  observed_at timestamptz not null default now(),
  versions integer not null default 1
);
create table public.editorial_feed_cursors (
  provider_id text primary key,
  last_successful_poll timestamptz not null,
  last_seen_published timestamptz
);
create table public.editorial_queue_alerts (
  id uuid primary key default gen_random_uuid(),
  event_id uuid references public.editorial_events(id),
  cycle_key text references public.editorial_cycles(cycle_key),
  code text not null,
  created_at timestamptz not null default now()
);
alter table public.editorial_cycles enable row level security;
alter table public.editorial_events enable row level security;
alter table public.editorial_discoveries enable row level security;
alter table public.editorial_feed_cursors enable row level security;
alter table public.editorial_queue_alerts enable row level security;
revoke all on public.editorial_cycles,public.editorial_events,public.editorial_discoveries,public.editorial_feed_cursors,public.editorial_queue_alerts from public,anon,authenticated;
grant all on public.editorial_cycles,public.editorial_events,public.editorial_discoveries,public.editorial_feed_cursors,public.editorial_queue_alerts to service_role;

create function public.claim_editorial_cycle(p_key text) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare c public.editorial_cycles;
begin
  if p_key is null or p_key !~ '^[a-zA-Z0-9:_-]{1,100}$' then raise exception 'Invalid cycle key';end if;
  perform pg_advisory_xact_lock(hashtext('keyam:editorial-cycle'));
  with expired as (
    update public.editorial_cycles set state='failed',summary=summary||'{"error":"LEASE_EXPIRED"}'::jsonb,completed_at=now()
    where state='running' and lease_until<=now() returning cycle_key
  ) insert into public.editorial_queue_alerts(cycle_key,code) select cycle_key,'CYCLE_LEASE_EXPIRED' from expired;
  if exists(select 1 from public.editorial_cycles where state='running' and lease_until>now()) then return jsonb_build_object('claimed',false,'reason','ACTIVE_RUN');end if;
  select * into c from public.editorial_cycles where cycle_key=p_key for update;
  if found and (c.state='completed' or c.attempts>=3) then return jsonb_build_object('claimed',false,'reason','ALREADY_PROCESSED');end if;
  if c.cycle_key is null then
    insert into public.editorial_cycles(cycle_key,state) values(p_key,'running') returning * into c;
  else
    update public.editorial_cycles set state='running',attempts=attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '5 minutes',completed_at=null where cycle_key=p_key returning * into c;
  end if;
  return jsonb_build_object('claimed',true,'cycle',to_jsonb(c));
end $$;
create function public.ingest_editorial_events(p_key text,p_lease uuid,p_events jsonb,p_feeds jsonb) returns integer language plpgsql set search_path=public,pg_temp as $$
declare item jsonb; f jsonb; event_id uuid; n integer:=0; latest timestamptz;
begin
  if not exists(select 1 from public.editorial_cycles where cycle_key=p_key and lease=p_lease and state='running' and lease_until>now()) then raise exception 'Cycle lease expired';end if;
  if jsonb_typeof(p_events)<>'array' or jsonb_array_length(p_events)>100 or jsonb_typeof(p_feeds)<>'array' or jsonb_array_length(p_feeds)>20 then raise exception 'Invalid discovery batch';end if;
  for item in select * from jsonb_array_elements(p_events) loop
    if item->>'sourceKey' !~ '^[a-f0-9]{64}$' or item->>'storyKey' !~ '^[a-f0-9]{64}$' or length(item#>>'{headline,headline}') not between 1 and 500 or length(item->>'providerId') not between 1 and 100 then raise exception 'Invalid event';end if;
    if exists(select 1 from public.editorial_discoveries where source_key=item->>'sourceKey') then
      update public.editorial_discoveries set observed_at=now(),versions=versions+case when payload<>item->'headline' then 1 else 0 end,payload=item->'headline' where source_key=item->>'sourceKey';
      continue;
    end if;
    insert into public.editorial_events(story_key,sport,published_at)
      values(item->>'storyKey',item#>>'{headline,sport}',(item#>>'{headline,published}')::timestamptz)
      on conflict(story_key) do update set updated_at=now() returning id into event_id;
    insert into public.editorial_discoveries(source_key,event_id,provider_id,payload) values(item->>'sourceKey',event_id,item->>'providerId',item->'headline') on conflict do nothing;
    n:=n+1;
  end loop;
  for f in select * from jsonb_array_elements(p_feeds) loop
    if f->>'available'='true' then
      select max((payload->>'published')::timestamptz) into latest from public.editorial_discoveries where provider_id=f->>'id';
      insert into public.editorial_feed_cursors(provider_id,last_successful_poll,last_seen_published) values(f->>'id',now(),latest)
        on conflict(provider_id) do update set last_successful_poll=now(),last_seen_published=coalesce(greatest(editorial_feed_cursors.last_seen_published,excluded.last_seen_published),editorial_feed_cursors.last_seen_published);
    end if;
  end loop;
  update public.editorial_cycles set feeds=p_feeds where cycle_key=p_key and lease=p_lease;
  return n;
end $$;
create function public.claim_editorial_event(p_key text,p_cycle_lease uuid) returns jsonb language plpgsql set search_path=public,pg_temp as $$
declare e public.editorial_events; items jsonb;
begin
  if not exists(select 1 from public.editorial_cycles where cycle_key=p_key and lease=p_cycle_lease and state='running' and lease_until>now()) then raise exception 'Cycle lease expired';end if;
  with expired as (update public.editorial_events set state='held',reason='EVENT_EXPIRED',updated_at=now() where state='queued' and published_at<now()-interval '48 hours' returning id)
    insert into public.editorial_queue_alerts(event_id,code) select id,'EVENT_EXPIRED' from expired;
  with expired as (update public.editorial_events set state='failed',reason='ATTEMPTS_EXHAUSTED',updated_at=now() where state='processing' and lease_until<=now() and attempts>=3 returning id)
    insert into public.editorial_queue_alerts(event_id,code) select id,'ATTEMPTS_EXHAUSTED' from expired;
  select * into e from public.editorial_events where attempts<3 and published_at between now()-interval '48 hours' and now() and
    ((state='queued' and available_at<=now()) or (state='processing' and lease_until<=now()))
    order by published_at desc,id for update skip locked limit 1;
  if not found then return null;end if;
  update public.editorial_events set state='processing',attempts=attempts+1,lease=gen_random_uuid(),lease_until=now()+interval '5 minutes',updated_at=now() where id=e.id returning * into e;
  select jsonb_agg(payload order by observed_at desc) into items from (select payload,observed_at from public.editorial_discoveries where event_id=e.id order by observed_at desc limit 3) d;
  return to_jsonb(e)||jsonb_build_object('headlines',items);
end $$;
create function public.finish_editorial_event(p_id uuid,p_lease uuid,p_outcome text,p_job uuid,p_reason text) returns void language plpgsql set search_path=public,pg_temp as $$
declare e public.editorial_events;
begin
  if p_outcome not in ('published','held','duplicate','failed','budget') then raise exception 'Invalid event outcome';end if;
  select * into e from public.editorial_events where id=p_id and lease=p_lease and state='processing' and lease_until>now() for update;
  if not found then raise exception 'Event lease expired';end if;
  if p_outcome='published' and not exists(select 1 from public.agent_jobs j join public.agent_publications p on p.job_id=j.id
    where j.id=p_job and j.job_key='event:'||p_id::text and p.state='published') then raise exception 'No verified publication for event';end if;
  update public.editorial_events set
    state=case when p_outcome='budget' or (p_outcome='failed' and attempts<3) then 'queued' else p_outcome end,
    attempts=case when p_outcome='budget' then attempts-1 else attempts end,
    available_at=case when p_outcome='budget' then (date_trunc('day',now() at time zone 'UTC')+interval '1 day') at time zone 'UTC' when p_outcome='failed' then now()+make_interval(mins=>15*attempts) else available_at end,
    job_id=coalesce(p_job,job_id),reason=left(p_reason,200),lease=null,lease_until=null,updated_at=now() where id=p_id;
  if p_outcome='held' or (p_outcome='failed' and e.attempts>=3) then
    insert into public.editorial_queue_alerts(event_id,code) values(p_id,case when p_outcome='held' then 'EDITORIAL_HOLD' else 'ATTEMPTS_EXHAUSTED' end);
  end if;
end $$;
create function public.finish_editorial_cycle(p_key text,p_lease uuid,p_summary jsonb,p_failed boolean) returns void language plpgsql set search_path=public,pg_temp as $$
declare n integer;
begin
  update public.editorial_cycles set state=case when p_failed then 'failed' else 'completed' end,summary=p_summary,completed_at=now(),lease_until=now()
    where cycle_key=p_key and lease=p_lease and state='running' and lease_until>now();
  get diagnostics n=row_count;
  if n<>1 then raise exception 'Cycle lease expired';end if;
end $$;
revoke all on function public.claim_editorial_cycle(text),public.ingest_editorial_events(text,uuid,jsonb,jsonb),public.claim_editorial_event(text,uuid),public.finish_editorial_event(uuid,uuid,text,uuid,text),public.finish_editorial_cycle(text,uuid,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.claim_editorial_cycle(text),public.ingest_editorial_events(text,uuid,jsonb,jsonb),public.claim_editorial_event(text,uuid),public.finish_editorial_event(uuid,uuid,text,uuid,text),public.finish_editorial_cycle(text,uuid,jsonb,boolean) to service_role;

create function public.editorial_queue_status() returns jsonb language sql stable set search_path=public,pg_temp as $$
  select jsonb_build_object(
    'events',coalesce((select jsonb_object_agg(state,n) from (select state,count(*) n from public.editorial_events group by state) counts),'{}'::jsonb),
    'lastCycle',(select to_jsonb(c) - 'lease' from public.editorial_cycles c order by started_at desc limit 1),
    'feedCursors',coalesce((select jsonb_agg(to_jsonb(f)) from public.editorial_feed_cursors f),'[]'::jsonb),
    'alerts',coalesce((select jsonb_agg(to_jsonb(a)) from (select event_id,cycle_key,code,created_at from public.editorial_queue_alerts order by created_at desc limit 20) a),'[]'::jsonb)
  );
$$;
revoke all on function public.editorial_queue_status() from public,anon,authenticated;
grant execute on function public.editorial_queue_status() to service_role;
