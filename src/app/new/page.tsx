import Link from "next/link";
import { redirect } from "next/navigation";
import { CreateListingForm } from "@/components/create-listing-form";
import { getCurrentProfile, getSessionUser } from "@/lib/profile";
import { SITE_NAME } from "@/lib/constants";

export default async function NewListingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();
  if (!profile) redirect("/onboarding");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center gap-6 px-5 py-10">
      <div className="flex w-full max-w-md items-center justify-between">
        <Link href={`/u/${profile.username}`} className="text-sm text-muted-foreground">
          ← Профиль
        </Link>
        <span className="text-sm font-medium">{SITE_NAME}</span>
      </div>
      <CreateListingForm userId={profile.id} />
    </main>
  );
}
