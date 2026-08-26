"use client";

import { useEffect, useState } from "react";
import { Download, Share, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    ("standalone" in navigator &&
      Boolean((navigator as Navigator & { standalone?: boolean }).standalone))
  );
}

export function PwaInstallButton({ className }: { className?: string }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null
  );
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    setIosHint(isIos());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    if (iosHint) {
      setShowIosHelp((v) => !v);
      return;
    }
    // Desktop Chrome without event yet — show tip
    setShowIosHelp(true);
  }

  if (installed) {
    return (
      <Button
        type="button"
        variant="outline"
        className={className ?? "h-11 w-full"}
        disabled
      >
        <Check className="size-4" />
        Boro уже на телефоне
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className={className ?? "h-11 w-full"}
        onClick={install}
      >
        {iosHint ? (
          <>
            <Share className="size-4" />
            Установить на iPhone
          </>
        ) : (
          <>
            <Download className="size-4" />
            Скачать и установить
          </>
        )}
      </Button>
      {showIosHelp ? (
        <div className="rounded-xl border border-border bg-muted/50 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          {iosHint ? (
            <>
              1. Нажми <strong>Поделиться</strong> (квадрат со стрелкой) внизу
              Safari
              <br />
              2. Выбери <strong>«На экран „Домой“»</strong>
              <br />
              3. Подтверди — иконка Boro появится как приложение
            </>
          ) : deferred ? null : (
            <>
              Открой сайт в <strong>Chrome</strong> или <strong>Яндекс</strong> на
              телефоне → меню → <strong>«Установить приложение»</strong> /
              «Добавить на главный экран».
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

/** Registers service worker once for the whole app. */
export function PwaRegister() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("SW register failed", err);
    });
  }, []);
  return null;
}
