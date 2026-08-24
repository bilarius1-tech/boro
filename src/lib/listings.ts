import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ListingWithMedia, Profile } from "@/lib/types";

const listingSelect = `
  *,
  listing_media (
    id, listing_id, type, url, sort_order, poster_url, created_at
  )
`;

const feedSelect = `
  ${listingSelect},
  profiles (
    id, username, display_name, avatar_url, bio, city,
    telegram_handle, whatsapp_number, phone, role, created_at
  )
`;

function sortMedia(media: { sort_order: number }[] | null | undefined) {
  return (media || []).slice().sort((a, b) => a.sort_order - b.sort_order);
}

export async function getListingById(
  id: string
): Promise<ListingWithMedia | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(feedSelect)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    ...data,
    listing_media: sortMedia(data.listing_media),
  } as ListingWithMedia;
}

export async function getListingsByUserId(
  userId: string,
  opts?: { includeSold?: boolean }
): Promise<ListingWithMedia[]> {
  const supabase = await createClient();
  let query = supabase
    .from("listings")
    .select(listingSelect)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!opts?.includeSold) {
    query = query.eq("status", "ACTIVE");
  } else {
    query = query.in("status", ["ACTIVE", "SOLD"]);
  }

  const { data } = await query;
  if (!data) return [];

  return data.map((row) => ({
    ...row,
    listing_media: sortMedia(row.listing_media),
  })) as ListingWithMedia[];
}

export type FeedPage = {
  items: ListingWithMedia[];
  nextCursor: string | null;
};

/** Public city feed — ACTIVE listings, newest first. */
export async function getFeedPage(opts?: {
  cursor?: string | null;
  limit?: number;
}): Promise<FeedPage> {
  const limit = Math.min(Math.max(opts?.limit ?? 8, 1), 24);
  const supabase = createAdminClient();

  let query = supabase
    .from("listings")
    .select(feedSelect)
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (opts?.cursor) {
    query = query.lt("created_at", opts.cursor);
  }

  const { data, error } = await query;
  if (error || !data) {
    if (error) console.error("feed query", error.message);
    return { items: [], nextCursor: null };
  }

  const hasMore = data.length > limit;
  const slice = hasMore ? data.slice(0, limit) : data;
  const items = slice.map((row) => ({
    ...row,
    listing_media: sortMedia(row.listing_media),
    profiles: row.profiles as Profile | undefined,
  })) as ListingWithMedia[];

  const nextCursor = hasMore
    ? (items[items.length - 1]?.created_at ?? null)
    : null;

  return { items, nextCursor };
}
