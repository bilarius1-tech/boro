import { createClient } from "@/lib/supabase/server";
import type { ListingWithMedia } from "@/lib/types";

const listingSelect = `
  *,
  listing_media (
    id, listing_id, type, url, sort_order, poster_url, created_at
  )
`;

export async function getListingById(
  id: string
): Promise<ListingWithMedia | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("listings")
    .select(
      `
      ${listingSelect},
      profiles (
        id, username, display_name, avatar_url, bio, city,
        telegram_handle, whatsapp_number, phone, role, created_at
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  const media = (data.listing_media || []).slice().sort(
    (a: { sort_order: number }, b: { sort_order: number }) =>
      a.sort_order - b.sort_order
  );

  return { ...data, listing_media: media } as ListingWithMedia;
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

  return data.map((row) => {
    const media = (row.listing_media || []).slice().sort(
      (a: { sort_order: number }, b: { sort_order: number }) =>
        a.sort_order - b.sort_order
    );
    return { ...row, listing_media: media } as ListingWithMedia;
  });
}
