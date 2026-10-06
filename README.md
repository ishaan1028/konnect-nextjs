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

Local database (needs Docker):

| Script                | What it does                                                          |
| --------------------- | --------------------------------------------------------------------- |
| `pnpm db:start`       | Start local Supabase                                                  |
| `pnpm db:reset`       | Recreate the database from migrations and seed it, photos included    |
| `pnpm db:seed-photos` | (Re)create the showcase accounts' posts and photos (idempotent)       |
| `pnpm db:test`        | Database tests (pgTAP)                                                |
| `pnpm test:e2e`       | End-to-end tests (Playwright); removes the accounts they create after |

The demo account is `demo@konnect.dev`. Five showcase accounts (`maya.k`, `arjun.codes`,
`zoe.travels`, `leo.bakes`, `sana.draws`; password `konnect-seed-2026`, local only) come
with posts, likes and follows.

## Photo credits

The seed photos in `supabase/seed/photos/` are from [Unsplash](https://unsplash.com) (via
[Lorem Picsum](https://picsum.photos)) under the free
[Unsplash License](https://unsplash.com/license), cropped and re-encoded by
`scripts/prepare-seed-photos.mjs`. Thanks to the photographers:

| Photo                                                  | Photographer        |
| ------------------------------------------------------ | ------------------- |
| [film-camera](https://unsplash.com/photos/baRYCsjO6z4) | Jennifer Trovato    |
| [city-street](https://unsplash.com/photos/SyBYM8R6VU4) | Nicholas Swanson    |
| [quiet-alley](https://unsplash.com/photos/bIQiMWxX_WU) | sergee bee          |
| [sea-sunset](https://unsplash.com/photos/Bm0Ja6LZWl4)  | Jenna Beekhuis      |
| [santorini](https://unsplash.com/photos/Qo51KwK1dKg)   | Margaret Barley     |
| [fjord](https://unsplash.com/photos/-oWyJoSqBRM)       | Alexey Topolyanskiy |
| [cookies](https://unsplash.com/photos/eqsEZNCm4-c)     | Olenka Kotyk        |
| [pour-over](https://unsplash.com/photos/TYIzeCiZ_60)   | Karl Fredrickson    |
| [cappuccino](https://unsplash.com/photos/UWRqlJcDCXA)  | Carli Jean          |
| [sketchbook](https://unsplash.com/photos/nJdwUHmaY8A)  | Aleks Dorohovich    |
| [coffee-red](https://unsplash.com/photos/ZJsseAxEcqM)  | Justin Leibow       |
| [design-desk](https://unsplash.com/photos/9SyOKYrq-rE) | Jeff Sheldon        |
| [laptop-desk](https://unsplash.com/photos/yC-Yzbqy7PY) | Alejandro Escamilla |
| [window-desk](https://unsplash.com/photos/mCg0ZgD7BgU) | Aleksi Tappura      |

## Troubleshooting

- **A link does a full page reload, or a modal opens as a full page.** Restart `pnpm dev`
  after adding a parallel route slot (a folder like `@modal`). A dev server started
  before the slot existed doesn't know about it, so its route tree disagrees with the
  browser's and Next.js falls back to a hard navigation to recover.
