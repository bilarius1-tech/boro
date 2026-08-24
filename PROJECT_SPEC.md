# PROJECT SPEC — Boro Phase 0 (production posture)

**Домен:** https://boro.proektmap.ru  
**Город:** Боровичи, Новгородская область  
**Версия:** 0.3 · режим: рабочая разработка (не песочница)

**Не делаем:** маркетплейс, корзина, оплата, категории, CRM, multi-vendor, in-app chat

Философия: [docs/PHILOSOPHY.md](./docs/PHILOSOPHY.md) · Агентам: [AGENTS.md](./AGENTS.md)

---

### 1. Оффер

Продавать и искать вещи в Боровичах без Авито: фото → текст → цена → карточка + зеркала → личка.

**Петля**

```
ФОТО + ТЕКСТ + ЦЕНА
        ↓
  КАРТОЧКА /i/[id]  (+ опц. клип)
        ↓
  TG @boroboroxolka  +  VK borovichi_site
        ↓
  SHARE (OG / кнопки)
        ↓
  WA / телефон / TG
```

---

### 2. Реальность РФ

| Роль | Решение |
|------|---------|
| Создание | Веб mobile-first |
| Лента / карточка | Сайт без VPN |
| Распространение | TG-канал + VK-группа |
| Контакт | WhatsApp или телефон обязателен |

---

### 3. Scope Phase 0 (факт)

- [x] Auth Supabase · onboarding · `/u/[username]`
- [x] Create `/new` · compress · API upload
- [x] Карточка · карусель · share sheet
- [x] Клип Ken Burns 9:16 + typewriter + Mixkit
- [x] TG автопост (кнопки, без сырого URL-спама)
- [x] VK автопост (фото в посте + sold/delete)
- [x] Продано / Удалить
- [ ] Phase 1: городская лента / multi-user explore
- [ ] AI polish title (отложено)
- [ ] Music picker (отложено — рандом Mixkit)

---

### 4. Стек / хостинг

```
Next.js 15 App Router + TS + Tailwind + shadcn
Supabase Auth / DB / Storage
Telegram Bot API · VK API
Zod · PM2 (boro) · nginx · :3050
```

---

### 5. Схема (ключевые поля)

**profiles** — username, display_name, city, contacts, role  

**listings** — title, description, price, status,  
`telegram_message_id`, `telegram_message_ids`,  
`clip_url`, `clip_status`,  
`vk_post_id`, `vk_owner_id`

**listing_media** — type image|video, url, sort_order, poster_url

SQL: `supabase/schema.sql`, `foundation-clip-tg.sql`, `vk-post.sql`

---

### 6. Env (имена)

См. `.env.example` и [AGENTS.md](./AGENTS.md).

---

### 7. Out of scope

Корзина, оплата, категории, склад, внутренний чат, Prisma, Zustand, пикер музыки.
