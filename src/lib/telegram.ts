import { createAdminClient } from "@/lib/supabase/admin";
import { formatPriceRub } from "@/lib/money";

type PostInput = {
  title: string;
  price: number;
  description?: string | null;
  photoUrls: string[];
  listingUrl: string;
  sellerName: string;
  city: string;
};

export type TelegramPostResult = {
  messageIds: number[];
  promoMessageId: number | null;
};

function tgConfig() {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const channel = process.env.TELEGRAM_CHANNEL_ID?.trim();
  if (!token || !channel) return null;
  return { token, channel };
}

async function tgApi<T = unknown>(
  token: string,
  method: string,
  body: Record<string, unknown>
): Promise<{ ok: boolean; description?: string; result?: T }> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json();
}

function buildCaption(input: PostInput) {
  return [
    `🛍 ${input.title}`,
    `💰 ${formatPriceRub(input.price)}`,
    `📍 ${input.city} · ${input.sellerName}`,
    input.description?.trim()
      ? `\n${input.description.trim().slice(0, 350)}`
      : "",
  ]
    .filter(Boolean)
    .join("\n")
    .slice(0, 900);
}

const NEW_LISTING_URL = "https://boro.proektmap.ru/new";

/** One row: open listing + soft promo CTA (no separate promo post). */
function cardButtons(listingUrl: string) {
  return {
    inline_keyboard: [
      [
        { text: "Открыть на Boro →", url: listingUrl },
        { text: "Добавить своё", url: NEW_LISTING_URL },
      ],
    ],
  };
}

export async function postListingToTelegram(
  input: PostInput
): Promise<TelegramPostResult | null> {
  const cfg = tgConfig();
  if (!cfg) return null;

  const caption = buildCaption(input);
  const photos = input.photoUrls.slice(0, 10);
  if (photos.length === 0) return null;

  const messageIds: number[] = [];
  const buttons = cardButtons(input.listingUrl);

  try {
    if (photos.length === 1) {
      // True one-card post: photo + caption + both buttons
      const data = await tgApi<{ message_id: number }>(cfg.token, "sendPhoto", {
        chat_id: cfg.channel,
        photo: photos[0],
        caption,
        reply_markup: buttons,
      });
      if (!data.ok || !data.result?.message_id) {
        console.error("telegram sendPhoto:", data.description);
        return null;
      }
      messageIds.push(data.result.message_id);
    } else {
      // Media group cannot carry buttons — album + one dual-button strip
      const media = photos.map((url, i) => ({
        type: "photo" as const,
        media: url,
        ...(i === 0 ? { caption } : {}),
      }));

      const data = await tgApi<Array<{ message_id: number }>>(
        cfg.token,
        "sendMediaGroup",
        { chat_id: cfg.channel, media }
      );

      if (!data.ok || !data.result?.length) {
        console.error("telegram sendMediaGroup:", data.description);
        return null;
      }
      messageIds.push(...data.result.map((m) => m.message_id));

      const btn = await tgApi<{ message_id: number }>(cfg.token, "sendMessage", {
        chat_id: cfg.channel,
        text: "👇 Открыть лот или добавить своё",
        reply_markup: buttons,
        reply_parameters: {
          message_id: messageIds[0],
          allow_sending_without_reply: true,
        },
      });
      if (btn.ok && btn.result?.message_id) {
        messageIds.push(btn.result.message_id);
      }
    }

    return { messageIds, promoMessageId: null };
  } catch (e) {
    console.error("telegram post failed", e);
    return null;
  }
}

/** Mark channel post as sold (keep album, add ✅ emblem). */
export async function markTelegramSold(
  messageIds: number[] | null | undefined,
  primaryId?: number | null
): Promise<void> {
  const cfg = tgConfig();
  if (!cfg) return;

  const ids = messageIds?.length
    ? messageIds
    : primaryId
      ? [primaryId]
      : [];
  if (!ids.length) return;

  const anchorId = ids[0];

  try {
    await tgApi(cfg.token, "sendMessage", {
      chat_id: cfg.channel,
      text: "✅ ПРОДАНО",
      reply_parameters: {
        message_id: anchorId,
        allow_sending_without_reply: true,
      },
    });
  } catch (e) {
    console.error("telegram sold badge failed", e);
  }

  // Best-effort: flip inline buttons on the card / button-strip message
  const soldMarkup = {
    inline_keyboard: [
      [{ text: "✅ Продано", url: "https://boro.proektmap.ru" }],
    ],
  };
  for (const message_id of ids) {
    try {
      await tgApi(cfg.token, "editMessageReplyMarkup", {
        chat_id: cfg.channel,
        message_id,
        reply_markup: soldMarkup,
      });
    } catch {
      // album frames have no markup — ok
    }
  }
}

/** Hard-delete all related channel messages. */
export async function deleteTelegramMessages(
  messageIds: number[] | null | undefined,
  primaryId?: number | null
): Promise<void> {
  const cfg = tgConfig();
  if (!cfg) return;

  const ids = [
    ...(messageIds || []),
    ...(primaryId ? [primaryId] : []),
  ].filter((v, i, a) => a.indexOf(v) === i);

  for (const message_id of ids) {
    try {
      await tgApi(cfg.token, "deleteMessage", {
        chat_id: cfg.channel,
        message_id,
      });
    } catch (e) {
      console.error("telegram delete failed", message_id, e);
    }
  }
}

/** @deprecated use deleteTelegramMessages */
export async function deleteTelegramMessage(
  messageId: number | null | undefined
): Promise<void> {
  await deleteTelegramMessages(null, messageId);
}

export function siteListingUrl(listingId: string) {
  const base =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "https://boro.proektmap.ru";
  return `${base}/i/${listingId}`;
}

export async function saveTelegramMessageIds(
  listingId: string,
  result: TelegramPostResult | null
) {
  if (!result?.messageIds?.length) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("listings")
    .update({
      telegram_message_id: result.messageIds[0],
      telegram_message_ids: result.messageIds,
    })
    .eq("id", listingId);

  // Column missing until SQL migration — keep at least primary id
  if (error) {
    await admin
      .from("listings")
      .update({ telegram_message_id: result.messageIds[0] })
      .eq("id", listingId);
  }
}

/** @deprecated */
export async function saveTelegramMessageId(
  listingId: string,
  messageId: number | null
) {
  if (!messageId) return;
  await saveTelegramMessageIds(listingId, {
    messageIds: [messageId],
    promoMessageId: null,
  });
}
