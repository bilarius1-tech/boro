import { createAdminClient } from "@/lib/supabase/admin";
import { formatPriceRub } from "@/lib/money";

const VK_API = "https://api.vk.com/method";
const VK_VERSION = "5.199";

type PostInput = {
  title: string;
  price: number;
  description?: string | null;
  photoUrls: string[];
  listingUrl: string;
  sellerName: string;
  city: string;
};

export type VkPostResult = {
  postId: number;
  ownerId: number;
};

/**
 * Full cycle (photos in post + wall.edit/delete) needs VK_USER_ACCESS_TOKEN
 * (user token of a group admin, scopes: wall,photos,offline,groups).
 * Community key alone can only wall.post text + comments.
 */
function vkConfig() {
  const communityToken = process.env.VK_ACCESS_TOKEN?.trim() || null;
  const userToken = process.env.VK_USER_ACCESS_TOKEN?.trim() || null;
  if (!communityToken && !userToken) return null;
  const groupIdRaw = process.env.VK_GROUP_ID?.trim();
  const screen =
    process.env.VK_GROUP_SCREEN_NAME?.trim() || "borovichi_site";
  return {
    communityToken,
    userToken,
    /** Prefer user token for wall/photos; fall back to community */
    token: userToken || communityToken!,
    groupId: groupIdRaw ? Number(groupIdRaw) : null,
    screen,
  };
}

