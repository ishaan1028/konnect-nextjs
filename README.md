# Konnect

A social media app (photo posts, follows, likes, comments and real-time chat) built with
**Next.js 16** (App Router, Cache Components, React Compiler) and **Supabase**.

It's a ground-up rebuild of an older Express/MongoDB/Socket.io + CRA project. See
[`docs/PLAN.md`](docs/PLAN.md) for the architecture, decisions and roadmap.

## Getting started

Requirements: Node 22 (`nvm use`), pnpm, Docker (for local Supabase, from Phase 3).

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

## Scripts

| Script           | What it does                                      |
| ---------------- | ------------------------------------------------- |
| `pnpm dev`       | Start the dev server (Turbopack)                  |
| `pnpm build`     | Production build                                  |
| `pnpm typecheck` | Generate route types, then run `tsc`              |
| `pnpm lint`      | ESLint (zero warnings allowed)                    |
| `pnpm format`    | Format everything with Prettier                   |
| `pnpm test`      | Unit tests (Vitest)                               |
| `pnpm check`     | Typecheck, lint, format check and tests in one go |
