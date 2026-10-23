<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Konnect project conventions

- The roadmap, architecture and decisions live in `docs/PLAN.md`; follow its phase order and §5 conventions.
- Package manager: pnpm. Before committing run `pnpm check` (typecheck, lint, format, unit tests).
- Server Components by default; add `"use client"` only on small interactive leaves.
- Environment variables are read only through `@/lib/env` (server) or `@/lib/public-env` (browser code: the `NEXT_PUBLIC_` values, validated by `env` at build), never `process.env` directly in app code. Importing `env` in the browser would ship Zod to every page.
- Keep Zod out of browser code that loads on first paint (shell, post, profile, feed): only forms import schemas; a value that just needs a quick check gets a plain helper (`isPostId`). The server still validates with the schema.
- Feature code lives in `src/features/<feature>/`; shared primitives in `src/components/` and `src/lib/`.
- shadcn components use **Base UI**: compose with the `render` prop (not Radix's `asChild`). Base UI's own docs ship in `node_modules/@base-ui/react/docs/`.
- Props passed from Server to Client Components must be serializable: pass rendered elements (`icon={<Icon />}`), never component functions.
- With Cache Components, anything reading request/URL data (`params`, `cookies()`, `usePathname()` under a dynamic route) belongs inside `<Suspense>` so the static shell can prerender.
- Supabase: browser code uses `@/lib/supabase/client`, server code `@/lib/supabase/server`; `@/lib/supabase/admin` bypasses RLS and is for trusted server jobs only. Identify users with `getClaims()` via `@/lib/dal` (never `getSession()` on the server). The server client awaits `connection()` (session reads never run while prerendering), and only `isSignedOutError()` errors mean "signed out"; other `getClaims()` errors are failures.
- Every schema change is a migration (`pnpm db:new <name>`) that ships with RLS, grants and pgTAP tests, followed by `pnpm db:types`. Check with `pnpm db:lint && pnpm db:advisors && pnpm db:test`.
- Forms: React Hook Form + `useHookFormAction` + shared Zod schema in `features/*/schemas.ts`; use `@/components/forms/text-field` (uncontrolled `register`, no `defaultValues`). Never put block elements inside `FieldDescription` (it's a `<p>`); hydration errors wipe user input.
- Server Actions are built from `@/lib/safe-action` (`actionClient` / `authActionClient`) with `.metadata({ actionName })`; return expected failures with `returnServerError` / `returnValidationErrors`.
- E2E: `pnpm test:e2e` (dev server) or `pnpm test:e2e:prod`; needs `pnpm db:start`.
- TanStack Query: shared `queryOptions` in `features/*/queries.ts` take the Supabase client as a parameter; keys only from `@/lib/query/keys`. Prefetch on the server inside a small `<Suspense>` + boundary (`CurrentUserBoundary` pattern) and never await it (pending queries stream, so cached data shows at once and refreshes in the background), read with `useSuspenseQuery` *inside* that boundary only, never from components rendered outside it.
- Every list's `<Suspense>` sits inside `<LoadErrorBoundary what="…">` (a failed load shows "Couldn't load … Try again" in place, not the page-wide error.tsx); infinite lists render `<LoadMoreError>` on `isFetchNextPageError`. New routes go into the axe sweep in `e2e/a11y.spec.ts` (all four themes).
- No layout shift from loading: a fallback takes exactly the space of what replaces it. Lists in cards and modals get a fixed height (`h-…`, not `max-h-…`) and scroll inside (`overflow-y-auto`); skeleton rows match the real rows' size and count.
- Don't swap interactive components between a Suspense fallback and resolved content (state like an open menu is lost); stream a slot *inside* them instead.
- Public, shared data: a `"use cache"` server function with `cacheTag` + `cacheLife`, using `createPublicClient()` (never cookies); invalidate with `updateTag` in the Server Action that changes it. Personal bits render in a small streamed client island.
- Uploads go from the browser straight to Storage (RLS limits paths to `<uid>/…`); a Server Action then verifies the path and records it. Use `@/lib/storage-upload` when the user should see progress. Remove files via the Storage API, never SQL. Images use `next/image` / `getImageProps`, with stored width/height (no layout shift) and a ThumbHash placeholder (`@/lib/thumbhash`).
- Actions that leave a page that no longer makes sense (after create or delete) `redirect()` on the server instead of navigating from the client.
- Muted text (`text-muted-foreground`) must not sit on `bg-muted`: it fails WCAG AA contrast.
- Signed-in-only RPCs: `revoke execute … from anon` explicitly (Supabase grants new functions to `anon` directly). Embedding posts → profiles names the foreign key (`profiles!posts_author_id_fkey`): likes add a second path and plain `profiles(...)` is ambiguous.
- E2E tests create `e2e_` accounts that the global teardown deletes; set up data the test isn't about directly (`e2e/support/follows.ts`, `posts.ts`) instead of through the UI.
- Shared demo account: identity changes go through `ownAccountActionClient`; RLS (`private.is_demo_user()`) blocks them regardless.
- Modals that deserve a URL use parallel + intercepting routes (`(app)/@modal/(.)…`) with a full-page twin; the `@modal` slot keeps `default.tsx`, `page.tsx` and `[...catchAll]/page.tsx` returning null. Modal content fetches in the browser (TanStack cache, `useParams`) so a reopen shows cached data instantly; the full page prefetches on the server.
- Mutations: TanStack `useMutation` around a Server Action via `unwrapActionResult`, optimistic `onMutate` + rollback in `onError`; Server Actions `updateTag` any cached page they affect. When the data lives in several caches (a comment in the thread and on its feed card), update and roll back all of them in the same mutation; optimistic items get a temporary id and `pending: true`.
- Times: `RelativeTime` (date on the server, "5m" after hydration); never read the clock in render or while prerendering (`useNow`).
- Realtime: private channels only (`{ config: { private: true } }`, after `supabase.realtime.setAuth()`), authorized by `private.can_use_channel()` in the `realtime.messages` policies; new topics go through that one function. Database changes reach clients through a trigger's `realtime.send`, not `postgres_changes`.
