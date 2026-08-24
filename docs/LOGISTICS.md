# Логистика Boro (операционная карта)

Актуально для Phase 0.3. Детали зеркал — в соседних файлах.

## Публикация лота

1. Клиент сжимает фото → `POST /api/listings`
2. Storage (service role) + row `listings` + `listing_media`
3. TG mirror (`src/lib/telegram.ts`) — best-effort
4. VK mirror (`src/lib/vk.ts`) — best-effort, фото при `VK_USER_ACCESS_TOKEN`
5. Если `want_clip` — `enqueueClipRender` в фоне

## Продано

- Сайт: hard delete listing + storage
- TG: ответ `✅ ПРОДАНО` (+ правка кнопок best-effort)
- VK: `wall.edit` с префиксом `✅ ПРОДАНО` (user token)

## Удалить

- Сайт: hard delete
- TG: `deleteMessage` по всем `telegram_message_ids`
- VK: `wall.delete` (user token)

## Шаринг

- Sheet: VK (стена/группа), MAX, Telegram, copy, system share
- OG: прямое фото лота в meta

## Клип

- FFmpeg 9:16 Ken Burns + typewriter ASS + Mixkit
- Статусы: `clip_status` / `clip_url`
- В TG — video reply к карточке

См. также: [PHILOSOPHY.md](./PHILOSOPHY.md) · [TG_SHARE_LOGISTICS.md](./TG_SHARE_LOGISTICS.md) · [VK_AUTOPOST.md](./VK_AUTOPOST.md) · [DEVELOPMENT.md](./DEVELOPMENT.md)
