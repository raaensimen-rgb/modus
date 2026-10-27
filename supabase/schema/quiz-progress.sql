create table public.quiz_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  article_id text not null check (article_id in ('toner-og-intervaller','dur-og-moll','kvintsirkelen','din-forste-improvisasjon','moduser-og-tonalt-sentrum','ii-v-i-kadensen','septimakkorder','harmonisk-moll-og-frygisk-dominant','stemmeforing','rytme-i-sju-aatte','bygg-akkorder-i-en-toneart','ett-skalakart-nye-maltoner','dorisk-og-eolisk')),
  completed_at timestamptz not null default now(),
  primary key (user_id, article_id)
);
alter table public.quiz_progress enable row level security;
revoke all on public.quiz_progress from anon, authenticated;
grant select, insert on public.quiz_progress to authenticated;
create policy "Read own quiz progress" on public.quiz_progress for select to authenticated using ((select auth.uid()) = user_id);
create policy "Save own quiz progress" on public.quiz_progress for insert to authenticated with check ((select auth.uid()) = user_id);
comment on table public.quiz_progress is 'Self-assessed article quiz completion, owned by the signed-in user. Not a certification or payment entitlement.';
