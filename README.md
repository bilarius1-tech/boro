# Boro

Личная барахолка **Боровичей** · https://boro.proektmap.ru

> Сфоткал → написал → цена → карточка + TG/VK → сделка в личке.

Философия: [docs/PHILOSOPHY.md](./docs/PHILOSOPHY.md) · Спека: [PROJECT_SPEC.md](./PROJECT_SPEC.md) · Агентам: [AGENTS.md](./AGENTS.md)

## Стек

Next.js 15 (App Router) · TypeScript · Tailwind · shadcn/ui · Supabase · Zod  
Хост: nginx → PM2 `boro` → порт **3050**

## Быстрый старт (сервер)

```bash
cd /var/www/www-root/data/www/boro.proektmap.ru
cp .env.example .env.local   # заполнить ключи
npm install
npm run build
pm2 restart boro --update-env
```

SQL: файлы в `supabase/` → Supabase SQL Editor.

## Что уже работает (Phase 0)

- Auth + онбординг профиля
- Создание лота (сжатие фото, upload)
- Карточка `/i/[id]`, карусель, шаринг (VK / MAX / TG)
- Клип 9:16 из фото (опционально) + музыка Mixkit
- Автопост Telegram `@boroboroxolka`
- Автопост VK `borovichi_site` (фото в посте при user-токене)
- Продано / Удалить с синхронизацией зеркал

## Документация

| Файл | Содержание |
|------|------------|
| [docs/PHILOSOPHY.md](./docs/PHILOSOPHY.md) | Зачем и границы продукта |
| [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md) | Git, день, деплой |
| [docs/LOGISTICS.md](./docs/LOGISTICS.md) | Логистика фич |
| [docs/TG_SHARE_LOGISTICS.md](./docs/TG_SHARE_LOGISTICS.md) | Telegram + share |
| [docs/VK_AUTOPOST.md](./docs/VK_AUTOPOST.md) | VK автопост |
| [AGENTS.md](./AGENTS.md) | Инструкции для AI-агентов |

## Git

Сейчас локальный `main`. GitHub подключаем отдельно (см. DEVELOPMENT.md).
