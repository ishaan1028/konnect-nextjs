# Konnect: Plan to rebuild Connect in Next.js 16 and Supabase

> A "learn Next.js by doing" rebuild of **Connect** (Express + MongoDB + Socket.io API, CRA + React-Bootstrap client).
> The new app is **Konnect**: Next.js 16 App Router + Supabase (Postgres, Auth, Storage, Realtime) + TanStack Query + shadcn/ui.
>
> Every phase ships something that runs, and each one teaches a set of Next.js concepts.
> Source repos: [connect-api](https://github.com/ishaan1028/connect-api) · [connect-client](https://github.com/ishaan1028/connect-client)

---

## 0. Before anything else: leaked secrets

Both old repos have a committed `.env`. `connect-api/.env` holds the **MongoDB URL, Cloudinary API secret, JWT secret, Gmail user and password**. `connect-client/.env` holds the Cloudinary upload preset. The repos are public, so treat all of these as compromised:

1. Rotate the MongoDB Atlas user password, the Cloudinary API secret and the Gmail app password, or delete those resources.
2. Remove `.env` from both repos. Deleting the file in a new commit isn't enough, because it stays in git history. Rotation is what actually protects you.
3. In Konnect, `.env*` is git-ignored from the first commit, and a `.env.example` documents the keys.

---

## 1. What the old project does (feature parity checklist)

I read every model, route, service and component. Everything below must exist in Konnect.

### Backend: 6 models, 26 endpoints, 1 socket server

| Area         | Old endpoints / behaviour                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Auth**     | `POST /auth/register` (fullName, userName, email, password; uniqueness checks) · `POST /auth/login` (returns a JWT and the user) · `PUT /auth/forgotpassword` (emails a reset link) · `PUT /auth/resetpassword`                                                                                                                                                                                                                                                                                |
| **Users**    | `GET /users/profile` (me) · `GET /users/suggestions` (everyone I don't follow) · `PUT /users/edit` (fullName, userName, bio; username must be unique) · `PUT /users/editpic` (set or remove the avatar; deletes the old one from Cloudinary) · `DELETE /users/delete` (cascades posts, images, comments, likes and follow edges) · `PUT /users/follow/:id` · `PUT /users/unfollow/:id` · `PUT /users/remove/:id` (remove a follower) · `GET /users/following/:id` · `GET /users/followers/:id` |
| **Posts**    | `POST /posts/create` (photo, caption ≤100, location ≤30) · `GET /posts/user` (my grid) · `GET /posts/explore` (others' posts, newest first) · `GET /posts/feed` (me + following, with likes and comments) · `GET /posts/:id` · `PUT /posts/update/:id` (caption, location) · `PUT /posts/like/:id` (like/unlike) · `DELETE /posts/delete/:id` (also deletes the image and comments)                                                                                                            |
| **Comments** | `POST /comments/add/:postid` (≤100 chars) · `DELETE /comments/delete/:postid/:commentid`                                                                                                                                                                                                                                                                                                                                                                                                       |
| **Chat**     | `POST /conversations` · `GET /conversations` · `POST /messages` · `GET /messages/:conversationId` · Socket.io `addUser` / `sendMessage` / `getMessage` with an in-memory user→socket map                                                                                                                                                                                                                                                                                                       |

### Frontend: 15 screens and components

Login (prefilled demo credentials) · Register · Forgot password · Reset password · Home (feed + my mini-profile + "Suggestions for you" with Follow) · Post card (like, comment, likes modal, last 3 comments, "view all N comments", delete own comment, owner edit/delete, relative time) · Explore grid · New post (file, caption, location) · View post (full post, edit modal, delete modal, comments, likes modal) · Profile (avatar change/remove modal, post/follower/following counts, bio, posts grid, disabled IGTV/Reels/**Saved** tabs, logout) · Profile edit (+ delete account modal) · Followers (remove) · Following (unfollow) · Messenger (conversation list, "New chat" modal listing followed users without a chat yet, messages, auto-scroll, Enter to send, real-time) · 404 · Toasts · Loader.

### Problems in the old code (Konnect fixes all of these)

These make a good "what I learned" story for interviews.

| #   | Problem                                                                                                                                                                                                                                  | Fix in Konnect                                                                                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Secrets committed (see §0)                                                                                                                                                                                                               | Validated env plus `.env.example`; secrets only on the server                                                                     |
| 2   | The JWT contains the **whole user document, including the password hash**, and never expires                                                                                                                                             | Supabase Auth: short-lived JWTs, refresh tokens, httpOnly cookies                                                                 |
| 3   | **No authorization:** anyone can delete or edit any post or comment; `createMessage` trusts `sender` from the body; any user can read any conversation (IDOR)                                                                            | Postgres **Row Level Security** on every table, plus server-side checks in a data access layer                                    |
| 4   | Follows and likes use `$push`, so duplicates are possible and you can follow yourself                                                                                                                                                    | Composite primary keys and a `CHECK (follower_id <> following_id)`                                                                |
| 5   | Forgot-password overwrites the **password field** with the token, locking the user out. The token never expires. A 404 response reveals which emails are registered                                                                      | Supabase recovery flow (one-time, expiring `token_hash`, PKCE) with a generic "if that email exists…" message                     |
| 6   | Account deletion loads **all posts** and loops queries without a transaction                                                                                                                                                             | `ON DELETE CASCADE` plus one admin call; storage cleaned by prefix                                                                |
| 7   | Socket.io keeps an in-memory map, so it breaks on Vercel or with more than one instance. Sockets are unauthenticated. Messages to offline users are lost                                                                                 | Supabase Realtime: private channels authorized by RLS, persisted messages, presence                                               |
| 8   | No pagination; the feed populates everything                                                                                                                                                                                             | Keyset (cursor) pagination plus infinite scroll                                                                                   |
| 9   | Token in `localStorage` (readable by XSS); state mutated in place (`post.comments.push`); a `filter` used where `map` was meant; `isLiked` never resets; one global spinner covers the whole page during a like; duplicate conversations | httpOnly cookies, immutable TanStack Query cache updates, optimistic UI, a `dm_key` unique constraint                             |
| 10  | You can only view **your own** profile                                                                                                                                                                                                   | Public `/[username]` profiles for everyone                                                                                        |
| 11  | Clickable `<svg>` icons and `<span>`s; images without dimensions or meaningful alt text; Enter sends empty messages                                                                                                                      | Real `<button>`s with `aria-label`/`aria-pressed`, `next/image` with width and height, user-written alt text, zod-validated input |
| 12  | Unsigned Cloudinary preset in the client with no size or type limits                                                                                                                                                                     | Storage buckets with an RLS folder policy, a 5 MB limit and a MIME allow-list; images compressed client-side to WebP              |

---

## 2. Stack (versions as of Oct 2026) and why

| Concern       | Choice                                                                                                                  | Why                                                                                                                |
| ------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Framework     | **Next.js 16.3** (App Router, Turbopack, `cacheComponents`, React Compiler, `typedRoutes`)                              | Current major. Cache Components gives Partial Prerendering: a static shell plus streamed dynamic parts             |
| UI runtime    | **React 19.x**                                                                                                          | Actions, `useOptimistic`, `useEffectEvent`, `<Activity>`                                                           |
| Language      | **TypeScript**, strict + `noUncheckedIndexedAccess`                                                                     | Pinned to whatever `create-next-app` 16.3 ships                                                                    |
| Backend       | **Supabase**: Postgres, Auth, Storage, Realtime; CLI for local dev, migrations and type generation                      | Everything in one place, as you asked. RLS replaces hand-written authorization middleware                          |
| Supabase SDK  | `@supabase/supabase-js` 2.x + `@supabase/ssr`                                                                           | Cookie-based sessions for Server Components, Actions, Route Handlers and the proxy                                 |
| Server state  | **TanStack Query v5** (+ Devtools)                                                                                      | Server prefetch → `HydrationBoundary` → client cache; optimistic updates; infinite queries; realtime cache patches |
| Forms         | **React Hook Form** + `@hookform/resolvers` + **Zod 4**                                                                 | One schema validates on both the client and the server                                                             |
| Mutations     | **next-safe-action 8**                                                                                                  | Typed Server Actions with Zod input, an auth middleware and consistent error shapes                                |
| UI kit        | **shadcn/ui** (CLI v4, `base-luma` style) + **Base UI** + Tailwind CSS v4 + `tw-animate-css` + **lucide-react**         | Accessible Base UI primitives (shadcn's current default) that you own as source code                               |
| Theming       | Custom pre-paint theme script + `useSyncExternalStore` store (light/dark/system × `green`/`violet` accents)             | Follows the Next 16 "preventing flash" guide; avoids next-themes' client `<script>` warning. See Phase 2           |
| Toasts        | **sonner** (shadcn's toast)                                                                                             |                                                                                                                    |
| Motion        | **motion** (`LazyMotion` + `m`)                                                                                         | Like-heart burst, page transitions; respects `prefers-reduced-motion`                                              |
| URL state     | **nuqs**                                                                                                                | Typed search params (`/explore?q=`, profile tabs)                                                                  |
| Dates         | **date-fns 4** (replaces moment)                                                                                        | Tree-shakable; moment is deprecated                                                                                |
| Images        | `next/image`, **browser-image-compression**, **react-easy-crop**, **thumbhash**                                         | Resize to ≤1080px WebP before upload, crop like Instagram, stored blur placeholders (no layout shift)              |
| Lists         | `react-intersection-observer` (infinite scroll), `@tanstack/react-virtual` (long chats)                                 |                                                                                                                    |
| Env           | `@t3-oss/env-nextjs`                                                                                                    | Build fails if an environment variable is missing or invalid                                                       |
| Quality       | ESLint (`eslint-config-next`), Prettier + `prettier-plugin-tailwindcss`, husky + lint-staged                            |                                                                                                                    |
| Tests         | **Vitest** + Testing Library + jsdom · **Playwright** + `@axe-core/playwright` · **pgTAP** (`supabase test db`) for RLS | Reviewers look for RLS tests                                                                                       |
| Observability | `@vercel/analytics`, `@vercel/speed-insights`; optional `@sentry/nextjs`                                                |                                                                                                                    |
| Hosting       | **Vercel** (app) + **Supabase Cloud** (backend)                                                                         |                                                                                                                    |

### Decisions I made, and alternatives I considered

1. **Reads on the client, through RLS. Writes through Server Actions.**
   - TanStack Query `queryFn`s use the Supabase browser client. That's fast (no extra hop through Next) and safe because RLS enforces access. The first page of data is **prefetched on the server** and hydrated, so there are no loading spinners on first paint.
   - Mutations (profile, follow, post, like, comment, delete) are **Server Actions**. Each gets one Zod validation point, can call `updateTag()` to invalidate Next's cache, and can be rate-limited.
   - Exception: **chat messages are inserted directly from the browser.** React runs Server Actions one at a time per client, so a fast-typing chat would queue behind them. RLS and `CHECK` constraints guard the insert instead. This trade-off is worth explaining in an interview.
2. **"Cache the public, personalize on the client."** Profiles and posts are public (like public Instagram accounts). So `generateMetadata`, OG images and the public profile header can use `"use cache"` + `cacheTag('profile:<username>')` with a cookie-less Supabase client, and are invalidated with `updateTag` from actions. Per-viewer data (`liked_by_me`, `is_following`, feed, chat) is never in the shared cache; it comes from TanStack Query.
3. **Supabase Realtime: Broadcast from Database plus Presence** for chat, rather than `postgres_changes`. A trigger broadcasts each new message to a **private channel** `conversation:<id>`, authorized by RLS on `realtime.messages`. Supabase recommends this approach because it scales better. Presence adds online dots and typing indicators.
4. **Counters are denormalized with triggers** (`followers_count`, `likes_count`, `comments_count`, `posts_count`). Feeds stay a single indexed query instead of `COUNT(*)` per row.
5. **Images:** compress on the client, upload straight to Storage (RLS restricts each user to the `<uid>/` folder), store `width`/`height`/`thumbhash`, and render with `next/image` using `remotePatterns`. If you upgrade to Supabase Pro later, a custom `loader` can switch to Supabase image transformations.
6. **Better ideas outside Supabase** (all optional; the core stays 100% Supabase):
   - **Resend as Supabase Auth's custom SMTP.** Supabase's built-in email is heavily rate-limited and only meant for testing. Required for a real signup and reset flow.
   - **Upstash Ratelimit** on comment and post actions.
   - **Sentry** for errors.
   - Note: free Supabase projects **pause after 7 days of inactivity**. For a portfolio that recruiters open at random times, use a small cron ping or the Pro plan.
7. **Product rules kept from the old app:** you can only _start_ a chat with someone you follow; Explore shows other people's posts newest-first; suggestions are people you don't follow.
8. **Product improvements** (each marked ★ in the phases):
   - Public profiles for any user, user search, and real routes for post and follower modals
   - Alt text, cropping, blur placeholders, and a double-tap like
   - Post owners can delete comments on their posts
   - Read receipts, unread badges, typing and online indicators in chat
   - A "Continue as demo user" button instead of credentials shown in the UI
   - Bonus: the **Saved** tab the old UI teased, and notifications
9. **Limits are slightly modernized:**
   - Username: 3–20 characters of `[a-z0-9._]`, stored lowercase, with a reserved list such as `explore` and `settings`
   - Bio ≤150, caption ≤2,200, comment ≤500, message ≤2,000, location ≤50
   - Password ≥8 (set in Supabase Auth config)
10. **Package manager:** pnpm 12. **Node:** 24 LTS (pinned in `.nvmrc`; needed for native TypeScript in `next.config.ts`). The project is `"type": "module"`.

---

## 3. Architecture

### 3.1 Folder structure (feature-based)

```
konnect-nextjs/
├─ src/
│  ├─ app/
│  │  ├─ (auth)/                 # centered card layout, no app chrome
│  │  │  ├─ login/  signup/  forgot-password/  reset-password/
│  │  ├─ auth/confirm/route.ts   # verifies email/recovery token_hash
│  │  ├─ (app)/                  # authenticated shell: sidebar / bottom tabs
│  │  │  ├─ layout.tsx
│  │  │  ├─ @modal/              # parallel route slot for intercepted modals
│  │  │  │  ├─ (.)p/[postId]/page.tsx
│  │  │  │  ├─ (.)[username]/followers/page.tsx
│  │  │  │  └─ (.)[username]/following/page.tsx
│  │  │  ├─ page.tsx             # home feed
│  │  │  ├─ explore/  create/  saved/
│  │  │  ├─ messages/layout.tsx  messages/page.tsx  messages/[conversationId]/page.tsx
│  │  │  ├─ settings/{profile,account,appearance}/
│  │  │  ├─ p/[postId]/page.tsx
│  │  │  └─ [username]/{page.tsx, followers/, following/, opengraph-image.tsx}
│  │  ├─ layout.tsx  not-found.tsx  global-error.tsx  manifest.ts  robots.ts  sitemap.ts
│  ├─ components/ui/             # shadcn (generated, owned)
│  ├─ components/{layout,shared}/
│  ├─ features/
│  │  ├─ auth/      {components/, actions.ts, schemas.ts}
│  │  ├─ profiles/  {components/, actions.ts, queries.ts, schemas.ts, hooks/}
│  │  ├─ follows/   posts/   comments/   likes/   chat/   saved/
│  ├─ lib/
│  │  ├─ supabase/{client.ts, server.ts, admin.ts, public.ts, proxy.ts}
│  │  ├─ query/{get-query-client.ts, keys.ts, provider.tsx}
│  │  ├─ dal.ts                  # verifySession(), requireUser(); server-only
│  │  ├─ safe-action.ts  env.ts  images.ts  utils.ts
│  ├─ types/database.types.ts    # generated by `supabase gen types`
│  └─ proxy.ts                   # Next 16's name for middleware: session refresh + optimistic redirects
├─ supabase/{config.toml, migrations/, seed.sql, tests/*.sql, templates/*.html}
├─ e2e/                          # Playwright
└─ docs/PLAN.md
```

### 3.2 Route map: old → new

| Old (react-router)                                 | New (App Router)                                 | Notes                                         |
| -------------------------------------------------- | ------------------------------------------------ | --------------------------------------------- |
| `/user/login`                                      | `/login`                                         | `?next=` return path                          |
| `/user/register`                                   | `/signup`                                        | live username availability check              |
| `/user/forgotpassword`                             | `/forgot-password`                               |                                               |
| `/user/resetpassword/:jwt`                         | `/auth/confirm` → `/reset-password`              | Route Handler + PKCE                          |
| `/` `/home`                                        | `/`                                              | feed + suggestions rail                       |
| `/newpost`                                         | `/create`                                        | crop, alt text, preview                       |
| `/explore`                                         | `/explore?q=`                                    | ★ user search                                 |
| `/messenger`                                       | `/messages`, `/messages/[conversationId]`        | deep-linkable chats                           |
| `/posts/:id`, `/posts/:id/:op`                     | `/p/[postId]` (+ modal over feed/grid)           | edit/delete via a dropdown, not a URL segment |
| `/profile`                                         | `/[username]`                                    | ★ any user's profile                          |
| `/profile/edit`                                    | `/settings/profile`, `/settings/account`         | delete account in the danger zone             |
| `/profile/followers/:id`, `/profile/following/:id` | `/[username]/followers`, `/[username]/following` | intercepted modals                            |
| `*`                                                | `not-found.tsx`                                  |                                               |
| —                                                  | `/settings/appearance`, `/saved`                 | ★ new                                         |

### 3.3 Data model (Postgres)

```sql
profiles      (id uuid PK → auth.users ON DELETE CASCADE, username text UNIQUE (stored lowercase) CHECK (private.is_valid_username),
               full_name, bio, avatar_path, followers_count, following_count, posts_count, created_at, updated_at)
follows       (follower_id, following_id, created_at, PK(follower_id, following_id), CHECK follower_id <> following_id)
posts         (id uuid PK, author_id, image_path, image_width, image_height, thumbhash, alt_text,
               caption, location, likes_count, comments_count, created_at, updated_at)
post_likes    (post_id, user_id, created_at, PK(post_id, user_id))
comments      (id uuid PK, post_id, author_id, body CHECK 1..500, created_at)
saved_posts   (user_id, post_id, created_at, PK)                         -- bonus
conversations (id uuid PK, dm_key text UNIQUE, last_message_at, last_message_preview, created_at)
conversation_participants (conversation_id, user_id, last_read_at, PK)
messages      (id uuid PK, conversation_id, sender_id, body CHECK 1..2000, created_at)
```

- **Indexes:** `posts(author_id, created_at desc, id desc)`, `posts(created_at desc, id desc)`, `follows(following_id)`, `post_likes(user_id)`, `comments(post_id, created_at)`, `messages(conversation_id, created_at desc)`, `conversation_participants(user_id)`, and `pg_trgm` on `profiles.username/full_name` for search.
- **Triggers:**
  - `handle_new_user` (auth.users → profiles, from signup metadata)
  - counter triggers
  - `updated_at` triggers
  - `messages` → update `conversations.last_message_*` and `realtime.broadcast_changes`
- **RPCs:**
  - `get_feed(cursor)` returns posts from me + people I follow, with the author and `liked_by_me`
  - `get_suggestions(limit)`
  - `is_username_available(name)`
  - `get_or_create_dm(other_user)`, security definer; enforces "must follow" and dedupes via `dm_key = least||':'||greatest`
  - `mark_conversation_read(id)`
  - computed field `liked_by_me(posts)` for PostgREST embedding
- **RLS** (using `(select auth.uid())` for performance):
  - profiles, posts, comments, follows and likes are readable by everyone; writes only on your own rows
  - `posts` UPDATE is column-restricted (`grant update (caption, location, alt_text)`) so counters can't be tampered with
  - follows DELETE is allowed when you're either side of the edge (unfollow _or_ remove a follower)
  - comments DELETE: comment author **or** post owner
  - chat tables: participants only, via a security-definer `is_participant()` to avoid policy recursion
  - `realtime.messages`: participants only, for topic `conversation:<id>`
- **Storage:**
  - `avatars` and `posts` buckets: public read, 5 MB limit, MIME allow-list `image/webp,image/jpeg,image/png`
  - insert/update/delete only where `(storage.foldername(name))[1] = auth.uid()::text`

### 3.4 Data flow pattern used everywhere

```
Server Component (page)                 Client Component
───────────────────────                 ─────────────────
await requireUser()          ─┐
qc = getQueryClient()         │
void qc.prefetchQuery(        │  dehydrate  ┌─> useSuspenseQuery(feedOptions())  (same key, same fn)
  feedOptions())              ├────────────►│   useMutation(serverAction) + onMutate optimistic patch
<HydrationBoundary>           │             │   realtime event → qc.setQueryData(...)
  <Suspense fallback=Skeleton>┘             └─> invalidate / updateTag on settle
```

- One `queryOptions()` factory per query (`features/*/queries.ts`) with a central key factory (`lib/query/keys.ts`).
- `getQueryClient()` creates a new client per request on the server and a singleton in the browser. `shouldDehydrateQuery` includes pending queries, so prefetches can **stream**.
- Defaults: `staleTime: 60s`; `refetchOnWindowFocus` on for feed and chat lists.

---

## 4. Build plan, phase by phase

Every phase has four parts:

- **Learn:** the Next.js concepts it teaches
- **Build:** the tasks
- **Done when:** the acceptance check
- A **git commit** (or PR) at the end

For each phase I'll explain the concepts first, then build it with you in small commits, explaining every file. You can ask to write any piece yourself and have me review it.

### Phase 0: Prep (½ day)

- Rotate the secrets (§0). Create Supabase, Vercel and GitHub (`konnect-nextjs`) accounts and a project.
- Install **Docker Desktop or OrbStack**; the local Supabase stack needs it, and Docker isn't currently on your PATH.
- Upgrade the Supabase CLI (you have 2.90; latest is 2.119) and pnpm.
- **Done when:** `supabase --version` and `docker info` both work.

### Phase 1: Scaffold and tooling

- **Learn:**
  - App Router mental model: `app/` file conventions (`layout`, `page`, `loading`, `error`, `not-found`)
  - Server Components by default; `"use client"` boundaries
  - Turbopack
  - `next.config.ts` flags: `cacheComponents`, `reactCompiler`, `typedRoutes`
  - Why `src/` and route groups
- **Build:**
  - `pnpm create next-app@latest` (TS, ESLint, Tailwind, App Router, `src/`, `@/*` alias)
  - Strict tsconfig
  - Prettier with the Tailwind plugin, husky + lint-staged
  - `@t3-oss/env-nextjs` (`src/lib/env.ts`), `.env.example`
  - Vitest with one sample test
  - GitHub Actions CI: typecheck, lint, test, build
  - Create the folder skeleton from §3.1
- **Done when:** `pnpm dev`, `pnpm build`, `pnpm test` and CI are all green.

### Phase 2: Design system, themes and app shell

- **Learn:**
  - Root layout and the `<html>`/`<body>` contract
  - `next/font` (zero-CLS self-hosted fonts)
  - Metadata API (`metadata`, `viewport`, `themeColor`)
  - Hydration and why theme scripts need `suppressHydrationWarning`
  - Route groups `(auth)` vs `(app)` with different layouts
  - `<Link>` prefetching; `usePathname` for the active nav
  - `loading.tsx` vs `<Suspense>`
- **Build:**
  - `shadcn init --preset b2pjIZz7o --base base`: Base UI, **Luma** style ("fluid, luminous and soft"), neutral base, Green theme, Geist, Lucide, large radius. Components are added as each phase needs them.
  - **Theme system** (`src/components/theme/`), built per the Next 16 "Preventing flash before hydration" guide instead of `next-themes`:
    - One self-contained `syncThemeToDom()` function is inlined into `<head>` (via `.toString()`) and also called by the client store, so the pre-paint path and the click path can't diverge.
    - **Accent presets:** shadcn's **Green** (default, in `:root`/`.dark`) and **Violet** (`:root[data-accent="violet"]`, `:root.dark[data-accent="violet"]`). Only `--primary(-foreground)`, `--chart-*` and `--sidebar-primary(-foreground)` change. Adding a preset is two CSS blocks plus one entry in `ACCENTS`.
    - The store is read with `useSyncExternalStore` (server snapshot = defaults, so there's no hydration mismatch). It syncs across tabs (`storage` event) and follows OS changes in System mode.
    - `ThemeSync` re-applies the theme after React's dev-mode remount resets `<html>`.
    - Controls live in the "More" menu and on `/settings/appearance` (radio groups with previews).
  - **Visual language (Gen-Z, still professional):**
    - Fonts: Geist Sans for UI, **Bricolage Grotesque** for the Konnect wordmark and headings
    - `--radius: 1rem`; soft cards, generous spacing, a glassy sticky header (`backdrop-blur`)
    - Avatars with a primary→accent gradient ring
    - Pill buttons; subtle motion; skeletons that match final layouts
  - **App shell:**
    - Desktop: left rail sidebar (icons + labels, collapsing to icons at `md`)
    - Mobile: a bottom tab bar (Home, Explore, Create, Messages, Profile)
    - `xl`: right rail for suggestions
    - Skip-to-content link and proper landmarks
  - Static placeholder pages for every route in §3.2; branded `not-found`, `error` and `global-error`.
- **Done when:** you can click every route, light/dark/system × green/violet all work with no flash on reload, and Lighthouse a11y is 100 on the shell.

### Phase 3: Supabase foundation

- **Learn:**
  - **`proxy.ts`** (Next 16's name for middleware): what it should and shouldn't do; `matcher`
  - The three Supabase clients and why: browser, server (cookies), and admin (`server-only`, secret key)
  - `cookies()` is async and makes a route dynamic
  - `import "server-only"`
  - Generated DB types
- **Build (done):**
  - Supabase CLI as a dev dependency (pinned in `package.json`); `pnpm db:*` scripts for start/stop/reset/new/lint/advisors/test/types.
  - `config.toml`: `localhost` site URL, passwords ≥8 with letters + digits, email confirmation required, recent login needed to change password. Local Auth signs tokens with **ES256** by default.
  - Migration `profiles`: table, `private` schema for helpers, `is_valid_username()` (format, reserved names), `handle_new_user` trigger, `updated_at` trigger, RLS (public read, owner update), **column-level grants** so counters can't be written, `is_username_available()` RPC. Username is lowercase `text` instead of `citext` (no extension needed).
  - `pnpm db:types` generates and Prettier-formats `src/types/database.types.ts`; CI fails if it's stale.
  - Clients: `lib/supabase/client.ts` (browser), `server.ts` (cookies, `server-only`), `admin.ts` (secret key, `server-only`), `proxy.ts` (`updateSession`).
  - `src/proxy.ts` refreshes the session via `getClaims()` on every request, prefetches included (skipping them can burn single-use refresh tokens). Optimistic redirects arrive in phase 4.
  - `lib/dal.ts`: `getSessionUser = cache(...)` and `requireUser()`. `"use cache: private"` will be evaluated in phase 5.
  - pgTAP: 18 tests (trigger, validation, RLS, grants, cascade). Verified they fail when RLS is disabled.
  - CI `database` job: migrations from scratch, SQL lint, security/performance advisors, pgTAP, generated-types drift check.
- **Done when:** migrations apply from scratch (`supabase db reset`), types are generated, and the RLS test passes. ✅

### Phase 4: Authentication

- **Learn:**
  - Server Actions (`"use server"`), next-safe-action middleware (auth context)
  - React Hook Form + Zod shared schemas
  - `redirect()` inside actions
  - Route Handlers (`/auth/confirm/route.ts`)
  - PKCE `token_hash` flow
  - Search params as props (async)
  - Error vs validation states
- **Build:**
  - **Signup:** full name, username (debounced availability check), email, password with a strength hint. Metadata goes to the profile trigger. A "Check your email" screen.
  - **Login** with `?next=`, plus a **"Continue as demo user"** button: a server action signs into a seeded demo account whose credentials live only in server env.
  - **Forgot password** with a generic success message (no user enumeration) → email → `/auth/confirm?type=recovery` → **reset password** form (`updateUser`).
  - **Logout** (server action, `revalidatePath('/', 'layout')`).
  - Custom Supabase email templates in `supabase/templates`, wired to `/auth/confirm`.
  - Authenticated users are redirected away from `(auth)` pages.
  - Playwright e2e for signup → confirm (via the local Inbucket/Mailpit inbox) → login → logout.
- **Done when:** the whole auth loop works locally, including password reset, and e2e is green. ✅
- **Notes from the build:**
  - `lib/safe-action.ts`: one action client (metadata + server-error masking) and an `authActionClient` whose middleware puts the verified user in `ctx`.
  - `useHookFormAction` (next-safe-action RHF adapter) maps server field errors back onto inputs.
  - Inputs are **uncontrolled** (`register`, no `defaultValues`), so text typed before hydration survives; each field subscribes via `useFormState`.
  - A `<ul>` inside shadcn's `FieldDescription` (`<p>`) caused a hydration error that re-rendered the form and wiped typed input, which was the real cause of a flaky e2e test. `e2e/console.spec.ts` now fails on any console error.
  - `safeNextPath()` blocks open redirects and is the only place an untrusted path becomes a typed `Route`.
  - The proxy redirects signed-out users from personal pages to `/login?next=…` and signed-in users away from auth pages, carrying refreshed cookies and cache headers.
  - Seeded demo account `@alex.demo`; its credentials are server-only env. The demo account must be protected from password change and deletion (phase 12).
  - CI `e2e` job: a slim Supabase stack, the production build, Playwright with an uploaded report on failure. 16 e2e tests, including axe on the auth pages.

### Phase 5: TanStack Query infrastructure and the current user

- **Learn:**
  - Server vs client data fetching, and when to use each
  - The `HydrationBoundary` / `dehydrate` pattern
  - Streaming with `<Suspense>` plus pending-query dehydration
  - Cache Components: static shell vs dynamic holes
  - `staleTime` / `gcTime`
  - React Query Devtools
- **Build:**
  - `QueryProvider`, `getQueryClient`, key factory
  - `meQueryOptions` + `useCurrentUser()`
  - User menu (avatar, theme switcher, logout) in the shell, prefetched on the server
  - Global mutation error → sonner toast
- **Done when:** the shell shows the real user with no loading flash, and Devtools shows the hydrated cache.

### Phase 6: Profiles and settings

- **Learn:**
  - Dynamic segments (`[username]`) and async `params`
  - `notFound()`
  - `generateMetadata`
  - **`"use cache"` + `cacheTag` + `cacheLife`**, invalidated with **`updateTag`** inside actions (read-your-own-writes)
  - `next/image` + `remotePatterns`
  - `opengraph-image.tsx` (dynamic OG cards)
  - `nuqs` for tabs
- **Build:**
  - Migration `0002_storage.sql`: `avatars` bucket and policies.
  - **`/[username]` profile:**
    - Header: avatar, name, @username, bio, post/follower/following counts, Edit or Follow/Message buttons
    - Tabs: Posts (and ★ Saved for yourself)
    - Empty states
  - **Avatar:** change (crop with react-easy-crop → compress → upload to `avatars/<uid>/<uuid>.webp` → action updates `avatar_path` and deletes the old object) and remove (back to a generated initials avatar; no hard-coded default image URL needed).
  - **`/settings/profile`** form (RHF + Zod; username uniqueness handled both by a pre-check and the DB constraint error), with a sticky save bar.
- **Done when:** you can view any profile, edit your own (it reflects instantly), and social-share previews render.

### Phase 7: Social graph (follow, unfollow, remove follower, suggestions)

- **Learn:**
  - **Parallel routes (`@modal`) + intercepting routes (`(.)`)**: followers open as a modal on soft navigation and as a full page on refresh or share
  - `useMutation` with **optimistic updates** and rollback
  - Cross-query invalidation
- **Build:**
  - Migration `0003_follows.sql`: table, counters, RLS, `get_suggestions`.
  - `FollowButton` (optimistic, `aria-pressed`)
  - Followers list (with **Remove** when it's your profile) and Following list (with **Unfollow**), paginated, as intercepted modals
  - Suggestions rail on the home page with Follow; the feed is invalidated after following
  - pgTAP: can't follow yourself, can't create an edge for someone else, either side can delete
- **Done when:** counts stay correct under rapid clicking, the modal routes work with back and refresh, and the RLS tests pass.

### Phase 8: Creating, editing and deleting posts

- **Learn:**
  - Heavy client work in client components
  - `next/dynamic` for code-splitting (the cropper only loads on `/create`)
  - Server Action validation of client-supplied storage paths
  - `revalidatePath` vs `updateTag`
  - Progressive enhancement trade-offs
- **Build:**
  - Migration `0004_posts.sql`: posts, `posts` bucket, counters, column-level update grant.
  - **`/create`:**
    - Drag-drop or pick a file; crop to 1:1, 4:5 or 1.91:1
    - Compress to WebP ≤1080px; compute a thumbhash
    - Alt text, caption with a character counter, location
    - Upload with progress
    - The action verifies the path starts with `<uid>/` and that the object exists, inserts the row, then redirects to the post
  - Owner menu (dropdown): **Edit** (caption, location, alt text in a dialog) and **Delete** (alert dialog; the action deletes the row and then the storage object)
- **Done when:** posting is quick on mobile, images never shift layout, and you can't edit someone else's post even by calling the API directly.

### Phase 9: Feed, Explore, post detail and likes

- **Learn:**
  - `useInfiniteQuery` + `prefetchInfiniteQuery`
  - Keyset pagination
  - `next/image` `sizes` and `preload` (formerly `priority`) for the LCP image
  - Partial Prerendering in practice
  - Intercepting routes again (`/p/[postId]` as a modal over the feed, explore and profile grid)
  - nuqs-driven search
- **Build:**
  - Migration `0005_likes.sql` + `get_feed` RPC + `liked_by_me` computed field + `pg_trgm` search.
  - **Home feed:**
    - Infinite `PostCard`s: header, image, actions, likes, caption, latest comments, "View all N comments", relative time in a `<time>` element
    - Empty state that points to suggestions
  - **Likes:**
    - Optimistic toggle; ★ double-tap heart burst (motion, reduced-motion aware)
    - "Liked by …" dialog with an infinite list
  - **Explore:** masonry or 3-column grid of others' posts with a hover overlay showing counts; ★ `?q=` user search (Command palette style).
  - **`/p/[postId]`:** full page (image on the left, comments on the right on desktop; stacked on mobile) and the intercepted modal version.
- **Done when:** the feed scrolls endlessly with 60fps-feeling interactions, the first image is the LCP and is preloaded, and Lighthouse performance is ≥95 on mobile for `/p/[id]`.

### Phase 10: Comments

- **Learn:** optimistic inserts with temporary IDs, focus management, `aria-live` for new content.
- **Build:**
  - Migration `0006_comments.sql`: table, counters, RLS (author or post owner can delete).
  - Paginated comment list, add-comment form (Enter submits, Shift+Enter adds a newline, no empty comments), delete with confirmation
  - The comment button focuses the input; the feed card's "latest comments" stays in sync through the cache
- **Done when:** commenting feels instant, deleting works for both roles, and the RLS tests pass.

### Phase 11: Real-time chat

- **Learn:**
  - Where client-only side effects belong (`useEffect` + cleanup)
  - `useEffectEvent` for stable handlers
  - Patching the TanStack cache from socket events
  - Nested layouts (`messages/layout.tsx` keeps the inbox mounted while switching chats)
  - Responsive two-pane vs stacked navigation
  - `@tanstack/react-virtual`
- **Build:**
  - Migration `0007_chat.sql`: conversations, participants, messages, `dm_key`, `get_or_create_dm`, `mark_conversation_read`, `is_participant`, broadcast trigger, `realtime.messages` policies.
  - **Inbox:**
    - Conversations sorted by `last_message_at`, with preview, time and **unread badge** (also shown on the nav icon)
    - Live updates from a per-user channel
  - **New chat dialog:** searchable list of people you follow (Command).
  - **Thread:**
    - Upward infinite history, day separators, grouped bubbles (own messages in the primary color)
    - Optimistic send with retry on failure
    - **Typing indicator** (broadcast), **online dot** (presence), **"Seen"** (`last_read_at`)
    - Auto-scroll only when you're already at the bottom; otherwise show a "New messages ↓" pill
    - `aria-live="polite"` log
  - Playwright test with **two browser contexts** chatting in real time.
- **Done when:** two browsers chat instantly; a refresh keeps the history; a user can't subscribe to or read someone else's conversation (pgTAP plus a manual check).

### Phase 12: Account deletion and danger zone

- **Learn:** the admin client (secret key) only in `server-only` modules; why the delete happens server-side; sign-out and cache purge.
- **Build:** `/settings/account`:
  - Type your username to confirm
  - The action lists and removes `avatars/<uid>/*` and `posts/<uid>/*`, then calls `auth.admin.deleteUser(uid)`; `ON DELETE CASCADE` removes everything else
  - Sign out, clear the query cache, redirect with a toast
- **Done when:** after deletion, no rows or objects with that UID remain (verified by a SQL check in tests).

### Phase 13: Polish, accessibility, SEO and performance pass

- **SEO and PWA:** `sitemap.ts` (public profiles and posts), `robots.ts`, `manifest.ts` + icons, canonical URLs, per-page titles via a `title.template`.
- **Accessibility audit:**
  - Keyboard-only walkthrough; focus rings; Radix dialogs restore focus
  - 44px touch targets
  - Contrast checked for all four theme combinations
  - `prefers-reduced-motion`
  - axe in Playwright on every main route
- **Performance:**
  - `@next/bundle-analyzer`; dynamic-import heavy components
  - `LazyMotion`; check for accidental `"use client"` at high levels
  - Run the Supabase **Performance and Security Advisors** and fix every warning
  - Indexes verified with `EXPLAIN`
- **UX:** every list has a skeleton, empty state and error state with retry; `error.tsx` per segment; optimistic rollbacks show a toast.
- **Optional:** Upstash rate limiting on comment, post and follow actions.

### Phase 14: Production deploy

- Supabase Cloud project:
  - `supabase link`, `supabase db push`
  - Auth: Site URL, redirect URLs, **custom SMTP (Resend)**, email templates, min password length, enable asymmetric JWT keys
- Seed a demo account and content (`seed.sql` locally, a script for production).
- Vercel:
  - Env vars and preview deployments (optionally **Supabase Branching** per PR)
  - Analytics and Speed Insights; optional Sentry
- CI: on PRs, run lint, typecheck, unit tests, pgTAP (`supabase test db`), build, and Playwright against local Supabase in Docker.
- A README with an architecture diagram, decisions (from §2), Lighthouse scores, a test matrix and screenshots for both themes. Reviewers read this first.

### Bonus phases (after parity)

- **Saved posts** (the old UI's disabled "Saved" tab), using `saved_posts` and a bookmark toggle.
- **Notifications:** likes, comments and follows written by triggers into a `notifications` table, with a realtime badge and an activity page.
- **OAuth** sign-in (Google or GitHub) through Supabase.
- Multi-image carousel posts, message reactions, and "unsend" (delete) messages.

---

## 5. Conventions I'll follow throughout

- Server Components by default; client components are small leaves (buttons, forms, realtime).
- Never `select('*')` in app code; select explicit columns that match a typed DTO.
- Zod schemas live in `features/*/schemas.ts` and are imported by both the form and the action.
- Actions return `{ data } | { serverError | validationErrors }` (next-safe-action) and never throw raw DB errors to the client.
- Query keys come only from `lib/query/keys.ts`.
- Each migration is small and named, and any new table ships with its RLS and pgTAP test in the same commit.
- Conventional Commits; one commit or PR per phase step.

## 6. Progress tracker

- [x] 0 Prep · [x] 1 Scaffold · [x] 2 Design system & themes · [x] 3 Supabase foundation · [x] 4 Auth
- [ ] 5 Query infra · [ ] 6 Profiles · [ ] 7 Follows · [ ] 8 Create post · [ ] 9 Feed/Explore/Likes
- [ ] 10 Comments · [ ] 11 Chat · [ ] 12 Delete account · [ ] 13 Polish · [ ] 14 Deploy · [ ] Bonus
