# VK полный цикл (фото в посте + удаление)

Ключ **сообщества** уже есть — его мало для фото/удаления.  
Нужен **пользовательский** токен админа группы `borovichi_site`.

## Как устроен постинг (с авг. 2025)

| Токен | Что умеет |
|-------|-----------|
| `VK_ACCESS_TOKEN` (сообщество) | `wall.post` текстом (+ ссылка **в тексте**). Не умеет upload фото / delete. |
| `VK_USER_ACCESS_TOKEN` (админ) | Фото на стену, `wall.edit` / `wall.delete`, sold-метка. |

Правила, из‑за которых ломалось:

1. **Flood control (код 9)** — нельзя грузить много фото подряд без паузы; в коде: gap + retry.
2. **`link_photo_sizing_rule`** — нельзя кидать URL лота в `attachments`, если OG-фото портретное. Ссылку пишем в текст; для шаринга — landscape `/api/og/vk/[id]` (1200×630).

Код: `src/lib/vk.ts`, шаринг: `src/components/share-button.tsx`.

## 1. Создай приложение VK (1 раз)

1. Открой https://dev.vk.com/ → войти  
2. **Мои приложения** → **Создать** → тип **Standalone-приложение**  
3. Скопируй **ID приложения** (числа)

## 2. Получи токен админа

Подставь свой `APP_ID` в ссылку и открой **в браузере под аккаунтом админа** группы:

```
https://oauth.vk.com/authorize?client_id=APP_ID&display=page&redirect_uri=https://oauth.vk.com/blank.html&scope=wall,photos,offline,groups&response_type=token&v=5.199
```

Разреши доступ. В адресной строке будет:

```
https://oauth.vk.com/blank.html#access_token=vk1.a....&expires_in=0&user_id=...
```

Скопируй значение `access_token` (от `vk1.` до `&expires` / конца).

`offline` = токен бессрочный (пока не сбросишь).

## 3. Пропиши на сервере

В `.env.local`:

```env
VK_USER_ACCESS_TOKEN=vk1.a....вставь_сюда
```

Затем:

```bash
pm2 restart boro --update-env
```

## 4. Проверка

```bash
cd /var/www/www-root/data/www/boro.proektmap.ru
node scripts/vk-check-user-token.mjs
```

Должно: `upload_server OK`, `wall.post OK`, `wall.delete OK`.

## Итог после токена

| Событие | VK |
|--------|-----|
| Публикация | текст от группы (community); фото — если user-токен жив |
| Продано | правка поста → `✅ ПРОДАНО` сверху |
| Удалить | пост реально удаляется со стены |
| Шаринг с сайта | `share.php` + landscape OG; «открыть пост в группе» |
