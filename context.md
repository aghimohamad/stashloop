# 🌀 StashLoop — Product Requirements Document (MVP)

## 1. Overview

**StashLoop** helps users stop hoarding unread links.
It resurfaces their saved content (articles, posts, reels, etc.) daily — **three at a time** — to read, snooze, or pin, creating a small daily habit loop.

> **Tagline:** “Stop collecting, start revisiting.”

---

## 2. Problem

Users constantly save links across platforms (Facebook, LinkedIn, Instagram, Reddit, Twitter, etc.) but **rarely revisit them**.
They end up with hundreds of unread bookmarks and zero progress — digital clutter that never gets reviewed.

---

## 3. Solution

StashLoop provides a **single inbox** for all saved links and uses a **daily resurfacing system** to re-show a few items each day (default: 3).
Each surfaced item can be:

- ✅ Marked **Done**
- 🕐 **Snoozed** (for tomorrow or next week)
- 📌 **Pinned** (prioritized in resurfacing)

This turns consumption into a game — progress, not storage.

---

## 4. Goals & Success Criteria

| Goal                | Metric                                                 |
| ------------------- | ------------------------------------------------------ |
| Daily revisit habit | 3 items reviewed/day                                   |
| User retention      | ≥40% D7 retention                                      |
| Reduced backlog     | >30% of total saved items marked “Done” within 30 days |
| Engagement          | Daily streak ≥5 days for top users                     |

---

## 5. Target Platforms

| Platform                          | Status                            |
| --------------------------------- | --------------------------------- |
| 📱 **Mobile (Expo/React Native)** | ✅ MVP                            |
| 🖥️ Web (Next.js 15)               | Planned (post-launch)             |
| 🧩 Chrome Extension               | Planned (for “Save to StashLoop”) |

---

## 6. Tech Stack

**Client (Mobile)**

- Expo (React Native + TypeScript)
- React Query
- Expo Router
- Expo Notifications
- Supabase JS SDK

**Backend**

- Supabase (Postgres + Auth + RLS)
- pg_cron for scheduled jobs
- Supabase Edge Functions (Deno)
- PostHog (optional analytics)

---

## 7. Core User Flows

### 🔹 Onboarding / Auth

1. Sign up (email/password via Supabase)
2. Verify email (optional for MVP)
3. App auto-creates `user_settings` row on first login

### 🔹 Save Item

1. Paste or share a URL
2. Creates new `items` record (`status='inbox'`)
3. Calls `scrape-metadata` edge function
4. Item metadata (title, image, description) auto-filled

### 🔹 Daily Resurfacing

1. `fill-today` cron runs hourly
2. Each user gets up to `items_per_day` (default 3) resurfaced from backlog
3. Users see “Today’s Items” in the app

### 🔹 Daily Review

User reviews 3 items → marks:

- ✅ **Done:** `status='done'`
- 🕐 **Snooze:** `status='snoozed'`, sets `next_at` to tomorrow or next week
- 📌 **Pin:** toggles `pinned=true`

### 🔹 Push Notification

- Hourly cron triggers `send-push`
- If user has today items, send Expo push:
  _“Your 3 saved gems are ready ✨”_

---

## 8. Database Schema

```sql
-- EXTENSIONS
create extension if not exists pgcrypto;
create extension if not exists pg_trgm;
create extension if not exists http;
create extension if not exists pg_cron;

-- USER SETTINGS
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  items_per_day int not null default 3 check (items_per_day between 1 and 10),
  reminder_hour int not null default 9 check (reminder_hour between 0 and 23),
  timezone text not null default 'Europe/Istanbul',
  streak int not null default 0,
  last_streak_at timestamptz
);

-- ITEMS
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  url text not null,
  domain text,
  title text,
  description text,
  thumb_url text,
  type text not null default 'other',
  status text not null default 'inbox', -- inbox | today | snoozed | done
  pinned boolean not null default false,
  added_at timestamptz not null default now(),
  last_seen_at timestamptz,
  seen_count int not null default 0,
  next_at timestamptz
);

-- DEVICE TOKENS
create table if not exists public.device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token text not null unique,
  created_at timestamptz not null default now()
);

-- INDEXES
create index if not exists items_user_status_idx on public.items(user_id, status);
create index if not exists items_user_nextat_idx on public.items(user_id, next_at);
create index if not exists items_user_pinned_idx on public.items(user_id, pinned) where pinned = true;
create index if not exists items_domain_trgm on public.items using gin (domain gin_trgm_ops);

-- RLS
alter table public.items enable row level security;
alter table public.device_tokens enable row level security;
alter table public.user_settings enable row level security;

create policy "items_owner_rw" on public.items
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "device_tokens_owner_rw" on public.device_tokens
for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_settings_owner_rw" on public.user_settings
for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- HELPER FUNCTIONS
create or replace function public.count_today_items(in_user uuid)
returns int language sql stable as $$
  select count(*)::int from public.items where user_id = in_user and status = 'today';
$$;

drop function if exists public.pick_candidates(uuid, int);
create or replace function public.pick_candidates(in_user uuid, in_limit int)
returns setof public.items
language sql stable as $$
  with pool as (
    select * from public.items
    where user_id = in_user and status in ('inbox','snoozed')
  ),
  scored as (
    select id, user_id, url, domain, title, description, thumb_url,
      type, status, pinned, added_at, last_seen_at, seen_count, next_at,
      (
        (case when pinned then 1000 else 0 end) +
        (case when next_at is not null and next_at <= now() then 200 else 0 end) +
        (case when seen_count = 0 then 50 else 0 end) +
        (extract(epoch from (now() - added_at)) / 86400.0)
      ) as score
    from pool
  )
  select id, user_id, url, domain, title, description, thumb_url,
    type, status, pinned, added_at, last_seen_at, seen_count, next_at
  from scored order by score desc limit in_limit;
$$;
```

