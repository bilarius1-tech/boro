import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { EditListingForm } from "@/components/edit-listing-form";
import { getListingById } from "@/lib/listings";
import { getCurrentProfile } from "@/lib/profile";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListingById(id);
  if (!listing) return { title: "Лот не найден" };
  return {
    title: `Редактировать: ${listing.title} — Boro`,
  };
}

export default async function EditListingPage({ params }: Props) {
  const { id } = await params;
  const me = await getCurrentProfile();
  if (!me) {
    redirect("/login");
  }

  const listing = await getListingById(id);
  if (!listing || listing.user_id !== me.id) {
    notFound();
  }

  return (
    <AppShell username={me.username}>
      <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center gap-6 px-5 py-6 pb-28">
        <div className="flex w-full max-w-md items-center justify-between">
          <Link
            href={`/i/${listing.id}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← К объявлению
          </Link>
          <span className="text-sm text-muted-foreground">{me.city}</span>
        </div>
        <EditListingForm listing={listing} />
      </main>
    </AppShell>
  );
}
