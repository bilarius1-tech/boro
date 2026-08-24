import Link from "next/link";
import { AuthForm } from "@/components/auth-form";
import { SITE_NAME } from "@/lib/constants";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col items-center justify-center gap-6 px-5 py-10">
      <Link href="/" className="text-sm font-medium text-muted-foreground">
        ← {SITE_NAME}
      </Link>
      <AuthForm mode="signup" />
    </main>
  );
}
