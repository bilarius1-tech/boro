"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  Star,
  X,
} from "lucide-react";

const MAX_PHOTOS = 7;

type Preview = { file: File; url: string; id: string };

export function CreateListingForm({ userId: _userId }: { userId: string }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [previews, setPreviews] = useState<Preview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [wantClip, setWantClip] = useState(false);

  const previewsRef = useRef(previews);
  previewsRef.current = previews;

  useEffect(() => {
    return () => {
      previewsRef.current.forEach((p) => {
        URL.revokeObjectURL(p.url);
      });
    };
  }, []);

  const canClip = previews.length >= 2;

  const hint = useMemo(() => {
    if (previews.length === 0)
      return "До 7 фото. От 2 штук можно собрать клип с музыкой.";
    if (wantClip && canClip)
      return `Клип из ${previews.length} фото (~${(previews.length * 1.6).toFixed(0)} сек) + музыка.`;
    if (previews.length === 1)
      return "Добавь ещё фото, если хочешь клип.";
    return `${previews.length} из ${MAX_PHOTOS}. Первое фото станет обложкой.`;
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
      next.push({
        file,
        url: URL.createObjectURL(file),
        id: crypto.randomUUID(),
      });
    }
    setPreviews(next);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    setPreviews((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].url);
      copy.splice(index, 1);
      return copy;
    });
  }

  function makePrimary(index: number) {
    if (index === 0) return;
    setPreviews((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= previews.length) return;
    setPreviews((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
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
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Фото ({previews.length} из {MAX_PHOTOS})
              </Label>
              <span className="text-xs text-muted-foreground">
                {previews.length === 0 ? "Обязательно" : "Первое — обложка"}
              </span>
            </div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              id="photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              multiple
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
              disabled={busy || previews.length >= MAX_PHOTOS}
            />

            {/* Prominent Upload Button (Mobile-first with camera icon) */}
            {previews.length < MAX_PHOTOS ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="group flex w-full items-center justify-center gap-3.5 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-4 text-primary transition-all hover:border-primary hover:bg-primary/10 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary shadow-xs group-hover:bg-primary/20">
                  <Camera className="size-6" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">
                    {previews.length === 0
                      ? "Загрузить фото"
                      : "Добавить ещё фото"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Сделать снимок на телефон или выбрать из галереи
                  </p>
                </div>
              </button>
            ) : null}

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
              <div className="grid grid-cols-2 gap-3 pt-1 sm:grid-cols-3">
                {previews.map((p, i) => {
                  const isPrimary = i === 0;
                  return (
                    <div
                      key={p.id}
                      className={`relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all ${
                        isPrimary
                          ? "border-primary ring-2 ring-primary/30"
                          : "border-border/80"
                      }`}
                    >
                      <div className="relative aspect-square w-full overflow-hidden bg-muted">
                        <Image
                          src={p.url}
                          alt={`Фото ${i + 1}`}
                          fill
                          className="object-cover"
                          unoptimized
                        />

                        {isPrimary ? (
                          <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground shadow-sm">
                            <Star className="size-3 fill-current" />
                            Главное
                          </div>
                        ) : null}

                        {!busy ? (
                          <button
                            type="button"
                            onClick={() => removeAt(i)}
                            className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
                            aria-label="Удалить"
                            title="Удалить фото"
                          >
                            <X className="size-3.5" />
                          </button>
                        ) : null}

                        <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => move(i, i - 1)}
                            disabled={busy || i === 0}
                            className="flex size-6 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm transition-opacity hover:bg-black/80 disabled:opacity-20"
                            title="Сдвинуть влево"
                          >
                            <ChevronLeft className="size-4" />
                          </button>
                          <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                            #{i + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => move(i, i + 1)}
                            disabled={busy || i === previews.length - 1}
                            className="flex size-6 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm transition-opacity hover:bg-black/80 disabled:opacity-20"
                            title="Сдвинуть вправо"
                          >
                            <ChevronRight className="size-4" />
                          </button>
                        </div>
                      </div>

                      {!isPrimary ? (
                        <button
                          type="button"
                          onClick={() => makePrimary(i)}
                          disabled={busy}
                          className="flex w-full items-center justify-center gap-1.5 border-t border-border bg-muted/40 py-2 text-xs font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary active:bg-primary/20"
                        >
                          <Star className="size-3.5" />
                          Сделать главным
                        </button>
                      ) : (
                        <div className="flex w-full items-center justify-center border-t border-primary/20 bg-primary/10 py-2 text-xs font-medium text-primary">
                          Главное фото
                        </div>
                      )}
                    </div>
                  );
                })}
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
            className="h-11 w-full text-base font-medium"
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
