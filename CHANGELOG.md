# Changelog

Notable changes in this repository relative to the upstream project it was forked
from ([manucoffin/faster-fixes](https://github.com/manucoffin/faster-fixes)).
The goal of the fork: run the whole product on your own infrastructure with no
third-party accounts, and make it useful for teams whose testers are their own
logged-in users.

## Self-hosting

- **Runs on Postgres + SMTP + a folder.** Dockerfile and `docker-compose.yml`
  (web, Postgres, Mailpit for local mail). Migrations run on container start.
- **Database:** standard `pg` adapter everywhere (upstream selected a Neon-only
  serverless driver whenever `NODE_ENV=production`).
- **Email:** SMTP mailer (nodemailer) next to Resend and Plunk; `MAIL_PROVIDER`
  selects, inferred from credentials when unset. `MAIL_FROM` sets the sender.
- **File storage:** provider-agnostic. `filesystem` (default, mount
  `STORAGE_DIR`), `database` (bytes in Postgres), or `s3`/`aws`/`r2` with split
  server-side and public endpoints so MinIO behind Docker works. Files the app
  stores itself are served by `/api/assets` with HMAC-signed, expiring URLs for
  screenshots.
- **Background jobs:** pg-boss in the same Postgres, in-process worker started
  from `instrumentation.ts`. Inngest removed. Same job handlers, typed events,
  per-key concurrency, cron.
- **Build without integrations:** encryption keys, GitHub App credentials and
  the Stripe webhook check resolve on first use, so `next build` succeeds with
  nothing configured. Stripe only runs when `NEXT_PUBLIC_IS_CLOUD=true`.
- **No phone-home:** the hard-coded third-party analytics script is gone.
  Vercel Analytics loads only in cloud mode; your own Umami via
  `NEXT_PUBLIC_UMAMI_SCRIPT_URL` / `NEXT_PUBLIC_UMAMI_WEBSITE_ID`.
- **GitHub App slug** read at runtime (`GITHUB_APP_NAME`); docs for creating
  the App. Docs pages are reachable on self-hosted instances.

## Widget

- **Screenshots show what the reviewer sees**: the visible viewport at the
  current scroll position (upstream always captured the top of the page).
- **The selection is burned into the screenshot**: dimmed page, outlined
  element, pin at the click point — visible in the inbox, in tracker issues,
  in Slack and to MCP agents.
- **Signed-in reviewers**: `identity` prop on `FeedbackProvider` +
  `signIdentity()` helper in `@fasterfixes/core`. Host apps sign their own
  logged-in users with a per-project secret; no share link needed. Reviewers
  are keyed per project by external id and attributed by name.
- **Quiet by default**: markers are hidden until the reviewer switches them on.
  Identity reviewers see and edit only their own feedback; admins see and edit
  everything; share-link reviewers keep the collaborative whole-project view.
  Edit/delete now enforce ownership.

## Dashboard

- **Organisation overview** (`/overview`, post-login landing): every project
  with status counts, latest reports, reviewers, linked integrations, totals.
- **Project Settings › Signed-in reviewers**: enable/rotate/disable the
  identity secret with server and client snippets.
- **Reviewers** page shows access type (share link / signed in), role, email or
  external id, last seen.
- **Integrations › Connect a coding agent**: copyable `.mcp.json` prefilled with
  the instance URL and the three setup rules.
- Sidebar: Organization › Overview, Create project next to the project links.

## Packages

- `@fasterfixes/core` 0.0.8: `identify()` on the client, `signIdentity()`.
- `@fasterfixes/react` 0.0.11: `identity` prop, viewport capture, annotation.
- These are not published to npm from this repository; see "Consuming the
  widget from this repository" in the self-hosting docs.
