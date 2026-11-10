-- Run this once in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).

create extension if not exists pgcrypto;

create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  category    text,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.reviews (
  id               uuid primary key default gen_random_uuid(),
  business_id      uuid not null references public.businesses(id) on delete cascade,
  external_id      text not null,                       -- id from the imported JSON (makes imports idempotent)
  reviewer_name    text,
  rating           smallint check (rating between 1 and 5),
  review_text      text not null,
  reviewed_at      timestamptz,

  -- AI analysis
  language_code    text,                                -- ISO 639-1, e.g. "sv", "da", "ru", "en"
  language_name    text,
  sentiment        text check (sentiment in ('positive','neutral','negative')),
  analyzed_at      timestamptz,

  -- Reply workflow
  ai_reply         text,                                -- last AI draft (kept to detect edits)
  reply_text       text,                                -- current wording (AI draft or user edit)
  reply_status     text not null default 'pending'
                   check (reply_status in ('pending','generated','edited','approved')),
  generation_count integer not null default 0,
  generated_at     timestamptz,
  approved_at      timestamptz,

  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  unique (business_id, external_id)
);

create index if not exists reviews_business_status_idx    on public.reviews (business_id, reply_status);
create index if not exists reviews_business_sentiment_idx on public.reviews (business_id, sentiment);
create index if not exists reviews_business_language_idx  on public.reviews (business_id, language_code);
create index if not exists reviews_business_date_idx      on public.reviews (business_id, reviewed_at desc);

create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists reviews_set_updated_at on public.reviews;
create trigger reviews_set_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- All access goes through the Next.js server using the service role key.
-- RLS is enabled with no policies, so the public anon key cannot read or write anything.
alter table public.businesses enable row level security;
alter table public.reviews    enable row level security;
