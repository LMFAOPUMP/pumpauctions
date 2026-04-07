-- Neon Pump Billboard / Supabase Schema
-- Run this script in Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.billboard_history (
  id uuid primary key default gen_random_uuid(),
  buyer_wallet text not null check (length(trim(buyer_wallet)) > 0),
  image_url text not null check (length(trim(image_url)) > 0),
  tx_signature text not null unique check (length(trim(tx_signature)) > 0),
  paid_amount_tokens numeric(38, 6) not null check (paid_amount_tokens > 0),
  paid_amount_raw numeric(65, 0) not null check (paid_amount_raw > 0),
  displayed_from timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists billboard_history_created_at_idx
  on public.billboard_history (created_at desc);

create index if not exists billboard_history_displayed_from_idx
  on public.billboard_history (displayed_from desc);

alter table public.billboard_history enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'billboard_history'
      AND policyname = 'Public read billboard history'
  ) THEN
    CREATE POLICY "Public read billboard history"
      ON public.billboard_history
      FOR SELECT
      TO public
      USING (true);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'billboard_history'
      AND policyname = 'Public insert billboard history'
  ) THEN
    CREATE POLICY "Public insert billboard history"
      ON public.billboard_history
      FOR INSERT
      TO public
      WITH CHECK (true);
  END IF;
END
$$;

alter table public.billboard_history replica identity full;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'billboard_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.billboard_history;
  END IF;
END
$$;

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'billboard-images',
  'billboard-images',
  true,
  8388608,
  array['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public read billboard images'
  ) THEN
    CREATE POLICY "Public read billboard images"
      ON storage.objects
      FOR SELECT
      TO public
      USING (bucket_id = 'billboard-images');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public upload billboard images'
  ) THEN
    CREATE POLICY "Public upload billboard images"
      ON storage.objects
      FOR INSERT
      TO public
      WITH CHECK (bucket_id = 'billboard-images');
  END IF;
END
$$;
