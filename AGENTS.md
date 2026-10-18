# NAVRATRI architecture

This workspace started empty. The basic template download failed, so the app uses a small React/Vite setup instead of TanStack Start. Do not replace it with another starter. Preserve the charcoal/saffron interface, custom local SVG folk artwork, and persistent player.

- `src/main.tsx`: page navigation, discovery UI, account modals, library state and official YouTube IFrame integration. Route changes keep the root App and player mounted. History API navigation is backed by the Netlify SPA rewrite.
- `src/styles.css`: responsive design tokens, component styles, accessibility and reduced-motion handling. Fonts are DM Sans, Manrope and Noto Sans Gujarati.
- `public/art/`: original vector collection artwork and Garba hero; these are editorial collections, not actual album covers.
- `netlify/functions/*.mts`: modern Web Request/Response endpoints plus daily scheduled discovery. Use `Netlify.env.get` for secrets.
- `netlify/lib/youtube.ts`: validated YouTube Data API calls, persistent rate limiting/cache, error redaction, Gujarati-language checks.
- `netlify/lib/sync.ts`: database lease, bulk upserts, metadata retention, shared manual/scheduled workflow, status logs.
- `db/schema.ts`: source of truth for managed Netlify Postgres. `db/index.ts` exposes a lazy Drizzle client. Use `drizzle-orm@beta` and `drizzle-kit@beta` for the native adapter.
- `netlify/database/migrations/`: generated migrations. Never apply them manually; the hosting platform handles this during deployment.

No secrets belong in client code, logs, responses or committed environment files. The YouTube key is server-only `YOUTUBE_API_KEY`. Do not infer language from titles alone: require source `defaultAudioLanguage` Gujarati or authenticated administrator review. Do not add scraping, audio extraction, downloads, fake song IDs, fabricated popularity numbers or claims that YouTube is lossless.

Use `@netlify/identity` for accounts. `user.roles` contains server-controlled roles. Admin authorization happens on every server request; never trust browser metadata. All tables have RLS enabled with no public policies. The managed server database role owns access; every private library read/write is additionally scoped by the verified user ID. Libraries persist video references, not API metadata; hydrate only fresh approved catalog entries. Do not introduce another database or local JSON persistence.

The scheduled function runs at 03:00 UTC only on published production deploys. A configured cron is not evidence of successful scheduled execution. Keep missing-configuration and unverified-deployment reporting honest. See README for deployment verification and known limitations.

This environment delegates build and runtime validation to its deployment pipeline. Do not run local build, development, or test servers when platform instructions prohibit them. Generating migration files is permitted. Do not create commits or inspect the `.git` directory.
