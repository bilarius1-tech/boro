"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Share2, Check, Copy, X } from "lucide-react";

const PROMO =
  "Боровичи · хочешь выложить своё?\nboro.proektmap.ru — фото, цена, и готово.";

export function ShareButton({
  title,
  url,
  description,
  vkImageUrl,
  vkPostUrl,
  className,
}: {
  title: string;
  url: string;
  /** Short text for VK share preview */
  description?: string | null;
  /**
   * Landscape preview (≥500px, ratio 1:1…1:2.5). Required for wall share —
   * portrait OG makes VK offer only messages.
   */
  vkImageUrl?: string | null;
  /** Direct wall post in Boro group — native VK «поделиться» works from there */
  vkPostUrl?: string | null;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  function clipboardText() {
    return `${title}\n${url}\n\n${PROMO}`;
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(clipboardText());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      prompt("Скопируйте:", clipboardText());
    }
  }

  /**
   * Share to own wall (and friends). noparse + landscape image — without this
   * VK falls back to messenger-only after Aug 2025 sizing rules.
   */
  function shareVkWall() {
    const u = new URL("https://vk.com/share.php");
    u.searchParams.set("url", url);
    u.searchParams.set("title", title.slice(0, 128));
    u.searchParams.set(
      "description",
      (description?.trim() || PROMO.replace(/\n/g, " ")).slice(0, 256)
    );
    if (vkImageUrl) u.searchParams.set("image", vkImageUrl);
    u.searchParams.set("noparse", "true");
    window.open(
      u.toString(),
      "_blank",
      "noopener,noreferrer,width=640,height=720"
    );
    setOpen(false);
  }

  function openVkGroupPost() {
    if (!vkPostUrl) return;
    window.open(vkPostUrl, "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  function shareMax() {
    const text = `${title}\n${url}\n\n${PROMO}`;
    window.open(
      `https://max.ru/:share?text=${encodeURIComponent(text)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setOpen(false);
  }

  function shareTelegram() {
    const u = new URL("https://t.me/share/url");
    u.searchParams.set("url", url);
    u.searchParams.set("text", `${title}\n\n${PROMO}`);
    window.open(u.toString(), "_blank", "noopener,noreferrer");
    setOpen(false);
  }

  async function shareNative() {
    try {
      if (navigator.share) {
        await navigator.share({
          title,
          text: `${title}\n\n${PROMO}`,
          url,
        });
        setOpen(false);
        return;
      }
    } catch {
      // cancelled
    }
    await copyLink();
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className ?? "h-11 w-full"}
        onClick={() => setOpen(true)}
      >
        <Share2 className="size-4" />
        Поделиться
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Поделиться лотом"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-background p-4 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between">
              <p className="text-base font-semibold">Куда отправить?</p>
              <button
                type="button"
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
                onClick={() => setOpen(false)}
                aria-label="Закрыть"
              >
                <X className="size-5" />
              </button>
            </div>

            <p className="mb-4 text-sm text-muted-foreground">
              На стену — кнопка ниже. В группу Boro лот уже уходит сам; откройте
              пост там, если нужен репост друзьям.
            </p>

            <div className="grid gap-2">
              <Button type="button" className="h-11 w-full" onClick={shareVkWall}>
                ВКонтакте — на стену
              </Button>
              {vkPostUrl ? (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full"
                  onClick={openVkGroupPost}
                >
                  Открыть пост в группе Boro
                </Button>
              ) : null}
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={shareMax}
              >
                MAX
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={shareTelegram}
              >
                Telegram
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full"
                onClick={shareNative}
              >
                Ещё приложения…
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="h-11 w-full"
                onClick={copyLink}
              >
                {copied ? (
                  <>
                    <Check className="size-4" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    Скопировать ссылку
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
