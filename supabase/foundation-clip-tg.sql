-- Boro foundation: clips + multi-message Telegram ids
-- Run once in Supabase SQL Editor

alter table public.listings
  add column if not exists clip_url text;

alter table public.listings
  add column if not exists clip_status text not null default 'none';

alter table public.listings
  add column if not exists telegram_message_ids jsonb;

do $$
begin
  alter table public.listings drop constraint if exists listings_clip_status_check;
  alter table public.listings
    add constraint listings_clip_status_check
    check (clip_status in ('none', 'pending', 'ready', 'failed'));
exception when others then null;
end $$;
