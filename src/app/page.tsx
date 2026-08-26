import Link from "next/link";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { FeedTimeline } from "@/components/feed-timeline";
import { PwaInstallButton } from "@/components/pwa-install";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_CITY,
  SITE_BETA,
  SITE_NAME,
  SITE_OFFER,
  SITE_TAGLINE,
} from "@/lib/constants";
import { getFeedPage } from "@/lib/listings";
import { getCurrentProfile, getSessionUser } from "@/lib/profile";

export const metadata: Metadata = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description: SITE_OFFER,
};

export default async function Home() {
  const user = await getSessionUser();
  const profile = user ? await getCurrentProfile() : null;
  const { items, nextCursor } = await getFeedPage({ limit: 8 });

  return (
    <AppShell username={profile?.username}>
      <header className="sticky top-0 z-30 border-b border-border/60 bg-background/90 px-5 py-3 backdrop-blur-md">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-medium tracking-[0.14em] text-muted-foreground uppercase">
              {DEFAULT_CITY}
            </p>
            <p className="text-xl font-semibold tracking-tight">{SITE_NAME}</p>
          </div>
          {profile ? (
            <Button asChild size="sm" className="h-9 rounded-full px-4">
              <Link href="/new">+ Разместить</Link>
            </Button>
          ) : (
            <Button asChild size="sm" variant="outline" className="h-9 rounded-full px-4">
              <Link href="/signup">Войти в бету</Link>
            </Button>
          )}
        </div>
      </header>

      <section className="space-y-3 px-5 py-6">
        <h1 className="text-[1.75rem] leading-tight font-semibold tracking-tight text-balance">
          {SITE_TAGLINE}
        </h1>
        <p className="max-w-md text-[15px] leading-relaxed text-muted-foreground">
          {SITE_OFFER}
        </p>
        <p className="rounded-xl bg-muted/70 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {SITE_BETA}
        </p>

        <div className="space-y-2 pt-1">
          <PwaInstallButton className="h-11 w-full" />
          <p className="text-center text-[11px] text-muted-foreground">
            Установи Boro на телефон — иконка на экране, сразу в ленту города
          </p>
        </div>

        {!profile ? (
          <div className="flex gap-2 pt-1">
            <Button asChild className="h-11 flex-1">
              <Link href="/signup">Разместить</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 flex-1">
              <Link href="#feed">Смотреть ленту</Link>
            </Button>
          </div>
        ) : null}
      </section>

      <div id="feed">
        <div className="flex items-center justify-between border-y border-border/70 px-5 py-2.5">
          <p className="text-sm font-medium">Лента города</p>
          <p className="text-xs text-muted-foreground">{DEFAULT_CITY}</p>
        </div>
        <FeedTimeline initialItems={items} initialCursor={nextCursor} />
      </div>
    </AppShell>
  );
}
