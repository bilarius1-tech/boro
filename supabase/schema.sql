-- Boro Phase 0 schema (safe to re-run)
-- Run in Supabase SQL Editor after creating the project.

create extension if not exists "pgcrypto";

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique not null,
  display_name text not null,
  avatar_url text,
  bio text,
  city text not null default 'Боровичи',
  telegram_handle text,
  whatsapp_number text,
  phone text,
  role text not null default 'owner' check (role in ('owner', 'seller')),
  created_at timestamptz not null default now()
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text,
  price integer not null check (price >= 0), -- rubles
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'SOLD', 'ARCHIVED')),
  telegram_message_id bigint,
  created_at timestamptz not null default now()
);

create index if not exists listings_user_id_idx on public.listings (user_id);
create index if not exists listings_status_created_idx on public.listings (status, created_at desc);

create table if not exists public.listing_media (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  type text not null default 'image' check (type in ('image', 'video')),
  url text not null,
  sort_order integer not null default 0,
  poster_url text,
  created_at timestamptz not null default now()
);

create index if not exists listing_media_listing_id_idx on public.listing_media (listing_id, sort_order);

-- Storage bucket
insert into storage.buckets (id, name, public)
values ('listing-media', 'listing-media', true)
on conflict (id) do nothing;

-- RLS
alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.listing_media enable row level security;

-- Drop policies if re-running
drop policy if exists "profiles_public_read" on public.profiles;
drop policy if exists "listings_public_read_active" on public.listings;
drop policy if exists "listing_media_public_read" on public.listing_media;
drop policy if exists "profiles_owner_update" on public.profiles;
drop policy if exists "profiles_owner_insert" on public.profiles;
drop policy if exists "listings_owner_all" on public.listings;
drop policy if exists "listing_media_owner_all" on public.listing_media;
drop policy if exists "listing_media_public_select" on storage.objects;
drop policy if exists "listing_media_auth_insert" on storage.objects;
drop policy if exists "listing_media_auth_update" on storage.objects;
drop policy if exists "listing_media_auth_delete" on storage.objects;

-- Public read
create policy "profiles_public_read"
  on public.profiles for select
  using (true);

create policy "listings_public_read_active"
  on public.listings for select
  using (status = 'ACTIVE' or auth.uid() = user_id);

create policy "listing_media_public_read"
  on public.listing_media for select
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id
        and (l.status = 'ACTIVE' or auth.uid() = l.user_id)
    )
  );

-- Owner write
create policy "profiles_owner_update"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_owner_insert"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "listings_owner_all"
  on public.listings for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "listing_media_owner_all"
  on public.listing_media for all
  using (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.listings l
      where l.id = listing_id and l.user_id = auth.uid()
    )
  );

-- Storage policies
create policy "listing_media_public_select"
  on storage.objects for select
  using (bucket_id = 'listing-media');

create policy "listing_media_auth_insert"
  on storage.objects for insert
  with check (bucket_id = 'listing-media' and auth.role() = 'authenticated');

create policy "listing_media_auth_update"
  on storage.objects for update
  using (bucket_id = 'listing-media' and auth.role() = 'authenticated');

create policy "listing_media_auth_delete"
  on storage.objects for delete
  using (bucket_id = 'listing-media' and auth.role() = 'authenticated');
