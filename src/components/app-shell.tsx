"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  username,
}: {
  children: React.ReactNode;
  /** When logged in with profile */
  username?: string | null;
}) {
  const pathname = usePathname();
  const profileHref = username ? `/u/${username}` : "/login";

  const items = [
    { href: "/", label: "Лента", icon: Home, match: (p: string) => p === "/" },
    {
      href: username ? "/new" : "/signup",
      label: "Разместить",
      icon: Plus,
      match: (p: string) => p.startsWith("/new"),
    },
    {
      href: profileHref,
      label: username ? "Профиль" : "Войти",
      icon: User,
      match: (p: string) =>
        p.startsWith("/u/") || p === "/login" || p === "/signup",
    },
  ] as const;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-lg flex-col bg-background">
      <div className="flex-1 pb-20">{children}</div>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border/80 bg-background/95 backdrop-blur-md"
        style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-2">
          {items.map(({ href, label, icon: Icon, match }) => {
            const active = match(pathname);
            return (
              <Link
                key={label}
                href={href}
                className={cn(
                  "flex min-w-[4.5rem] flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon
                  className={cn("size-5", active && "stroke-[2.5px]")}
                  aria-hidden
                />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
