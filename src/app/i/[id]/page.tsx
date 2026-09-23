import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { Button } from "@/components/ui/button";
import { MediaCarousel } from "@/components/media-carousel";
import { ShareButton } from "@/components/share-button";
import { OwnerListingActions } from "@/components/owner-listing-actions";
import { AppShell } from "@/components/app-shell";
import { getListingById } from "@/lib/listings";
import { getCurrentProfile } from "@/lib/profile";
import { formatPriceRub } from "@/lib/money";
import { telegramLink, telLink, whatsappLink } from "@/lib/contacts";
import type { Profile } from "@/lib/types";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) return { title: "Лот не найден" };
  const price = formatPriceRub(listing.price);
  const title = `${listing.title} — ${price}`;
  const description =
    listing.description?.slice(0, 160) ||
    `${listing.title} за ${price} · Боровичи · Boro`;
  const pageUrl = `https://boro.proektmap.ru/i/${listing.id}`;
  // Landscape 1200×630 — portrait OG fails VK link_photo_sizing_rule
  const vkOg = `https://boro.proektmap.ru/api/og/vk/${listing.id}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: pageUrl,
      siteName: "Boro",
      locale: "ru_RU",
      images: [
        {
          url: vkOg,
          width: 1200,
          height: 630,
          alt: listing.title,
          type: "image/jpeg",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [vkOg],
    },
    other: {
      "vk:image": vkOg,
    },
  };
}

export default async function ListingPage({ params }: Props) {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) notFound();

  // Archived / non-active: only owner can open
  const me = await getCurrentProfile();
  const isOwner = me?.id === listing.user_id;
  if (listing.status !== "ACTIVE" && !isOwner) notFound();

  const seller = listing.profiles as Profile | undefined;
  if (!seller) notFound();

  const shareUrl = `https://boro.proektmap.ru/i/${listing.id}`;
  const shareTitle = `${listing.title} — ${formatPriceRub(listing.price)}`;
  const vkImageUrl = `https://boro.proektmap.ru/api/og/vk/${listing.id}`;
  const vkPostUrl =
    listing.vk_post_id && listing.vk_owner_id
      ? `https://vk.com/wall${listing.vk_owner_id}_${listing.vk_post_id}`
      : null;
  const contactText = `Привет! Интересует «${listing.title}» за ${formatPriceRub(listing.price)} на Boro`;

  return (
    <AppShell username={me?.username}>
    <main className="flex min-h-dvh w-full flex-col pb-28">
      <div className="flex items-center justify-between px-5 py-4">
        <Link
          href={`/u/${seller.username}`}
          className="text-sm text-muted-foreground"
        >
          ← {seller.display_name}
        </Link>
        <span className="text-sm text-muted-foreground">{seller.city}</span>
      </div>

      <MediaCarousel media={listing.listing_media} alt={listing.title} />

      <div className="space-y-3 px-5 pt-5">
        <h1 className="text-2xl font-semibold tracking-tight">
          {listing.title}
        </h1>
        <p className="text-2xl font-semibold">{formatPriceRub(listing.price)}</p>
        {listing.description ? (
          <p className="whitespace-pre-wrap text-base leading-relaxed text-foreground/90">
            {listing.description}
          </p>
        ) : null}

        <p className="text-sm text-muted-foreground">
          Продавец{" "}
          <Link href={`/u/${seller.username}`} className="underline">
            @{seller.username}
          </Link>
        </p>

        <ShareButton
          title={shareTitle}
          url={shareUrl}
          description={listing.description}
          vkImageUrl={vkImageUrl}
          vkPostUrl={vkPostUrl}
        />

        {listing.clip_status === "pending" ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">
            Клип собирается (обычно 15–40 сек). Обнови страницу через минуту.
          </p>
        ) : null}

        {listing.clip_status === "ready" && listing.clip_url ? (
          <div className="space-y-2 overflow-hidden rounded-2xl border border-border">
            <video
              src={listing.clip_url}
              controls
              playsInline
              poster={listing.listing_media.find((m) => m.type === "image")?.url}
              className="aspect-[9/16] max-h-[70vh] w-full bg-black object-contain"
            />
            <p className="px-3 pb-3 text-xs text-muted-foreground">
              Клип 9:16 — удобно кидать в Stories / MAX / VK
            </p>
          </div>
        ) : listing.clip_status === "failed" ? (
          <p className="rounded-xl border border-destructive/30 px-3 py-2 text-xs text-destructive">
            Клип не собрался — фото на месте, можно пользоваться объявлением.
          </p>
        ) : listing.listing_media.filter((m) => m.type === "image").length >=
          2 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
            В следующий раз выбери «Клип» при создании — сделаем слайдшоу с
            музыкой.
          </p>
        ) : null}

        {isOwner ? <OwnerListingActions listingId={listing.id} /> : null}
      </div>

      {!isOwner ? (
        <div
          className="fixed inset-x-0 z-30 border-t border-border bg-background/95 px-5 py-3 backdrop-blur"
          style={{ bottom: "calc(3.5rem + env(safe-area-inset-bottom))" }}
        >
          <div className="mx-auto flex w-full max-w-lg flex-col gap-2">
            {seller.whatsapp_number ? (
              <Button asChild className="h-12 w-full text-base">
                <a
                  href={whatsappLink(seller.whatsapp_number, contactText)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Написать в WhatsApp
                </a>
              </Button>
            ) : null}
            <div className="flex gap-2">
              {seller.phone ? (
                <Button asChild variant="outline" className="h-11 flex-1">
                  <a href={telLink(seller.phone)}>Позвонить</a>
                </Button>
              ) : null}
              {seller.telegram_handle ? (
                <Button asChild variant="outline" className="h-11 flex-1">
                  <a
                    href={telegramLink(seller.telegram_handle)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Telegram
                  </a>
                </Button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </main>
    </AppShell>
  );
}
