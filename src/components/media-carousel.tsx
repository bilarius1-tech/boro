"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListingMedia } from "@/lib/types";

export function MediaCarousel({
  media,
  alt,
  className,
}: {
  media: ListingMedia[];
  alt: string;
  className?: string;
}) {
  const slides = useMemo(
    () => media.filter((m) => m.type === "image"),
    [media]
  );
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || slides.length <= 1) return;

    let raf = 0;
    function onScroll() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const node = scrollerRef.current;
        if (!node) return;
        const w = node.clientWidth || 1;
        const next = Math.round(node.scrollLeft / w);
        setIndex(Math.min(Math.max(next, 0), slides.length - 1));
      });
    }

    el.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll);
    };
  }, [slides.length]);

  if (!slides.length) {
    return (
      <div
        className={cn(
          "flex aspect-[4/5] items-center justify-center bg-muted text-sm text-muted-foreground",
          className
        )}
      >
        Нет фото
      </div>
    );
  }

  function goTo(i: number) {
    const el = scrollerRef.current;
    if (!el) return;
    const next = (i + slides.length) % slides.length;
    el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    setIndex(next);
  }

  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <div
        ref={scrollerRef}
        className="flex aspect-[4/5] w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
      >
        {slides.map((slide, i) => (
          <div
            key={slide.id}
            className="relative aspect-[4/5] w-full shrink-0 snap-center snap-always"
          >
            <Image
              src={slide.url}
              alt={`${alt} — ${i + 1}`}
              fill
              className="pointer-events-none select-none object-cover"
              sizes="(max-width: 512px) 100vw, 512px"
              priority={i === 0}
              loading={i === 0 ? "eager" : "lazy"}
              draggable={false}
              unoptimized
            />
          </div>
        ))}
      </div>

      {slides.length > 1 ? (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="absolute top-1/2 left-2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
            aria-label="Предыдущее фото"
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="absolute top-1/2 right-2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
            aria-label="Следующее фото"
          >
            <ChevronRight className="size-5" />
          </button>
          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
            {slides.map((s, i) => (
              <button
                key={s.id}
                type="button"
                onClick={() => goTo(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-5 bg-white" : "w-1.5 bg-white/50"
                )}
                aria-label={`Фото ${i + 1}`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
