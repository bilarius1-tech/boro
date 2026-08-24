import { z } from "zod";

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3, "Минимум 3 символа")
  .max(24, "Максимум 24 символа")
  .regex(/^[a-z0-9_]+$/, "Только латиница, цифры и _");

export const authSchema = z.object({
  email: z.string().email("Некорректный email"),
  password: z.string().min(6, "Минимум 6 символов"),
});

export const onboardingSchema = z
  .object({
    username: usernameSchema,
    display_name: z.string().trim().min(2, "Укажите имя").max(60),
    city: z.string().trim().min(2).max(80).default("Боровичи"),
    bio: z.string().trim().max(300).optional().or(z.literal("")),
    telegram_handle: z
      .string()
      .trim()
      .max(64)
      .optional()
      .or(z.literal(""))
      .transform((v) => (v ? v.replace(/^@/, "") : "")),
    whatsapp_number: z.string().trim().max(32).optional().or(z.literal("")),
    phone: z.string().trim().max(32).optional().or(z.literal("")),
  })
  .refine((data) => Boolean(data.whatsapp_number || data.phone), {
    message: "Укажите WhatsApp или телефон (нужен контакт без VPN)",
    path: ["whatsapp_number"],
  });

export const listingSchema = z.object({
  title: z.string().trim().min(2, "Название слишком короткое").max(80),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  price: z.coerce
    .number({ error: "Укажите цену" })
    .int("Цена — целое число")
    .min(0, "Цена не может быть отрицательной")
    .max(10_000_000, "Слишком большая цена"),
  mediaUrls: z
    .array(z.string().url())
    .min(1, "Добавьте хотя бы одно фото")
    .max(7, "Максимум 7 фото (для будущего клипа)"),
});
