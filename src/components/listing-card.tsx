import Link from "next/link";
import Image from "next/image";
import { formatPriceRub } from "@/lib/money";
import type { ListingWithMedia } from "@/lib/types";

export function ListingCard({ listing }: { listing: ListingWithMedia }) {
  const cover = listing.listing_media.find((m) => m.type === "image")?.url;
  const sold = listing.status === "SOLD";

  return (
    <Link
      href={`/i/${listing.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card"
    >
      <div className="relative aspect-[4/5] bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt={listing.title}
            fill
            className="object-cover transition-transform group-hover:scale-[1.02]"
            sizes="(max-width: 512px) 50vw, 240px"
            unoptimized
          />
        ) : null}
        {sold ? (
          <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] text-white">
            Продано
          </span>
        ) : null}
      </div>
      <div className="space-y-0.5 p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug">
          {listing.title}
        </p>
        <p className="text-sm font-semibold">{formatPriceRub(listing.price)}</p>
      </div>
    </Link>
  );
}
