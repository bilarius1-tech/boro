import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { listingSchema } from "@/lib/validation";

export const runtime = "nodejs";

const MAX_FILES = 7;
const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, username, display_name, city")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: "Сначала заполните профиль" },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const title = formData.get("title");
    const description = formData.get("description") || "";
    const price = formData.get("price");
    const files = formData
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0);

    if (files.length === 0) {
      return NextResponse.json(
        { error: "Добавьте хотя бы одно фото" },
        { status: 400 }
      );
    }
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Максимум ${MAX_FILES} фото` },
        { status: 400 }
      );
    }

    for (const file of files) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "Фото слишком большое даже после сжатия" },
          { status: 400 }
        );
      }
    }

    // Upload via service role (user already verified) — avoids flaky browser storage auth
    const admin = createAdminClient();
    const batch = crypto.randomUUID();
    const urls: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const path = `${profile.id}/${batch}/${String(i).padStart(2, "0")}.jpg`;
      const buffer = Buffer.from(await file.arrayBuffer());

      const { error: upError } = await admin.storage
        .from("listing-media")
        .upload(path, buffer, {
          contentType: "image/jpeg",
          upsert: false,
          cacheControl: "3600",
        });

      if (upError) {
        return NextResponse.json(
          { error: `Загрузка фото ${i + 1}: ${upError.message}` },
          { status: 500 }
        );
      }

      const { data } = admin.storage.from("listing-media").getPublicUrl(path);
      urls.push(data.publicUrl);
    }

    const parsed = listingSchema.safeParse({
      title,
      description,
      price,
      mediaUrls: urls,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Проверьте поля" },
        { status: 400 }
      );
    }

    const wantClip = formData.get("want_clip") === "1" && urls.length >= 2;

    const baseInsert = {
      user_id: profile.id,
      title: parsed.data.title,
      description: parsed.data.description || null,
      price: parsed.data.price,
      status: "ACTIVE" as const,
    };

    let { data: listing, error } = await admin
      .from("listings")
      .insert(wantClip ? { ...baseInsert, clip_status: "pending" } : baseInsert)
      .select("id")
      .single();

    // Retry without clip columns if SQL migration not applied yet
    if (error?.message?.includes("clip_")) {
      ({ data: listing, error } = await admin
        .from("listings")
        .insert(baseInsert)
        .select("id")
        .single());
    }

    if (error || !listing) {
      return NextResponse.json(
        { error: error?.message || "Не удалось создать лот" },
        { status: 500 }
      );
    }

    const { error: mediaError } = await admin.from("listing_media").insert(
      urls.map((url, index) => ({
        listing_id: listing.id,
        type: "image" as const,
        url,
        sort_order: index,
      }))
    );

    if (mediaError) {
      await admin.from("listings").delete().eq("id", listing.id);
      return NextResponse.json(
        { error: mediaError.message || "Не удалось сохранить фото" },
        { status: 500 }
      );
    }

    // Best-effort Telegram channel mirror (skip if env not set)
    try {
      const {
        postListingToTelegram,
        saveTelegramMessageIds,
        siteListingUrl,
      } = await import("@/lib/telegram");

      const listingUrl = siteListingUrl(listing.id);
      const posted = await postListingToTelegram({
        title: parsed.data.title,
        price: parsed.data.price,
        description: parsed.data.description,
        photoUrls: urls,
        listingUrl,
        sellerName: profile.display_name,
        city: profile.city || "Боровичи",
      });
      await saveTelegramMessageIds(listing.id, posted);

      const { postListingToVk, saveVkPostId } = await import("@/lib/vk");
      const vkPosted = await postListingToVk({
        title: parsed.data.title,
        price: parsed.data.price,
        description: parsed.data.description,
        photoUrls: urls,
        listingUrl,
        sellerName: profile.display_name,
        city: profile.city || "Боровичи",
      });
      await saveVkPostId(listing.id, vkPosted);
    } catch (e) {
      console.error("social mirror skipped", e);
    }

    if (wantClip) {
      const { enqueueClipRender } = await import("@/lib/clip/enqueue");
      enqueueClipRender({
        listingId: listing.id,
        title: parsed.data.title,
        price: parsed.data.price,
        imageUrls: urls,
        userId: profile.id,
      });
    }

    return NextResponse.json({
      id: listing.id,
      clip: wantClip ? "pending" : "none",
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
