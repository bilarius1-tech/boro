"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listingSchema } from "@/lib/validation";
import { getCurrentProfile } from "@/lib/profile";
import { storagePathFromPublicUrl } from "@/lib/storage-paths";
import {
  deleteTelegramMessages,
  markTelegramSold,
} from "@/lib/telegram";
import { deleteVkPost, markVkSold } from "@/lib/vk";

export type ListingActionState = {
  error?: string;
  listingId?: string;
};

export async function createListing(
  _prev: ListingActionState,
  formData: FormData
): Promise<ListingActionState> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login");
  }

  let mediaUrls: string[] = [];
  const rawMedia = formData.get("media_urls");
  if (typeof rawMedia === "string" && rawMedia) {
    try {
      mediaUrls = JSON.parse(rawMedia);
    } catch {
      return { error: "Не удалось прочитать фото" };
    }
  }

  const parsed = listingSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || "",
    price: formData.get("price"),
    mediaUrls,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Проверьте поля" };
  }

  const supabase = await createClient();

  const { data: listing, error } = await supabase
    .from("listings")
    .insert({
      user_id: profile.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      price: parsed.data.price,
      status: "ACTIVE",
    })
    .select("id")
    .single();

  if (error || !listing) {
    return { error: error?.message || "Не удалось создать лот" };
  }

  const mediaRows = parsed.data.mediaUrls.map((url, index) => ({
    listing_id: listing.id,
    type: "image" as const,
    url,
    sort_order: index,
  }));

  const { error: mediaError } = await supabase
    .from("listing_media")
    .insert(mediaRows);

  if (mediaError) {
    await supabase.from("listings").delete().eq("id", listing.id);
    return { error: mediaError.message || "Не удалось сохранить фото" };
  }

  redirect(`/i/${listing.id}`);
}

type RemoveMode = "sold" | "delete";

async function removeListing(listingId: string, mode: RemoveMode) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const supabase = await createClient();

  type ListingTgRow = {
    id: string;
    user_id: string;
    telegram_message_id: number | null;
    telegram_message_ids?: unknown;
    vk_post_id?: number | null;
    vk_owner_id?: number | null;
  };

  let listingRow: ListingTgRow | null = null;

  {
    const { data, error } = await supabase
      .from("listings")
      .select(
        "id, user_id, telegram_message_id, telegram_message_ids, vk_post_id, vk_owner_id"
      )
      .eq("id", listingId)
      .eq("user_id", profile.id)
      .maybeSingle();
    if (!error && data) listingRow = data as ListingTgRow;
  }

  if (!listingRow) {
    const { data } = await supabase
      .from("listings")
      .select("id, user_id, telegram_message_id")
      .eq("id", listingId)
      .eq("user_id", profile.id)
      .maybeSingle();
    listingRow = data as ListingTgRow | null;
  }

  if (!listingRow) {
    redirect(`/u/${profile.username}`);
  }

  const { data: media } = await supabase
    .from("listing_media")
    .select("url")
    .eq("listing_id", listingId);

  const paths = (media || [])
    .map((m) => storagePathFromPublicUrl(m.url))
    .filter((p): p is string => Boolean(p));

  if (paths.length > 0) {
    const admin = createAdminClient();
    await admin.storage.from("listing-media").remove(paths);
  }

  const row = listingRow as {
    telegram_message_id?: number | null;
    telegram_message_ids?: unknown;
    vk_post_id?: number | null;
    vk_owner_id?: number | null;
  };
  const rawIds = row.telegram_message_ids;
  const ids = Array.isArray(rawIds)
    ? rawIds.filter((n): n is number => typeof n === "number")
    : null;

  if (mode === "sold") {
    await markTelegramSold(ids, row.telegram_message_id);
    await markVkSold(row.vk_post_id, row.vk_owner_id);
  } else {
    await deleteTelegramMessages(ids, row.telegram_message_id);
    await deleteVkPost(row.vk_post_id, row.vk_owner_id);
  }

  await supabase
    .from("listings")
    .delete()
    .eq("id", listingId)
    .eq("user_id", profile.id);

  redirect(`/u/${profile.username}`);
}

/** Продано: сайт очищаем, в канале — эмблема ✅ ПРОДАНО */
export async function markListingSold(listingId: string) {
  await removeListing(listingId, "sold");
}

/** Удалить: сайт + сообщения в канале */
export async function deleteListing(listingId: string) {
  await removeListing(listingId, "delete");
}
