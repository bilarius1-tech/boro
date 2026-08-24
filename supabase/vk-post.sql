-- Boro: VK wall post ids for sold/delete sync
-- Run once in Supabase SQL Editor

alter table public.listings
  add column if not exists vk_post_id bigint;

alter table public.listings
  add column if not exists vk_owner_id bigint;