async function vkCall<T>(
  method: string,
  params: Record<string, string | number | undefined>,
  tokenOverride?: string | null
): Promise<T> {
  const cfg = vkConfig();
  if (!cfg) throw new Error("VK not configured");
  const token = tokenOverride || cfg.token;

  const body = new URLSearchParams();
  body.set("access_token", token);
  body.set("v", VK_VERSION);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") body.set(k, String(v));
  }

  const res = await fetch(`${VK_API}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as {
    response?: T;
    error?: { error_msg?: string; error_code?: number };
  };
  if (json.error) {
    throw new Error(
      `VK ${method}: ${json.error.error_msg || json.error.error_code}`
    );
  }
  return json.response as T;
}

async function resolveGroupId(): Promise<number> {
  const cfg = vkConfig();
  if (!cfg) throw new Error("VK not configured");
  if (cfg.groupId && Number.isFinite(cfg.groupId)) return cfg.groupId;

  const resolved = await vkCall<{ type: string; object_id: number } | undefined>(
    "utils.resolveScreenName",
    { screen_name: cfg.screen }
  );
  if (!resolved || resolved.type !== "group" || !resolved.object_id) {
    throw new Error(`VK group not found: ${cfg.screen}`);
  }
  return resolved.object_id;
}

function buildMessage(input: PostInput) {
  const lines = [
    `🛍 ${input.title}`,
    `💰 ${formatPriceRub(input.price)}`,
    `📍 ${input.city} · ${input.sellerName}`,
    input.description?.trim()
      ? `\n${input.description.trim().slice(0, 500)}`
      : "",
    "",
    input.listingUrl,
    "",
    "Боровичи · хочешь выложить своё?",
    "boro.proektmap.ru — фото, цена, и готово.",
  ];
  return lines.join("\n").slice(0, 3500);
}

async function uploadWallPhoto(
  groupId: number,
  imageUrl: string,
  userToken: string
): Promise<string | null> {
  try {
    const server = await vkCall<{ upload_url: string }>(
      "photos.getWallUploadServer",
      { group_id: groupId },
      userToken
    );

    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) return null;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    const form = new FormData();
    form.append(
      "photo",
      new Blob([new Uint8Array(buf)], { type: "image/jpeg" }),
      "photo.jpg"
    );

    const upRes = await fetch(server.upload_url, { method: "POST", body: form });
    const upJson = (await upRes.json()) as {
      server?: number;
      photo?: string;
      hash?: string;
    };
    if (!upJson.photo || !upJson.hash || upJson.server == null) return null;

    const saved = await vkCall<Array<{ id: number; owner_id: number }>>(
      "photos.saveWallPhoto",
      {
        group_id: groupId,
        photo: upJson.photo,
        server: upJson.server,
        hash: upJson.hash,
      },
      userToken
    );

    const photo = saved?.[0];
    if (!photo) return null;
    return `photo${photo.owner_id}_${photo.id}`;
  } catch (e) {
    console.error("vk photo upload failed", e);
    return null;
  }
}

function photoAttachmentsFromPost(item: {
  attachments?: Array<{
    type?: string;
    photo?: { owner_id: number; id: number; access_key?: string };
  }>;
}): string {
  const atts: string[] = [];
  for (const a of item.attachments || []) {
    if (a.type === "photo" && a.photo) {
      const key = a.photo.access_key ? `_${a.photo.access_key}` : "";
      atts.push(`photo${a.photo.owner_id}_${a.photo.id}${key}`);
    }
  }
  return atts.join(",");
}

/** Mirror listing to VK community wall. */
export async function postListingToVk(
  input: PostInput
): Promise<VkPostResult | null> {
  if (!vkConfig()) return null;

  try {
    const cfg = vkConfig()!;
    const groupId = await resolveGroupId();
    const ownerId = -groupId;
    const attachments: string[] = [];

    if (cfg.userToken) {
      for (const url of input.photoUrls.slice(0, 10)) {
        const att = await uploadWallPhoto(groupId, url, cfg.userToken);
        if (att) attachments.push(att);
      }
    } else {
      console.warn(
        "VK: нет VK_USER_ACCESS_TOKEN — пост без вложений (только ссылка)"
      );
    }

    // Post as group: user token (admin) preferred so attachments stick
    const postToken = cfg.userToken || cfg.communityToken!;
    const post = await vkCall<{ post_id: number }>(
      "wall.post",
      {
        owner_id: ownerId,
        from_group: 1,
        message: buildMessage(input),
        attachments: attachments.length ? attachments.join(",") : undefined,
        guid: `boro-${Date.now()}`,
      },
      postToken
    );

    if (!post?.post_id) return null;
    return { postId: post.post_id, ownerId };
  } catch (e) {
    console.error("vk post failed", e);
    return null;
  }
}

export async function saveVkPostId(
  listingId: string,
  result: VkPostResult | null
) {
  if (!result) return;
  const admin = createAdminClient();
  const { error } = await admin
    .from("listings")
    .update({ vk_post_id: result.postId, vk_owner_id: result.ownerId })
    .eq("id", listingId);

  if (error) {
    console.error("vk_post_id save", error.message);
  }
}

/** Full cycle: edit caption with ✅. Fallback: group comment. */
export async function markVkSold(
  postId: number | null | undefined,
  ownerId?: number | null
): Promise<void> {
  if (!vkConfig() || !postId) return;
  try {
    const cfg = vkConfig()!;
    const groupId = ownerId && ownerId < 0 ? -ownerId : await resolveGroupId();
    const oid = ownerId ?? -groupId;

    if (cfg.userToken) {
      const got = await vkCall<
        | Array<{ text?: string; attachments?: unknown[] }>
        | { items?: Array<{ text?: string; attachments?: unknown[] }> }
      >("wall.getById", { posts: `${oid}_${postId}` }, cfg.userToken);

      const item = (Array.isArray(got) ? got[0] : got?.items?.[0]) as
        | {
            text?: string;
            attachments?: Array<{
              type?: string;
              photo?: { owner_id: number; id: number; access_key?: string };
            }>;
          }
        | undefined;

      const prev = item?.text?.trim() || "";
      const next = prev.includes("✅ ПРОДАНО")
        ? prev
        : `✅ ПРОДАНО\n\n${prev}`.slice(0, 3500);
      const attachments = item ? photoAttachmentsFromPost(item) : "";

      await vkCall(
        "wall.edit",
        {
          owner_id: oid,
          post_id: postId,
          message: next,
          attachments: attachments || undefined,
        },
        cfg.userToken
      );
      return;
    }

    await vkCall(
      "wall.createComment",
      {
        owner_id: oid,
        post_id: postId,
        from_group: groupId,
        message: "✅ ПРОДАНО",
      },
      cfg.communityToken
    );
  } catch (e) {
    console.error("vk mark sold failed", e);
  }
}

/** Full cycle: hard-delete. Fallback: group comment. */
export async function deleteVkPost(
  postId: number | null | undefined,
  ownerId?: number | null
): Promise<void> {
  if (!vkConfig() || !postId) return;
  try {
    const cfg = vkConfig()!;
    const groupId = ownerId && ownerId < 0 ? -ownerId : await resolveGroupId();
    const oid = ownerId ?? -groupId;

    if (cfg.userToken) {
      await vkCall(
        "wall.delete",
        { owner_id: oid, post_id: postId },
        cfg.userToken
      );
      return;
    }

    await vkCall(
      "wall.createComment",
      {
        owner_id: oid,
        post_id: postId,
        from_group: groupId,
        message: "🚫 Снято с Boro",
      },
      cfg.communityToken
    );
  } catch (e) {
    console.error("vk delete failed", e);
  }
}

/** True when photos + edit/delete are available. */
export function vkFullCycleReady() {
  return Boolean(process.env.VK_USER_ACCESS_TOKEN?.trim());
}
