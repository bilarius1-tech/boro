"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { compressImage } from "@/lib/compress-image";
import { X } from "lucide-react";

const MAX_PHOTOS = 7;

type Preview = { file: File; url: string };

export function CreateListingForm({ userId: _userId }: { userId: string }) {
  const router = useRouter();
  const [previews, setPreviews] = useState<Preview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [wantClip, setWantClip] = useState(false);

  const canClip = previews.length >= 2;

  const hint = useMemo(() => {
    if (previews.length === 0)
      return "До 7 фото. От 2 штук можно собрать клип с музыкой.";
    if (wantClip && canClip)
      return `Клип из ${previews.length} фото (~${(previews.length * 1.6).toFixed(0)} сек) + музыка.`;
    if (previews.length === 1)
      return "Добавь ещё фото, если хочешь клип.";
    return `${previews.length} из ${MAX_PHOTOS}. Можно опубликовать как фото или клип.`;
  }, [previews.length, wantClip, canClip]);

  function onPick(files: FileList | null) {
    if (!files) return;
    setError(null);
    const next = [...previews];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) break;
      if (!file.type.startsWith("image/") && !/\.heic$/i.test(file.name)) {
        setError("Только изображения");
        continue;
      }
      next.push({ file, url: URL.createObjectURL(file) });
    }
    setPreviews(next);
  }

  function removeAt(index: number) {
    setPreviews((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].url);
      copy.splice(index, 1);
      return copy;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (previews.length === 0) {
      setError("Добавьте хотя бы одно фото");
      return;
    }

    const form = e.currentTarget;
    const title = (form.elements.namedItem("title") as HTMLInputElement).value;
    const price = (form.elements.namedItem("price") as HTMLInputElement).value;
    const description = (
      form.elements.namedItem("description") as HTMLTextAreaElement
    ).value;

    setBusy(true);
    try {
      setStatus("Сжимаю фото…");
      const compressed = await Promise.all(
        previews.map(async (p, i) => {
          const blob = await compressImage(p.file);
          setStatus(`Сжимаю фото ${i + 1}/${previews.length}…`);
          return blob;
        })
      );

      setStatus("Отправляю на сервер…");
      const body = new FormData();
      body.set("title", title);
      body.set("price", price);
      body.set("description", description);
      body.set("want_clip", wantClip && canClip ? "1" : "0");
      compressed.forEach((blob, i) => {
        body.append("photos", blob, `photo-${i}.jpg`);
      });

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120_000);

      const res = await fetch("/api/listings", {
        method: "POST",
        body,
        signal: controller.signal,
      }).finally(() => clearTimeout(timer));

      const data = (await res.json().catch(() => ({}))) as {
        id?: string;
        error?: string;
      };

      if (!res.ok || !data.id) {
        setError(data.error || `Ошибка публикации (${res.status})`);
        return;
      }

      setStatus("Готово!");
      router.push(`/i/${data.id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Слишком долго. Проверьте интернет и попробуйте 1–2 фото.");
      } else {
        setError(err instanceof Error ? err.message : "Ошибка публикации");
      }
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">Новая вещь</CardTitle>
        <CardDescription>
          Фото + пара слов + цена. Позже из фото соберём слайдшоу с музыкой.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="photos">Фото (1–7)</Label>
            <Input
              id="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              multiple
              onChange={(e) => onPick(e.target.files)}
              disabled={busy}
            />
            <p className="text-xs text-muted-foreground">{hint}</p>
            {canClip ? (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setWantClip(false)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                    !wantClip
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  <span className="block font-medium">Только фото</span>
                  <span className="mt-0.5 block text-xs opacity-80">
                    Быстрая публикация
                  </span>
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setWantClip(true)}
                  className={`rounded-xl border px-3 py-3 text-left text-sm transition-colors ${
                    wantClip
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-card text-foreground"
                  }`}
                >
                  <span className="block font-medium">Клип</span>
                  <span className="mt-0.5 block text-xs opacity-80">
                    Слайдшоу + музыка
                  </span>
                </button>
              </div>
            ) : null}
            {previews.length > 0 ? (
              <div className="grid grid-cols-3 gap-2 pt-1">
                {previews.map((p, i) => (
                  <div
                    key={p.url}
                    className="relative aspect-square overflow-hidden rounded-lg bg-muted"
                  >
                    <Image
                      src={p.url}
                      alt={`Фото ${i + 1}`}
                      fill
                      className="object-cover"
                      unoptimized
                    />
                    {!busy ? (
                      <button
                        type="button"
                        onClick={() => removeAt(i)}
                        className="absolute top-1 right-1 rounded-full bg-black/55 p-1 text-white"
                        aria-label="Удалить"
                      >
                        <X className="size-3.5" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Название</Label>
            <Input
              id="title"
              name="title"
              required
              placeholder="Велосипед Merida"
              maxLength={80}
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Цена, ₽</Label>
            <Input
              id="price"
              name="price"
              type="number"
              inputMode="numeric"
              required
              min={0}
              step={1}
              placeholder="70000"
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              placeholder="Почти не ездил, покупал два года назад…"
              maxLength={2000}
              disabled={busy}
            />
          </div>

          {error ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}
          {status ? (
            <p className="text-sm text-muted-foreground">{status}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button
            className="h-11 w-full"
            type="submit"
            disabled={busy || previews.length === 0}
          >
            {busy ? status || "Публикую…" : "Опубликовать"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
