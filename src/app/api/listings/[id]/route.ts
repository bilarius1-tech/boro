import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { storagePathFromPublicUrl } from "@/lib/storage-paths";
import { z } from "zod";

export const runtime = "nodejs";

const MAX_FILES = 7;
const MAX_BYTES = 8 * 1024 * 1024;

const editBodySchema = z.object({
  title: z.string().trim().min(2, "Название слишком короткое").max(80),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.coerce
    .number({ error: "Укажите цену" })
    .int("Цена — целое число")
    .min(0, "Цена не может быть отрицательной")
    .max(10_000_000, "Слишком большая цена"),
});

type ManifestItem =
  | { type: "existing"; id: string; url: string }
  | { type: "new"; fileIndex: number };

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: listingId } = await params;
    if (!listingId) {
      return NextResponse.json({ error: "Лот не указан" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Нужно войти" }, { status: 401 });
    }

    const { data: listing, error: listingError } = await supabase
      .from("listings")
      .select("id, user_id")
      .eq("id", listingId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Объявление не найдено или нет прав" },
        { status: 404 }
      );
    }

    const formData = await request.formData();
    const title = formData.get("title");
    const description = formData.get("description") || "";
    const price = formData.get("price");
    const rawManifest = formData.get("photos_manifest");

    const parsedFields = editBodySchema.safeParse({
      title,
      description,
      price,
    });

    if (!parsedFields.success) {
      return NextResponse.json(
        { error: parsedFields.error.issues[0]?.message || "Проверьте поля" },
        { status: 400 }
      );
    }

    let manifest: ManifestItem[] = [];
    if (typeof rawManifest === "string" && rawManifest) {
      try {
        manifest = JSON.parse(rawManifest);
      } catch {
        return NextResponse.json(
          { error: "Некорректный список фото" },
          { status: 400 }
        );
      }
    }

    if (manifest.length === 0) {
      return NextResponse.json(
        { error: "Должно остаться хотя бы одно фото" },
        { status: 400 }
      );
    }

    if (manifest.length > MAX_FILES) {
      return NextResponse.json(
        { error: `Максимум ${MAX_FILES} фото` },
        { status: 400 }
      );
    }

    const newFiles = formData
      .getAll("photos")
      .filter((f): f is File => f instanceof File && f.size > 0);

    for (const file of newFiles) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json(
          { error: "Одно из новых фото слишком большое" },
          { status: 400 }
        );
      }
    }

    const admin = createAdminClient();

    // 1. Upload new photos
    const newUploadedUrls: Record<number, string> = {};
    const batch = crypto.randomUUID();

    for (let i = 0; i < newFiles.length; i++) {
      const file = newFiles[i];
      const path = `${user.id}/${listingId}/${batch}-${String(i).padStart(2, "0")}.jpg`;
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
          { error: `Ошибка загрузки фото: ${upError.message}` },
          { status: 500 }
        );
      }

      const { data } = admin.storage.from("listing-media").getPublicUrl(path);
      newUploadedUrls[i] = data.publicUrl;
    }

    // 2. Fetch existing media to detect removed photos
    const { data: currentMedia } = await admin
      .from("listing_media")
      .select("id, url")
      .eq("listing_id", listingId);

    const keptExistingIds = new Set(
      manifest
        .filter((item): item is { type: "existing"; id: string; url: string } => item.type === "existing")
        .map((item) => item.id)
    );

    const removedMedia = (currentMedia || []).filter(
      (m) => !keptExistingIds.has(m.id)
    );

    if (removedMedia.length > 0) {
      const removedIds = removedMedia.map((m) => m.id);
      await admin.from("listing_media").delete().in("id", removedIds);

      const removedPaths = removedMedia
        .map((m) => storagePathFromPublicUrl(m.url))
        .filter((p): p is string => Boolean(p));

      if (removedPaths.length > 0) {
        await admin.storage.from("listing-media").remove(removedPaths);
      }
    }

    // 3. Update existing media sort order & insert new media rows
    for (let index = 0; index < manifest.length; index++) {
      const item = manifest[index];
      if (item.type === "existing") {
        await admin
          .from("listing_media")
          .update({ sort_order: index })
          .eq("id", item.id);
      } else if (item.type === "new") {
        const url = newUploadedUrls[item.fileIndex];
        if (url) {
          await admin.from("listing_media").insert({
            listing_id: listingId,
            type: "image",
            url,
            sort_order: index,
          });
        }
      }
    }

    // 4. Update listing details
    const { error: updateError } = await admin
      .from("listings")
      .update({
        title: parsedFields.data.title,
        description: parsedFields.data.description || null,
        price: parsedFields.data.price,
      })
      .eq("id", listingId);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Не удалось сохранить изменения" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, id: listingId });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Ошибка сервера";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
