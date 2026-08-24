# AGENTS.md — Boro

Инструкции для AI-агентов (Cursor и др.). Читать **до** любых изменений кода.

## Что это

**Boro** — личная P2P-барахолка для **Боровичей** (Новгородская обл.), не маркетплейс.

Сайт: https://boro.proektmap.ru  
Канал TG: https://t.me/boroboroxolka  
Группа VK: https://vk.ru/borovichi_site  

Философия и границы продукта: [docs/PHILOSOPHY.md](./docs/PHILOSOPHY.md)  
Спека: [PROJECT_SPEC.md](./PROJECT_SPEC.md)  
Разработка / день / деплой: [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## Жёсткие правила продукта

1. **Не** строить магазин: нет корзины, оплаты, категорий, внутреннего чата, CRM.
2. Петля: **фото + короткий текст + цена** → карточка сайта → зеркала (TG / VK) → сделка в личке (WA / телефон / TG).
3. Создание лота — **веб mobile-first** (в РФ у TG часто VPN).
4. Контакты продавца: минимум WhatsApp **или** телефон.
5. **Продано** ≠ **Удалить**:
   - Продано → с сайта убрать; в TG/VK оставить след (`✅ ПРОДАНО`).
   - Удалить → сайт + стереть посты (TG hard-delete; VK hard-delete при user-токене).
6. Клип — опционально из фото; музыка пока **рандом Mixkit**, не пикер треков.
7. Не коммитить секреты (`.env*`). Не пушить токены в чат/доки.

## Стек (не раздувать)

Next.js 15 App Router · TypeScript · Tailwind · shadcn · Supabase · Zod  
Без Prisma / Zustand на MVP.  
Хостинг: nginx → `127.0.0.1:3050` · PM2 process `boro`.

## Карта кода

| Зона | Путь |
|------|------|
| Создание лота API | `src/app/api/listings/route.ts` |
| Sold / delete | `src/app/actions/listings.ts` |
| Telegram | `src/lib/telegram.ts` |
| VK | `src/lib/vk.ts` |
| Клип | `src/lib/clip/*` |
| Шаринг | `src/components/share-button.tsx` |
| SQL | `supabase/*.sql` |

## Как работать агенту

1. Сначала прочитай PHILOSOPHY + этот файл.
2. Меняй только то, что нужно задаче; стиль кода как в соседних файлах.
3. После фичи: `npm run build` → `pm2 restart boro --update-env` при деплое на этот сервер.
4. Коммиты — только по просьбе пользователя; без `.env`, `*.bak`, секретов.
5. GitHub remote — создавать/пушить только когда пользователь явно попросит.

## Env (имена, не значения)

`NEXT_PUBLIC_SUPABASE_*` · `SUPABASE_SERVICE_ROLE_KEY` · `TELEGRAM_BOT_TOKEN` · `TELEGRAM_CHANNEL_ID` · `VK_ACCESS_TOKEN` · `VK_USER_ACCESS_TOKEN` · `VK_GROUP_ID` · `VK_GROUP_SCREEN_NAME` · `NEXT_PUBLIC_SITE_URL`
