-- Editor accounts are granted explicitly by an administrator, by verified user UUID.
-- Signing up never grants editing rights. Public snapshots never include drafts.
begin;
create table public.cms_editors (
 user_id uuid primary key references auth.users(id) on delete cascade,
 enabled boolean not null default true
);
alter table public.cms_editors enable row level security;
revoke all on public.cms_editors from anon, authenticated;
grant select on public.cms_editors to authenticated;
create policy "Editor can inspect own access" on public.cms_editors for select to authenticated using (user_id=(select auth.uid()) and enabled);

create table public.cms_article_drafts (
 slug text not null check (length(slug)<=80 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 locale text not null check (locale in ('nb','en')),
 payload jsonb not null check (jsonb_typeof(payload)='object' and octet_length(payload::text)<=512000),
 revision integer not null check (revision>0),
 updated_at timestamptz not null default now(),
 updated_by uuid not null references auth.users(id),
 primary key (slug,locale)
);
create table public.cms_article_publications (
 slug text not null,
 locale text not null,
 payload jsonb not null,
 revision integer not null,
 published_at timestamptz not null default now(),
 primary key (slug,locale),
 foreign key (slug,locale) references public.cms_article_drafts(slug,locale)
);
create table public.cms_article_history (
 id bigint generated always as identity primary key,
 slug text not null,
 locale text not null,
 payload jsonb not null,
 revision integer not null,
 saved_at timestamptz not null default now(),
 unique(slug,locale,revision)
);
alter table public.cms_article_drafts enable row level security;
alter table public.cms_article_publications enable row level security;
alter table public.cms_article_history enable row level security;
revoke all on public.cms_article_drafts,public.cms_article_publications,public.cms_article_history from anon,authenticated;
grant select,insert,update on public.cms_article_drafts,public.cms_article_publications to authenticated;
grant select,insert on public.cms_article_history to authenticated;
grant usage on sequence public.cms_article_history_id_seq to authenticated;
grant select on public.cms_article_publications to anon;
create policy "Editors manage drafts" on public.cms_article_drafts for all to authenticated
 using (exists(select 1 from public.cms_editors where user_id=(select auth.uid()) and enabled))
 with check (exists(select 1 from public.cms_editors where user_id=(select auth.uid()) and enabled));
create policy "Published articles are public" on public.cms_article_publications for select to anon,authenticated using (true);
create policy "Editors publish" on public.cms_article_publications for insert to authenticated
 with check (exists(select 1 from public.cms_editors where user_id=(select auth.uid()) and enabled));
create policy "Editors update publications" on public.cms_article_publications for update to authenticated
 using (exists(select 1 from public.cms_editors where user_id=(select auth.uid()) and enabled))
 with check (exists(select 1 from public.cms_editors where user_id=(select auth.uid()) and enabled));
create policy "Editors read history" on public.cms_article_history for select to authenticated
 using (exists(select 1 from public.cms_editors where user_id=(select auth.uid()) and enabled));
create policy "Editors store history" on public.cms_article_history for insert to authenticated
 with check (exists(select 1 from public.cms_editors where user_id=(select auth.uid()) and enabled));

create function public.cms_save_draft(p_slug text,p_locale text,p_payload jsonb,p_expected_revision integer)
returns integer language plpgsql security invoker set search_path='' as $$
declare v integer;
begin
 if not exists(select 1 from public.cms_editors where user_id=(select auth.uid()) and enabled) then raise exception 'Editor access required' using errcode='42501'; end if;
 if p_payload->>'slug' is distinct from p_slug or p_payload->>'locale' is distinct from p_locale then raise exception 'Article identity mismatch'; end if;
 insert into public.cms_article_drafts(slug,locale,payload,revision,updated_by)
 values(p_slug,p_locale,p_payload,1,auth.uid())
 on conflict(slug,locale) do update set payload=excluded.payload,revision=cms_article_drafts.revision+1,updated_at=now(),updated_by=auth.uid()
 where cms_article_drafts.revision=p_expected_revision and p_expected_revision>0
 returning revision into v;
 if v is null or (p_expected_revision>0 and v=1) then raise exception 'Draft changed in another tab. Reload before saving.' using errcode='40001'; end if;
 insert into public.cms_article_history(slug,locale,payload,revision) values(p_slug,p_locale,p_payload,v);
 return v;
end $$;
create function public.cms_publish_article(p_slug text,p_locale text,p_expected_revision integer)
returns timestamptz language plpgsql security invoker set search_path='' as $$
declare d public.cms_article_drafts; q jsonb; s jsonb; stamp timestamptz;
begin
 if not exists(select 1 from public.cms_editors where user_id=(select auth.uid()) and enabled) then raise exception 'Editor access required' using errcode='42501'; end if;
 select * into d from public.cms_article_drafts where slug=p_slug and locale=p_locale for update;
 if d.revision is distinct from p_expected_revision then raise exception 'Draft changed. Reload before publishing.' using errcode='40001'; end if;
 if coalesce(length(trim(d.payload->>'title')),0)=0 or coalesce(length(trim(d.payload->>'intro')),0)=0
 or jsonb_typeof(d.payload->'sections') is distinct from 'array' or jsonb_array_length(d.payload->'sections') not between 1 and 30
 or jsonb_typeof(d.payload->'quiz') is distinct from 'array' or jsonb_array_length(d.payload->'quiz')<>3 then raise exception 'Article is incomplete'; end if;
 for s in select value from jsonb_array_elements(d.payload->'sections') loop
 if jsonb_typeof(s) is distinct from 'array' or jsonb_array_length(s)<>2 or coalesce(length(trim(s->>0)),0)=0 or coalesce(length(trim(s->>1)),0)=0 then raise exception 'Incomplete section';end if;
 end loop;
 for q in select value from jsonb_array_elements(d.payload->'quiz') loop
 if coalesce(length(trim(q->>'question')),0)=0 or coalesce(length(trim(q->>'explanation')),0)=0
 or jsonb_typeof(q->'options') is distinct from 'array' or jsonb_array_length(q->'options')<>3
 or coalesce((q->>'answer')::integer,-1) not between 0 and 2
 or coalesce((q->>'section')::integer,-1) not between 1 and jsonb_array_length(d.payload->'sections')
 or exists(select 1 from jsonb_array_elements_text(q->'options') o where length(trim(o))=0)
 or (select count(distinct o) from jsonb_array_elements_text(q->'options') o)<>3 then raise exception 'Incomplete quiz';end if;
 end loop;
 insert into public.cms_article_publications(slug,locale,payload,revision) values(d.slug,d.locale,d.payload,d.revision)
 on conflict(slug,locale) do update set payload=excluded.payload,revision=excluded.revision,published_at=now()
 returning published_at into stamp;
 return stamp;
end $$;
revoke all on function public.cms_save_draft(text,text,jsonb,integer),public.cms_publish_article(text,text,integer) from public,anon;
grant execute on function public.cms_save_draft(text,text,jsonb,integer),public.cms_publish_article(text,text,integer) to authenticated;
commit;

-- Allow completion of newly published articles while preserving per-user ownership.
begin;
alter table public.quiz_progress drop constraint quiz_progress_article_id_check;
alter table public.quiz_progress add constraint quiz_progress_article_id_check check (length(article_id)<=80 and article_id ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
drop policy "Save own quiz progress" on public.quiz_progress;
create policy "Save own quiz progress" on public.quiz_progress for insert to authenticated with check ((select auth.uid())=user_id and (article_id in ('toner-og-intervaller','dur-og-moll','kvintsirkelen','din-forste-improvisasjon','moduser-og-tonalt-sentrum','ii-v-i-kadensen','septimakkorder','harmonisk-moll-og-frygisk-dominant','stemmeforing','rytme-i-sju-aatte','bygg-akkorder-i-en-toneart','ett-skalakart-nye-maltoner','dorisk-og-eolisk') or exists(select 1 from public.cms_article_publications p where p.slug=article_id)));
commit;
