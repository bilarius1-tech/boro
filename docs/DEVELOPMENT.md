# Разработка Boro

## Репозиторий

- Ветка по умолчанию: `main`
- Секреты только в `.env.local` (не в git)
- Пример env: `.env.example`
- GitHub remote — подключаем отдельно, по явной команде

## Закрытие дня (чеклист)

1. Код собирается: `npm run build`
2. На проде (этот сервер): `pm2 restart boro --update-env` если были изменения
3. Быстрый смоук: открыть сайт, создать/шаринг не обязателен каждый день
4. Документация: если менялась логика продукта — обновить `PROJECT_SPEC.md` / `docs/*` / `AGENTS.md`
5. Git:
   ```bash
   git status
   git add -A   # без секретов — их глушит .gitignore
   git commit -m "..."
   ```
6. Пуш на GitHub — только когда remote есть и пользователь попросил

## Деплой на этом хосте

```bash
cd /var/www/www-root/data/www/boro.proektmap.ru
npm run build
pm2 restart boro --update-env
```

- Домен: `boro.proektmap.ru` → nginx → `127.0.0.1:3050`
- PM2 name: `boro`
- Не ломать nginx-конфиг ISPManager без бэкапа

## SQL

Миграции руками в Supabase SQL Editor (файлы в `supabase/`):

| Файл | Зачем |
|------|--------|
| `schema.sql` | База |
| `foundation-clip-tg.sql` | `clip_*`, `telegram_message_ids` |
| `vk-post.sql` | `vk_post_id`, `vk_owner_id` |

## Социальные зеркала

- TG: [docs/TG_SHARE_LOGISTICS.md](./TG_SHARE_LOGISTICS.md)
- VK: [docs/VK_AUTOPOST.md](./VK_AUTOPOST.md)
- Общая логистика: [docs/LOGISTICS.md](./LOGISTICS.md)

## Стиль кода

- TypeScript strict-ish как в проекте
- Server Actions / Route Handlers без лишних абстракций
- UI: существующие shadcn-компоненты, mobile-first
- Не добавлять Prisma/Zustand «на будущее»

## Безопасность

- Никогда не коммитить `VK_*`, `TELEGRAM_*`, `SUPABASE_SERVICE_ROLE_*`
- Токены, попавшие в чат, считать скомпрометированными при утечке вне команды
