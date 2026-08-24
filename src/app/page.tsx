import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DEFAULT_CITY, SITE_NAME, SITE_TAGLINE } from "@/lib/constants";
import { getCurrentProfile, getSessionUser } from "@/lib/profile";

export default async function Home() {
  const user = await getSessionUser();
  const profile = user ? await getCurrentProfile() : null;

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col justify-between px-5 py-8">
      <header className="space-y-2 pt-6">
        <p className="text-sm font-medium tracking-wide text-muted-foreground uppercase">
          {DEFAULT_CITY}
        </p>
        <h1 className="text-4xl font-semibold tracking-tight text-foreground">
          {SITE_NAME}
        </h1>
        <p className="max-w-sm text-base leading-relaxed text-muted-foreground">
          {SITE_TAGLINE}. Сфоткал, написал пару слов, поставил цену — и лот в
          ленте и в Telegram-канале.
        </p>
      </header>

      <section className="space-y-3 py-10">
        {profile ? (
          <>
            <Button asChild className="h-12 w-full text-base">
              <Link href="/new">+ Добавить вещь</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 w-full text-base">
              <Link href={`/u/${profile.username}`}>Мой профиль</Link>
            </Button>
          </>
        ) : user ? (
          <Button asChild className="h-12 w-full text-base">
            <Link href="/onboarding">Заполнить профиль</Link>
          </Button>
        ) : (
          <>
            <Button asChild className="h-12 w-full text-base">
              <Link href="/signup">Создать аккаунт</Link>
            </Button>
            <Button asChild variant="outline" className="h-12 w-full text-base">
              <Link href="/login">Войти</Link>
            </Button>
          </>
        )}
        <p className="text-center text-xs text-muted-foreground">
          Phase 0 · личная барахолка {DEFAULT_CITY}
        </p>
      </section>

      <footer className="pb-2 text-center text-xs text-muted-foreground">
        boro.proektmap.ru · {DEFAULT_CITY}, Новгородская область
      </footer>
    </main>
  );
}