---

## 9. Edge Functions (Supabase)

### `scrape-metadata`

Fetches Open Graph data for a URL and updates `items`.

**Input:**

```json
{ "itemId": "uuid", "url": "https://example.com" }
```

**Response:**

```json
{ "ok": true }
```

**Logic Summary:**

- Fetches HTML with a custom UA
- Extracts `<title>`, `og:title`, `twitter:title`, `og:description`, and `og:image`
- Updates `title`, `description`, `thumb_url`, `domain`, and inferred `type`

---

### `fill-today`

Hourly cron to fill users’ “today” queue.

**Logic:**

1. Loop all users in `user_settings`
2. Count today items
3. If < `items_per_day`, call `pick_candidates`
4. Pick diverse domains, set `status='today'`

---

### `send-push`

Hourly cron to notify users with “today” items.

**Logic:**

1. Select all `device_tokens` where `user_id` has today items
2. Call Expo push API
3. Message: `"Your 3 saved gems are ready ✨"`

---

### Cron Jobs (pg_cron)

```sql
select cron.schedule(
  'fill_today_hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/fill-today',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
  );
  $$);

select cron.schedule(
  'send_push_hourly',
  '5 * * * *',
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.functions.supabase.co/send-push',
    headers := jsonb_build_object('x-cron-secret', '<CRON_SECRET>')
  );
  $$);
```

---

## 10. Mobile App (Expo)

### Screens

| Screen       | Purpose                                    | Key Actions                          |
| ------------ | ------------------------------------------ | ------------------------------------ |
| **Today**    | Show up to 3 resurfaced items              | ✅ Done, 🕐 Snooze, 📌 Pin           |
| **Add Link** | Save new URL                               | Insert item → call `scrape-metadata` |
| **Inbox**    | View backlog (status='inbox' or 'snoozed') | Edit, Delete                         |
| **Stats**    | View streaks, total done                   | Read only                            |
| **Settings** | Change items/day, reminder time            | Upsert to `user_settings`            |

---

## 11. Client API Summary

| Action            | Endpoint / RPC                                                                 |
| ----------------- | ------------------------------------------------------------------------------ |
| Sign up / sign in | Supabase Auth                                                                  |
| Save link         | `POST /rest/v1/items` + call `scrape-metadata`                                 |
| Mark done         | `PATCH /rest/v1/items?id=eq.<id>` → `{status:'done'}`                          |
| Snooze            | `PATCH /rest/v1/items` → `{status:'snoozed', next_at: now()+interval '1 day'}` |
| Pin               | `PATCH /rest/v1/items` → `{pinned: !pinned}`                                   |
| Register push     | `upsert device_tokens`                                                         |
| Get Today items   | `select * from items where status='today' order by added_at`                   |

---

## 12. Folder Structure

```
apps/mobile/
  app/
    index.tsx              # Today
    add.tsx                # Add Link
    inbox.tsx
    stats.tsx
    settings.tsx
    _layout.tsx
  lib/
    supabase.ts
    api.ts
    notifications.ts
  components/
    TodayCard.tsx
    EmptyState.tsx
  store/
    useSession.ts
supabase/
  functions/
    scrape-metadata/
    fill-today/
    send-push/
```

---

## 13. Future Enhancements

- Browser Extension (“Save to StashLoop”)
- Web Dashboard (Next.js)
- Social integrations (save from LinkedIn/Twitter)
- AI-based summarization (optional)
- Sharing “Done” summaries weekly

---

## 14. ASO / Marketing (later)

**Play Store Title:**

> StashLoop — Read Later, 3 a Day

**Short Description:**

> Stop collecting, start revisiting. Get 3 saved links daily and build your learning streak.

**Bullets:**

- Save from any app
- Daily resurfacing
- Done / Snooze / Pin
- Build streaks & progress

---

## 15. References / Test Commands

**Sign up:**

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/auth/v1/signup" \
  -H "apikey: <ANON_KEY>" -H "Content-Type: application/json" \
  --data-raw '{"email":"tester@example.com","password":"TestPass123!"}'
```

**Insert item:**

```bash
curl -X POST "https://<PROJECT_REF>.supabase.co/rest/v1/items" \
  -H "apikey: <ANON_KEY>" -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  --data-raw '{"url":"https://example.com","status":"inbox"}'
```

**Scrape:**

```bash
curl -X POST "https://<PROJECT_REF>.functions.supabase.co/scrape-metadata" \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json" \
  --data-raw '{"itemId":"<ITEM_ID>","url":"https://example.com"}'
```

---

## 16. Summary

**StashLoop MVP** =
📥 Centralized saved content →
🔁 Daily resurfacing (3/day) →
✅ Simple Done/Snooze/Pin loop →
📊 Streak-based motivation →
📱 Mobile-first delivery via Expo.

This PRD covers:

- Full data model
- Function logic
- Cron setup
- Screen requirements
- Client ↔️ server flow

Use this as a **single source of truth** for development and Codex CLI context.

---

Would you like me to include **Expo boilerplate code structure (auth + today screen skeleton)** under the same PRD as Appendix A, so Codex can start scaffolding UI components right away?
