"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
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
import type { ListingWithMedia } from "@/lib/types";

const MAX_PHOTOS = 7;

type PhotoItem =
  | { kind: "existing"; id: string; url: string }
  | { kind: "new"; file: File; url: string; tempId: string };

export function EditListingForm({
  listing,
}: {
  listing: ListingWithMedia;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(listing.title);
  const [price, setPrice] = useState(String(listing.price));
  const [description, setDescription] = useState(listing.description || "");

  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    listing.listing_media.map((m) => ({
      kind: "existing",
      id: m.id,
      url: m.url,
    }))
  );

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => {
    return () => {
      photosRef.current.forEach((p) => {
        if (p.kind === "new") {
          URL.revokeObjectURL(p.url);
        }
      });
    };
  }, []);

  function onPick(files: FileList | null) {
    if (!files) return;
    setError(null);

    const next = [...photos];
    for (const file of Array.from(files)) {
      if (next.length >= MAX_PHOTOS) break;
      if (!file.type.startsWith("image/") && !/\.heic$/i.test(file.name)) {
        setError("Только изображения");
        continue;
      }
      next.push({
        kind: "new",
        file,
        url: URL.createObjectURL(file),
        tempId: crypto.randomUUID(),
      });
    }

    setPhotos(next);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function removeAt(index: number) {
    if (photos.length <= 1) {
      setError("У объявления должно остаться хотя бы одно фото");
      return;
    }
    setError(null);
    setPhotos((prev) => {
      const copy = [...prev];
      const removed = copy[index];
      if (removed.kind === "new") {
        URL.revokeObjectURL(removed.url);
      }
      copy.splice(index, 1);
      return copy;
    });
  }

  function makePrimary(index: number) {
    if (index === 0) return;
    setPhotos((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(index, 1);
      copy.unshift(item);
      return copy;
    });
  }

  function move(from: number, to: number) {
    if (to < 0 || to >= photos.length) return;
    setPhotos((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (photos.length === 0) {
      setError("Добавьте хотя бы одно фото");
      return;
    }

    setBusy(true);
    try {
      // 1. Prepare manifest and compress new files
      const newPhotosToCompress = photos
        .map((p, originalIndex) => ({ p, originalIndex }))
        .filter((item): item is { p: PhotoItem & { kind: "new" }; originalIndex: number } => item.p.kind === "new");

      const compressedBlobs: Blob[] = [];
      const newFileIndexMap = new Map<string, number>();

      for (let i = 0; i < newPhotosToCompress.length; i++) {
        const item = newPhotosToCompress[i];
        setStatus(`Сжимаю новое фото ${i + 1}/${newPhotosToCompress.length}…`);
        const blob = await compressImage(item.p.file);
        compressedBlobs.push(blob);
        newFileIndexMap.set(item.p.tempId, i);
      }

      setStatus("Сохраняю изменения…");

      const photosManifest = photos.map((p) => {
        if (p.kind === "existing") {
          return { type: "existing" as const, id: p.id, url: p.url };
        } else {
          return {
            type: "new" as const,
            fileIndex: newFileIndexMap.get(p.tempId) ?? 0,
          };
        }
      });

      const body = new FormData();
      body.set("title", title);
      body.set("price", price);
      body.set("description", description);
      body.set("photos_manifest", JSON.stringify(photosManifest));

      compressedBlobs.forEach((blob, i) => {
        body.append("photos", blob, `photo-${i}.jpg`);
      });

      const res = await fetch(`/api/listings/${listing.id}`, {
        method: "PATCH",
        body,
      });

      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean;
        error?: string;
      };

      if (!res.ok || !data.success) {
        setError(data.error || `Ошибка сохранения (${res.status})`);
        return;
      }

      setStatus("Сохранено!");
      router.push(`/i/${listing.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <Card className="w-full max-w-md border-border/80 shadow-none">
      <CardHeader>
        <div className="flex items-center justify-between pb-1">
          <CardTitle className="text-2xl font-semibold">Редактирование</CardTitle>
          <Button asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Link href={`/i/${listing.id}`}>Отмена</Link>
          </Button>
        </div>
        <CardDescription>
          Измените описание, цену или выберите главное фото для слайдера.
        </CardDescription>
      </CardHeader>
      <form onSubmit={onSubmit}>
        <CardContent className="space-y-5">
          {/* Photos Management */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">
                Фотографии ({photos.length} из {MAX_PHOTOS})
              </Label>
              <span className="text-xs text-muted-foreground">
                Первое фото — обложка и главный слайд
              </span>
            </div>

            {/* Hidden native input */}
            <input
              ref={fileInputRef}
              id="edit-photos"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/*"
              multiple
              className="hidden"
              onChange={(e) => onPick(e.target.files)}
              disabled={busy || photos.length >= MAX_PHOTOS}
            />

            {/* Prominent Upload Button (Mobile Friendly) */}
            {photos.length < MAX_PHOTOS ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={busy}
                className="group flex w-full items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-primary/40 bg-primary/5 px-4 py-4 text-primary transition-all hover:border-primary hover:bg-primary/10 active:scale-[0.99] disabled:pointer-events-none disabled:opacity-50"
              >
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary/20">
                  <Camera className="size-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-semibold text-foreground">
                    Добавить ещё фото
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Сделать снимок на телефон или выбрать из галереи
                  </p>
                </div>
              </button>
            ) : null}

            {/* Photo list with primary picker */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p, index) => {
                const isPrimary = index === 0;
                return (
                  <div
                    key={p.kind === "existing" ? p.id : p.tempId}
                    className={`relative flex flex-col overflow-hidden rounded-xl border bg-card transition-all ${
                      isPrimary
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-border/80"
                    }`}
                  >
                    <div className="relative aspect-square w-full overflow-hidden bg-muted">
                      <Image
                        src={p.url}
                        alt={`Фото ${index + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />

                      {/* Primary badge */}
                      {isPrimary ? (
                        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-md bg-primary px-2 py-0.5 text-[11px] font-medium text-primary-foreground shadow-sm">
                          <Star className="size-3 fill-current" />
                          Главное
                        </div>
                      ) : null}

                      {/* Delete button */}
                      {!busy ? (
                        <button
                          type="button"
                          onClick={() => removeAt(index)}
                          className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-colors hover:bg-destructive hover:text-destructive-foreground"
                          aria-label="Удалить фото"
                          title="Удалить фото"
                        >
                          <X className="size-3.5" />
                        </button>
                      ) : null}

                      {/* Slide order controls */}
                      <div className="absolute bottom-1.5 inset-x-1.5 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => move(index, index - 1)}
                          disabled={busy || index === 0}
                          className="flex size-6 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm transition-opacity hover:bg-black/80 disabled:opacity-20"
                          title="Сдвинуть влево"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <span className="rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                          #{index + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => move(index, index + 1)}
                          disabled={busy || index === photos.length - 1}
                          className="flex size-6 items-center justify-center rounded-md bg-black/60 text-white backdrop-blur-sm transition-opacity hover:bg-black/80 disabled:opacity-20"
                          title="Сдвинуть вправо"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                      </div>
                    </div>

                    {/* Make primary action button */}
                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={() => makePrimary(index)}
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
          </div>

          {/* Form fields */}
          <div className="space-y-2">
            <Label htmlFor="title">Название</Label>
            <Input
              id="title"
              name="title"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Название вещи"
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
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0"
              disabled={busy}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Подробности о вещи, состояние, где забрать…"
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
        <CardFooter className="flex flex-col gap-2">
          <Button
            className="h-11 w-full text-base font-medium"
            type="submit"
            disabled={busy || photos.length === 0}
          >
            {busy ? status || "Сохраняю…" : "Сохранить изменения"}
          </Button>
          <Button
            asChild
            variant="outline"
            className="h-11 w-full"
            disabled={busy}
          >
            <Link href={`/i/${listing.id}`}>Отмена</Link>
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
