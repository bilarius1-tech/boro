"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { signIn, signUp, type ActionState } from "@/app/actions/auth";

const initial: ActionState = {};

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <Card className="w-full max-w-md border-border/80 shadow-none">
      <CardHeader>
        <CardTitle className="text-2xl">
          {mode === "login" ? "Вход" : "Регистрация"}
        </CardTitle>
        <CardDescription>
          {mode === "login"
            ? "Войдите, чтобы управлять своими лотами в Боровичах."
            : "Пока бета: скоро откроем весь функционал. Сохрани ссылку и поделись с другими."}
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@email.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              placeholder="минимум 6 символов"
            />
          </div>
          {state.error ? (
            <p
              role="alert"
              className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          ) : null}
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button className="h-11 w-full" type="submit" disabled={pending}>
            {pending
              ? "Секунду…"
              : mode === "login"
                ? "Войти"
                : "Создать аккаунт"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Нет аккаунта?{" "}
                <Link href="/signup" className="text-foreground underline">
                  Зарегистрироваться
                </Link>
              </>
            ) : (
              <>
                Уже есть аккаунт?{" "}
                <Link href="/login" className="text-foreground underline">
                  Войти
                </Link>
              </>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}
