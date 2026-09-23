import { NextResponse } from "next/server";
import sharp from "sharp";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const revalidate = 3600;

/** VK link snippet: ratio 1:1 … 1:2.5, min width 500. Landscape 1200×630 is safe. */
const W = 1200;
const H = 630;

/**
 * Landscape JPEG for VK share.php / OG.
 * Portrait listing photos fail VK `link_photo_sizing_rule` and the share
 * dialog collapses to «только сообщения».
 */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    const admin = createAdminClient();
    const { data: media } = await admin
      .from("listing_media")
      .select("url, type, sort_order")
      .eq("listing_id", id)
      .order("sort_order", { ascending: true })
      .limit(8);

    const photoUrl =
      media?.find((m) => m.type === "image")?.url || media?.[0]?.url;
    if (!photoUrl) {
      return new NextResponse("No photo", { status: 404 });
    }

    const imgRes = await fetch(photoUrl, { next: { revalidate: 3600 } });
    if (!imgRes.ok) {
      return new NextResponse("Photo fetch failed", { status: 502 });
    }
    const buf = Buffer.from(await imgRes.arrayBuffer());

    const out = await sharp(buf)
      .rotate()
      .resize(W, H, { fit: "cover", position: "centre" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();

    return new NextResponse(new Uint8Array(out), {
      status: 200,
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (e) {
    console.error("og/vk", e);
    return new NextResponse("Error", { status: 500 });
  }
}
