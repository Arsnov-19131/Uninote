-- Keep the existing offline-first Zustand stores intact and sync their
-- collections as one account-scoped JSON snapshot.
create table if not exists public.user_app_data (
  user_id uuid references auth.users on delete cascade primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default timezone('utc'::text, now())
);

alter table public.user_app_data enable row level security;
revoke all on public.user_app_data from public, anon;
grant select, insert, update, delete on public.user_app_data to authenticated;

create policy "Users manage own app data" on public.user_app_data
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
