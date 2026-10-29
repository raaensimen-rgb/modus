-- PL-055: server-only Stripe customer ownership mapping.
-- Apply in Supabase SQL editor only after review; do not expose to public clients.
create table if not exists public.stripe_customers (
 user_id uuid primary key references auth.users(id) on delete cascade,
 stripe_customer_id text not null unique,
 created_at timestamptz not null default now()
);
alter table public.stripe_customers enable row level security;
-- No end-user policies: all reads/writes are performed by trusted server-side service role.
