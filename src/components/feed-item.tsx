import Link from "next/link";
import Image from "next/image";
import { formatPriceRub } from "@/lib/money";
import type { ListingWithMedia, Profile } from "@/lib/types";

export function FeedItem({ listing }: { listing: ListingWithMedia }) {
  const cover =
    listing.listing_media.find((m) => m.type === "image")?.url ||
    listing.listing_media[0]?.url;
  const seller = listing.profiles as Profile | undefined;

  return (
    <article className="border-b border-border/70">
      <Link href={`/i/${listing.id}`} className="block">
        <div className="relative aspect-[4/5] w-full bg-muted">
          {cover ? (
            <Image
              src={cover}
              alt={listing.title}
              fill
              className="object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
              unoptimized
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-4 pb-4 pt-16 text-white">
            <p className="text-lg font-semibold tracking-tight">
              {formatPriceRub(listing.price)}
            </p>
            <h2 className="mt-0.5 line-clamp-2 text-base font-medium leading-snug">
              {listing.title}
            </h2>
          </div>
        </div>
      </Link>
      {seller ? (
        <div className="flex items-center justify-between px-4 py-3">
          <Link
            href={`/u/${seller.username}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {seller.display_name}
            <span className="text-muted-foreground/80"> · @{seller.username}</span>
          </Link>
          <Link
            href={`/i/${listing.id}`}
            className="text-sm font-medium text-foreground"
          >
            Открыть
          </Link>
        </div>
      ) : null}
    </article>
  );
}
