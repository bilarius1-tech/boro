import { redirect } from "next/navigation";
import Link from "next/link";
import { OnboardingForm } from "@/components/onboarding-form";
import { getCurrentProfile, getSessionUser } from "@/lib/profile";
import { SITE_NAME } from "@/lib/constants";

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const profile = await getCurrentProfile();

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-6 px-5 py-10">
      <Link href="/" className="text-sm font-medium text-muted-foreground">
        ← {SITE_NAME}
      </Link>
      <OnboardingForm
        initial={
          profile
            ? {
                username: profile.username,
                display_name: profile.display_name,
                city: profile.city,
                bio: profile.bio || "",
                telegram_handle: profile.telegram_handle || "",
                whatsapp_number: profile.whatsapp_number || "",
                phone: profile.phone || "",
              }
            : undefined
        }
      />
    </main>
  );
}
