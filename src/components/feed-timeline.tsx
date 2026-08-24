"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FeedItem } from "@/components/feed-item";
import type { ListingWithMedia } from "@/lib/types";

type FeedResponse = {
  items: ListingWithMedia[];
  nextCursor: string | null;
};

export function FeedTimeline({
  initialItems,
  initialCursor,
}: {
  initialItems: ListingWithMedia[];
  initialCursor: string | null;
}) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(initialCursor);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(!initialCursor);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const loadMore = useCallback(async () => {
    if (loading || done || !cursor) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/feed?cursor=${encodeURIComponent(cursor)}&limit=8`
      );
      const data = (await res.json()) as FeedResponse;
      setItems((prev) => {
        const seen = new Set(prev.map((i) => i.id));
        return [...prev, ...data.items.filter((i) => !seen.has(i.id))];
      });
      setCursor(data.nextCursor);
      if (!data.nextCursor) setDone(true);
    } catch {
      // keep sentinel; user can scroll again
    } finally {
      setLoading(false);
    }
  }, [cursor, done, loading]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || done) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore();
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(node);
    return () => io.disconnect();
  }, [loadMore, done]);

  if (items.length === 0) {
    return (
      <div className="px-5 py-16 text-center">
        <p className="text-base font-medium tracking-tight">
          Лента Боровичей ещё пустая
        </p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Скоро тут можно будет залипнуть на объявлениях города. Пока — бета:
          сохрани ссылку и загляни позже.
        </p>
      </div>
    );
  }

  return (
    <div>
      {items.map((listing) => (
        <FeedItem key={listing.id} listing={listing} />
      ))}
      <div ref={sentinelRef} className="flex h-16 items-center justify-center">
        {loading ? (
          <p className="text-xs text-muted-foreground">Ещё лоты…</p>
        ) : done ? (
          <p className="text-xs text-muted-foreground">Это всё на сейчас</p>
        ) : null}
      </div>
    </div>
  );
}
