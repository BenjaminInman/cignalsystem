-- My Zip Codes: per-user saved ZIP list. Mirrors the `watchlist` table pattern.

create table if not exists public.user_zip_codes (
  user_id    uuid        not null references auth.users(id) on delete cascade,
  zip        text        not null,
  position   int         not null default 0,
  created_at timestamptz not null default now(),
  primary key (user_id, zip)
);

alter table public.user_zip_codes enable row level security;

-- Each statement run as a separate Management API call (one stmt per request).
create policy "own zips select" on public.user_zip_codes
  for select using (auth.uid() = user_id);

create policy "own zips insert" on public.user_zip_codes
  for insert with check (auth.uid() = user_id);

create policy "own zips update" on public.user_zip_codes
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own zips delete" on public.user_zip_codes
  for delete using (auth.uid() = user_id);
