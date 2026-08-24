"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authSchema, onboardingSchema } from "@/lib/validation";
import { DEFAULT_CITY } from "@/lib/constants";

export type ActionState = {
  error?: string;
  success?: string;
};

function humanAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("email rate")) {
    return "Слишком много попыток. Подождите 1–2 минуты или войдите, если аккаунт уже создался.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "Этот email уже зарегистрирован. Нажмите «Войти».";
  }
  if (m.includes("invalid login") || m.includes("invalid credentials")) {
    return "Неверный email или пароль";
  }
  if (m.includes("email not confirmed")) {
    return "Email не подтверждён. Обновите страницу и войдите ещё раз — мы это уже исправляем.";
  }
  return message;
}

export async function signUp(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Проверьте поля" };
  }

  const { email, password } = parsed.data;

  try {
    const admin = createAdminClient();
    const { data: created, error: createError } =
      await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (createError) {
      // User may already exist — try sign-in below
      const already =
        createError.message.toLowerCase().includes("already") ||
        createError.message.toLowerCase().includes("registered");
      if (!already) {
        return { error: humanAuthError(createError.message) };
      }
    }

    if (!created?.user && !createError) {
      return { error: "Не удалось создать аккаунт" };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Ошибка регистрации";
    return { error: humanAuthError(msg) };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return {
      error: humanAuthError(
        signInError.message ||
          "Аккаунт создан, но войти не удалось. Попробуйте «Войти»."
      ),
    };
  }

  redirect("/onboarding");
}

export async function signIn(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = authSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Проверьте поля" };
  }

  const email = parsed.data.email;
  const password = parsed.data.password;

  const supabase = await createClient();
  let { error } = await supabase.auth.signInWithPassword({ email, password });

  // MVP: auto-confirm if Supabase still requires email confirmation
  if (error?.message?.toLowerCase().includes("email not confirmed")) {
    try {
      const admin = createAdminClient();
      const { data: listed } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 200,
      });
      const found = listed?.users?.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (found) {
        await admin.auth.admin.updateUserById(found.id, {
          email_confirm: true,
        });
        ({ error } = await supabase.auth.signInWithPassword({
          email,
          password,
        }));
      }
    } catch {
      // fall through with original error
    }
  }

  if (error) {
    return { error: humanAuthError(error.message) };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Не удалось войти. Проверьте, что cookies не блокируются." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .maybeSingle();

  redirect(profile ? `/u/${profile.username}` : "/onboarding");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

export async function saveOnboarding(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const parsed = onboardingSchema.safeParse({
    username: formData.get("username"),
    display_name: formData.get("display_name"),
    city: formData.get("city") || DEFAULT_CITY,
    bio: formData.get("bio") || "",
    telegram_handle: formData.get("telegram_handle") || "",
    whatsapp_number: formData.get("whatsapp_number") || "",
    phone: formData.get("phone") || "",
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message || "Проверьте поля" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const payload = {
    id: user.id,
    username: parsed.data.username,
    display_name: parsed.data.display_name,
    city: parsed.data.city || DEFAULT_CITY,
    bio: parsed.data.bio || null,
    telegram_handle: parsed.data.telegram_handle || null,
    whatsapp_number: parsed.data.whatsapp_number || null,
    phone: parsed.data.phone || null,
    role: "owner" as const,
  };

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "Такой username уже занят" };
    }
    return { error: error.message };
  }

  redirect(`/u/${payload.username}`);
}
