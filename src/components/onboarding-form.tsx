"use client";

import { useActionState } from "react";
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
import { saveOnboarding, type ActionState } from "@/app/actions/auth";
import { DEFAULT_CITY } from "@/lib/constants";

const initialState: ActionState = {};

type InitialProfile = {
  username: string;
  display_name: string;
  city: string;
  bio: string;
  telegram_handle: string;
  whatsapp_number: string;
  phone: string;
};

export function OnboardingForm({ initial }: { initial?: InitialProfile }) {
  const [state, formAction, pending] = useActionState(
    saveOnboarding,
    initialState
  );
  const editing = Boolean(initial);

  return (
    <Card className="w-full max-w-md border-border/80 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">
          {editing ? "Контакты и профиль" : "Профиль"}
        </CardTitle>
        <CardDescription>
          Как вас находить покупателям в {DEFAULT_CITY}. Нужен хотя бы WhatsApp
          или телефон — без VPN.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Имя</Label>
            <Input
              id="display_name"
              name="display_name"
              required
              placeholder="Алексей"
              defaultValue={initial?.display_name}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username (ссылка профиля)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/u/</span>
              <Input
                id="username"
                name="username"
                required
                placeholder="alexey"
                pattern="[a-z0-9_]{3,24}"
                title="Латиница, цифры и _"
                defaultValue={initial?.username}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Город</Label>
            <Input
              id="city"
              name="city"
              defaultValue={initial?.city || DEFAULT_CITY}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="whatsapp_number">WhatsApp</Label>
            <Input
              id="whatsapp_number"
              name="whatsapp_number"
              placeholder="+79001234567"
              inputMode="tel"
              defaultValue={initial?.whatsapp_number}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Телефон</Label>
            <Input
              id="phone"
              name="phone"
              placeholder="+79001234567"
              inputMode="tel"
              defaultValue={initial?.phone}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="telegram_handle">Telegram (необязательно)</Label>
            <Input
              id="telegram_handle"
              name="telegram_handle"
              placeholder="username без @"
              defaultValue={initial?.telegram_handle}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bio">О себе (необязательно)</Label>
            <Textarea
              id="bio"
              name="bio"
              placeholder="Продаю личные вещи в Боровичах"
              rows={3}
              defaultValue={initial?.bio}
            />
          </div>
          {state.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
        </CardContent>
        <CardFooter>
          <Button className="h-11 w-full" type="submit" disabled={pending}>
            {pending
              ? "Сохраняю…"
              : editing
                ? "Сохранить"
                : "Сохранить и открыть профиль"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
