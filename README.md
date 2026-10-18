# NAVRATRI

A responsive Gujarati music discovery platform with original folk artwork, a persistent official YouTube video player, authenticated personal libraries, and a daily catalog discovery workflow. The supplied workspace was empty, so there was no existing implementation to update.

## Technologies

React 19, TypeScript, Vite, Lucide, Netlify Functions, Netlify Identity, and Netlify Database with Drizzle ORM. There are no browser database credentials or YouTube keys. This project uses Netlify's managed Postgres rather than Supabase, matching the hosting environment's storage requirement.

## Local development

Install dependencies with `npm install`. Run `netlify dev --port 8889` to serve the frontend with Functions and Identity support. Set `YOUTUBE_API_KEY` in an untracked local `.env` for local discovery. Vite alone serves the interface but cannot emulate the secure API endpoints. Database migrations are applied by Netlify during deployment; do not apply them manually.

## Connect YouTube securely

1. In Google Cloud Console, create/select a project, enable **YouTube Data API v3**, and create an API key. Restrict it to YouTube Data API v3. Browser HTTP-referrer restrictions do not work for this server-only key; configure supported server restrictions as appropriate.
2. Open [this Netlify project's environment settings](https://app.netlify.com/projects/gujarati-music-streaming/configuration/env). Choose **Add a variable**, name it `YOUTUBE_API_KEY`, mark the value secret, and include the **Functions** scope for production and any preview contexts you intend to use.
3. Redeploy after saving. In a Bolt workflow, use the connected Netlify project's environment settings above: this repository contains Netlify Functions, not a Bolt/Supabase backend. Never use a `VITE_` prefix for the key.
4. Sign in as an administrator, open `/admin`, and run **Sync now**. Configuration status only confirms key presence. A successful search and successful synchronization log are needed to verify connectivity.

The key was absent in the execution environment. No successful live YouTube search or playback verification is claimed.

## Authentication and first administrator

Netlify Identity was enabled using the platform activation script. Email confirmation, login, signup, password recovery and invitation acceptance are implemented. End-to-end account delivery still needs verification on the deployed site.

In the Netlify dashboard's **Identity** section, invite the administrator, accept the invitation, open that user's details, and assign the server-controlled `admin` role. There is no default admin account, password, or client-assigned privileged role. `/api/admin` checks the verified Identity user on every request. The public `/admin` shell displays no privileged data without authorization.

## Database and privacy boundaries

`db/schema.ts` defines catalog entries, synchronization history, expiring cache/rate-limit/lock state, and user libraries. The migration is in `netlify/database/migrations/`. Netlify provisions the database on connection and applies the migration at deployment. The migration has been generated, not applied or connection-tested during this run.

RLS is enabled on every table with no public policies. All reads and writes go through server-only Functions using the managed privileged database role. Private library endpoints derive the owner exclusively from the authenticated user; no client owner ID is trusted. Private responses disable caching. Confirm the deployed database role has the expected owner privileges and test cross-account access before public launch.

Private libraries store video ID references rather than copies of YouTube metadata. Fresh, approved catalog entries hydrate these references. Stale or removed entries disappear from hydrated libraries; reference preservation is best-effort when the library is edited afterward. Private playlists are limited to 100, favorites to 500, and recent history to 100. Guests can browse and search; persistence requires sign-in. Queue controls are scoped to the active browser session.

## Discovery and language validation

`GET /api/search?q=...&page=...` validates and bounds input, adds Gujarati music context, requests embeddable music videos through `search.list`, and retrieves source audio-language and embedding metadata through `videos.list`. Only `defaultAudioLanguage=gu` (including regional tags) with music category 10, or explicit administrator approval, enters the public results. A Gujarati title, channel, or search query alone is insufficient. Many legitimate Gujarati videos lack audio-language metadata; these await review instead of being falsely classified. Results are not a complete catalog or a guarantee of licensing.

The backend uses one-hour database caching, per-client search limits, a conservative shared daily source budget, bounded temporary-failure retries, and a quota-error cooldown. Public responses contain only video IDs, titles, channels, thumbnails, publication dates and pagination/review counts. Google does not provide remaining project quota in these responses, so the UI does not invent quota figures. Large-scale traffic requires revisiting the conservative limits with the project's actual allocation.

## Daily automation

`netlify/functions/daily-discovery.mts` declares `0 3 * * *`: **03:00 UTC every day**, on published production deploys only. Change its `config.schedule` to configure the time. No external scheduler is required.

The task uses three bounded discovery queries over the preceding seven days, a database lease to avoid overlapping runs, primary-key upserts to prevent duplicates, bulk inserts, Gujarati-language validation and a moderation queue. Transient YouTube failures receive one bounded retry; failures and successful completion timestamps are recorded. New eligible entries automatically appear in Latest. Runs count refreshed/processed entries, not newly inserted-only statistics. No media is downloaded or copied.

API metadata older than 28 days is removed during scheduled cleanup and excluded from public catalog and library reads. Expired cache records are also removed. Run cleanup even if the API key is missing; failed runs record the configuration error. Verify retention execution operationally; a failed or disabled scheduler cannot guarantee physical deletion. Existing catalog records are refreshed only when rediscovered; other stale entries expire.

**Deployment and activation verification:** publish a production deploy, check that `daily-discovery` appears under Netlify **Functions**, invoke it using Netlify's scheduled-function **Run now** action, and check its logs plus the successful timestamp in `/admin`. The admin **Sync now** action exercises the shared synchronization logic but alone does not verify the deployed scheduler. No scheduled execution was tested in this run; automation must not be described as active yet.

## Official playback

Selecting a verified result passes its actual video ID to the official YouTube IFrame Player API. The visible video keeps YouTube branding, ads and controls. The site supports play/pause, previous/next, seeking, volume, queue, shuffle and repeat. Minimizing pauses the video, and switching away from the tab pauses playback. Browser Media Session controls publish the current title, channel, artwork, playback state and seek position where supported. Play/pause, previous/next and seek actions use the existing official player and queue. Unsupported actions are skipped and handlers are cleaned up when the track changes. YouTube playback remains paused while the document is hidden, including screen lock; media controls cannot bypass this restriction. Operating systems and browsers decide whether to expose lock-screen controls for an embedded player, so availability is not guaranteed. Official player errors cover embedding and availability restrictions. Blocked autoplay displays a prompt to tap Play in the embed. No audio extraction, download, offline play or hidden background stream is implemented. YouTube playback is not lossless.

A licensed lossless provider is **not configured**. Lossless streaming, commercial catalog ingestion, DRM, rights verification and FLAC/ALAC transport require a separately authorized provider and implementation. The interface states that lossless is unavailable.

## Deployment, SEO, and remaining scope

`netlify.toml` supplies the Vite build command, output directory, SPA navigation fallback, Functions directory and security headers. The host build pipeline performs build validation and deployment; no local build/dev/test process was run during this editing session. No live deployment URL was verified. The intended hostname is `https://gujarati-music-streaming.netlify.app`.

The application includes page titles, sharing metadata, favicon, sitemap, robots rules, canonical links, responsive layouts, keyboard-accessible controls, modal focus trapping, and reduced-motion support. For a custom domain, add it under Netlify **Domain management**, configure the indicated DNS, then update canonical and sitemap origins. Unknown routes render a custom page; the SPA fallback returns HTTP 200, so a true server HTTP 404 and prerendered per-route SEO are future improvements.

The current admin scope covers catalog statistics, API-key presence, synchronization history, manual sync, and language review/removal. General site settings, configurable featured content, admin-managed categories/playlists and licensed-source provisioning are not implemented. Albums are editorial discovery collections rather than a verified album database. Artist cards are clearly labeled curated searches; their artwork is original monograms, not artist photographs. Trending is a discovery section, not a fabricated popularity ranking. The contact page describes the missing public support address rather than presenting a non-delivering form.

## Verification checklist after deployment

Verify all navigation and layouts on phone/tablet/desktop; search in English transliteration and Gujarati; exercise missing-key, invalid-input, quota/error and empty-result states; verify correct video IDs, embedding errors, seek/volume and queue transitions; create two accounts and verify library isolation, favorites and playlist persistence; verify non-admin requests receive 403; approve a reviewed Gujarati candidate; run sync twice and confirm unique video IDs; verify the deployed scheduler separately and confirm expired-data cleanup. Database permissions, Identity email delivery, live YouTube behavior and production deployment remain external verification requirements.

## Playback verification for this update

After deployment, start an approved video using the visible embed and check media controls in a supported desktop browser. Verify title/artwork, pause/resume, seeking, previous/next, queue repeat/shuffle, track changes and navigation without recreating the player. Minimize the player, switch tabs and lock a mobile device: YouTube must pause and must not restart from a hidden-page media action. Return to the page and resume explicitly. Check denied autoplay and unavailable videos. Repeat on iOS Safari and Android Chrome; lock-screen controls and iframe playback support vary by browser. These device checks were not performed in this editing environment. The deployment pipeline handles build validation.
