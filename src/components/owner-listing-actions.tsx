"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { deleteListing, markListingSold } from "@/app/actions/listings";

export function OwnerListingActions({ listingId }: { listingId: string }) {
  const [mode, setMode] = useState<"idle" | "sold" | "delete">("idle");
  const [pending, startTransition] = useTransition();

  if (mode === "sold") {
    return (
      <div className="space-y-3 rounded-2xl border border-border bg-muted/40 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">Отметить проданным?</p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            С сайта лот исчезнет. В канале останется с пометкой ✅ ПРОДАНО.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            disabled={pending}
            onClick={() => setMode("idle")}
          >
            Отмена
          </Button>
          <Button
            type="button"
            className="h-11 flex-1"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await markListingSold(listingId);
              })
            }
          >
            {pending ? "Сохраняю…" : "Да, продано"}
          </Button>
        </div>
      </div>
    );
  }

  if (mode === "delete") {
    return (
      <div className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
        <div className="space-y-1">
          <p className="text-sm font-medium text-destructive">
            Удалить объявление?
          </p>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Лот и фото удалятся с сайта. Пост в Telegram-канале тоже будет
            удалён.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 flex-1"
            disabled={pending}
            onClick={() => setMode("idle")}
          >
            Отмена
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11 flex-1"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await deleteListing(listingId);
              })
            }
          >
            {pending ? "Удаляю…" : "Удалить"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 pt-2">
      <Button
        type="button"
        className="h-11 w-full"
        disabled={pending}
        onClick={() => setMode("sold")}
      >
        Продано
      </Button>
      <Button
        type="button"
        variant="ghost"
        className="w-full text-destructive hover:text-destructive"
        disabled={pending}
        onClick={() => setMode("delete")}
      >
        Удалить
      </Button>
    </div>
  );
}
