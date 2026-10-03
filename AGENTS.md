<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Konnect project conventions

- The roadmap, architecture and decisions live in `docs/PLAN.md`; follow its phase order and §5 conventions.
- Package manager: pnpm. Before committing run `pnpm check` (typecheck, lint, format, unit tests).
- Server Components by default; add `"use client"` only on small interactive leaves.
- Environment variables are read only through `@/lib/env`, never `process.env` directly in app code.
- Feature code lives in `src/features/<feature>/`; shared primitives in `src/components/` and `src/lib/`.
- shadcn components use **Base UI**: compose with the `render` prop (not Radix's `asChild`). Base UI's own docs ship in `node_modules/@base-ui/react/docs/`.
- Props passed from Server to Client Components must be serializable: pass rendered elements (`icon={<Icon />}`), never component functions.
- With Cache Components, anything reading request/URL data (`params`, `cookies()`, `usePathname()` under a dynamic route) belongs inside `<Suspense>` so the static shell can prerender.
