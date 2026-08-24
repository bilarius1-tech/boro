import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ListingCard } from "@/components/listing-card";
import { getCurrentProfile, getProfileByUsername } from "@/lib/profile";
import { getListingsByUserId } from "@/lib/listings";
import { telegramLink, telLink, whatsappLink } from "@/lib/contacts";
import { signOut } from "@/app/actions/auth";
import type { Metadata } from "next";

type Props = { params: Promise<{ username: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) return { title: "Профиль не найден" };
  return {
    title: `${profile.display_name} — Boro`,
    description:
      profile.bio ||
      `${profile.display_name} продаёт вещи в ${profile.city}`,
  };
}

export default async function PublicProfilePage({ params }: Props) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  if (!profile) notFound();

  const me = await getCurrentProfile();
  const isOwner = me?.id === profile.id;
  const listings = await getListingsByUserId(profile.id, {
    includeSold: false,
  });

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col px-5 py-8">
      <header className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{profile.city}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {profile.display_name}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">@{profile.username}</p>
        </div>
        <Link href="/" className="text-sm text-muted-foreground">
          Boro
        </Link>
      </header>

      {profile.bio ? (
        <p className="mt-5 text-base leading-relaxed text-foreground/90">
          {profile.bio}
        </p>
      ) : null}

      {isOwner ? (
        <div className="mt-6 flex flex-col gap-2">
          <Button asChild className="h-12 w-full text-base">
            <Link href="/new">+ Добавить вещь</Link>
          </Button>
          <Button asChild variant="outline" className="h-11 w-full">
            <Link href="/onboarding">Контакты и профиль</Link>
          </Button>
        </div>
      ) : (
        <section className="mt-8 space-y-3">
          <p className="text-sm font-medium text-muted-foreground">Связаться</p>
          <div className="flex flex-col gap-2">
            {profile.whatsapp_number ? (
              <Button asChild className="h-11 w-full">
                <a
                  href={whatsappLink(
                    profile.whatsapp_number,
                    `Привет! Пишу по объявлению на Boro (@${profile.username})`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WhatsApp
                </a>
              </Button>
            ) : null}
            {profile.phone ? (
              <Button asChild variant="outline" className="h-11 w-full">
                <a href={telLink(profile.phone)}>Позвонить</a>
              </Button>
            ) : null}
            {profile.telegram_handle ? (
              <Button asChild variant="outline" className="h-11 w-full">
                <a
                  href={telegramLink(profile.telegram_handle)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Telegram
                </a>
              </Button>
            ) : null}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-lg font-semibold">Лента</h2>
          <span className="text-xs text-muted-foreground">
            {listings.length
              ? `${listings.length} ${listings.length === 1 ? "лот" : "лотов"}`
              : "пока пусто"}
          </span>
        </div>

        {listings.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">
              {isOwner
                ? "Добавьте первую вещь — с фото и ценой."
                : "Пока нет активных объявлений."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </section>

      {isOwner ? (
        <form action={signOut} className="mt-auto pt-10">
          <Button type="submit" variant="ghost" className="w-full text-muted-foreground">
            Выйти
          </Button>
        </form>
      ) : (
        <div className="mt-auto pt-10" />
      )}
    </main>
  );
}
