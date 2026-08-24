import { createAdminClient } from "@/lib/supabase/admin";
import { renderPhotoClip } from "@/lib/clip/render";
import { siteListingUrl } from "@/lib/telegram";
import { formatPriceRub } from "@/lib/money";

async function setClipStatus(
  listingId: string,
  status: "pending" | "ready" | "failed",
  clipUrl?: string | null
) {
  const admin = createAdminClient();
  const payload: Record<string, unknown> = { clip_status: status };
  if (clipUrl !== undefined) payload.clip_url = clipUrl;
  const { error } = await admin
    .from("listings")
    .update(payload)
    .eq("id", listingId);
  if (error) {
    console.error("clip status update", error.message);
  }
}

async function appendTelegramMessageId(listingId: string, messageId: number) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("listings")
    .select("telegram_message_id, telegram_message_ids")
    .eq("id", listingId)
    .maybeSingle();

  const prev = Array.isArray(data?.telegram_message_ids)
    ? (data!.telegram_message_ids as number[])
    : data?.telegram_message_id
      ? [data.telegram_message_id as number]
      : [];
  const next = [...prev, messageId].filter(
    (v, i, a) => a.indexOf(v) === i
  );

  await admin
    .from("listings")
    .update({
      telegram_message_id: next[0] ?? messageId,
      telegram_message_ids: next,
    })
    .eq("id", listingId);
}

/**
 * Clip as a reply under the listing card — no second promo / no extra CTAs.
 */
async function postClipToTelegram(
  listingId: string,
  title: string,
  price: number,
  clipUrl: string
) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const channel = process.env.TELEGRAM_CHANNEL_ID?.trim();
  if (!token || !channel) return;

  const admin = createAdminClient();
  const { data: listing } = await admin
    .from("listings")
    .select("telegram_message_id")
    .eq("id", listingId)
    .maybeSingle();

  const replyTo = listing?.telegram_message_id as number | null | undefined;
  const url = siteListingUrl(listingId);

  try {
    const body: Record<string, unknown> = {
      chat_id: channel,
      video: clipUrl,
      caption: `🎬 ${title}\n💰 ${formatPriceRub(price)}`,
      supports_streaming: true,
      // Buttons already on the main card — keep clip clean
    };
    if (replyTo) {
      body.reply_parameters = {
        message_id: replyTo,
        allow_sending_without_reply: true,
      };
    } else {
      body.reply_markup = {
        inline_keyboard: [[{ text: "Открыть на Boro →", url }]],
      };
    }

    const res = await fetch(`https://api.telegram.org/bot${token}/sendVideo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      result?: { message_id?: number };
    };
    if (json.ok && json.result?.message_id) {
      await appendTelegramMessageId(listingId, json.result.message_id);
    }
  } catch (e) {
    console.error("telegram sendVideo failed", e);
  }
}

/**
 * Fire-and-forget clip render. Safe to call without await from API.
 */
export function enqueueClipRender(input: {
  listingId: string;
  title: string;
  price: number;
  imageUrls: string[];
  userId: string;
}) {
  void (async () => {
    const { listingId, title, price, imageUrls, userId } = input;
    try {
      await setClipStatus(listingId, "pending");
      const mp4 = await renderPhotoClip({
        imageUrls,
        title,
        priceLabel: formatPriceRub(price),
      });
      const admin = createAdminClient();
      const path = `${userId}/${listingId}/clip.mp4`;
      const { error: upError } = await admin.storage
        .from("listing-media")
        .upload(path, mp4, {
          contentType: "video/mp4",
          upsert: true,
          cacheControl: "3600",
        });
      if (upError) throw new Error(upError.message);

      const { data } = admin.storage.from("listing-media").getPublicUrl(path);
      await setClipStatus(listingId, "ready", data.publicUrl);

      await admin.from("listing_media").insert({
        listing_id: listingId,
        type: "video",
        url: data.publicUrl,
        sort_order: 100,
        poster_url: imageUrls[0] || null,
      });

      await postClipToTelegram(listingId, title, price, data.publicUrl);
    } catch (e) {
      console.error("clip render failed", listingId, e);
      await setClipStatus(listingId, "failed", null);
    }
  })();
}
