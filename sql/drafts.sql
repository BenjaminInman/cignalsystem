-- Composed article drafts. Additive: nothing existing is touched.
--
-- ingest_news.py stops at facts. This is where composed articles land, gated
-- and awaiting approval. Nothing here publishes on its own.

create table if not exists drafts (
  id            uuid primary key default gen_random_uuid(),
  site          text not null,               -- multifamily30x | cignalnews | ...
  vertical      text not null default 'multifamily',
  slug          text,
  headline      text,
  dek           text,
  body          jsonb not null,              -- full composer output
  fact_ids      uuid[] not null default '{}',   -- news_facts.id
  article_ids   uuid[] not null default '{}',   -- news_articles.id
  corroboration int default 1,
  gate_pass     boolean default false,
  gate_failures jsonb default '[]'::jsonb,
  coverage      numeric,
  status        text default 'draft',        -- draft | approved | published | rejected
  model         text,
  created_at    timestamptz default now(),
  reviewed_at   timestamptz,
  published_at  timestamptz,
  unique (site, slug)
);

create index if not exists idx_drafts_status on drafts (site, status, created_at desc);

alter table drafts enable row level security;

-- Only published drafts are publicly readable; the composer writes with the
-- service role, same as the ingest job.
drop policy if exists "read published drafts" on drafts;
create policy "read published drafts" on drafts for select using (status = 'published');
