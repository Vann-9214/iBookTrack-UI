# Standalone portfolio demo

All application data lives in this browser's `localStorage`, under `ibooktrack_demo_state`.
Run `npm ci`, then `npm run dev` from `frontend/`. No environment variables, backend,
database, or API credentials are required. `/` opens the public landing page.
Log in with empty or arbitrary fields to explore as a supervisor. The SSO link is
also a local demo entry; it does not authenticate with an identity provider.

`npm run dev` uses Turbopack for faster development compilation, with its output
in `.next-turbo/`. `npm run dev:webpack` is available as a fallback and uses
`.next-dev/`. Production output stays in `.next/`. This prevents a dev server from replacing a production preview's CSS
and JavaScript. Use the localhost port printed by your terminal. If you change
server modes, stop the previous server with Ctrl+C first.

For the fastest portfolio preview, run `npm run build` once, then `npm start`.
Development servers compile pages as they are visited. Production serves the
already compiled pages, and navigation links prefetch them from the local server.
Excel and barcode printing tools load only when Export or Print is used.

Use **Reset Demo Data** in the account dropdown to restore sample data. Changes
persist per browser and origin; clearing site storage removes them. Separate
browsers do not share data. Password changes are simulated and never store passwords.

Sample lots: `LOT-2026-001` (Mustang), `LOT-2026-002` (Jaguar).
Sample ISBNs: `9780743273565`, `9780132350884`. Seeded boxes cover each station,
including sent boxes for incoming queues and completed scan boxes for storage.
Send marks a station handoff; Receive advances the box. Check Scan Manager simulates
completion locally. Camera scanning requires browser permission and HTTPS or localhost.

The local router returns 404 for unknown routes instead of pretending actions succeeded.
Live updates use browser events. Backend files and credential files are unchanged.
Fonts use local system fallbacks to avoid Google requests; analytics is disabled.

Validation: `npm run test:demo`, `npx tsc --noEmit`, `npm run build`.
The optional `tests/browser-smoke.cjs` and `tests/draft-smoke.cjs` scripts use
an existing Playwright installation (set `PLAYWRIGHT_MODULE` to its module path)
and Microsoft Edge. They check page access, login, mutations, reset and restored
session tabs while rejecting any API or external network requests. No browser
testing package is added to the application dependencies.

Implementation notes for the supplied plan:
- Response shapes follow the current feature types rather than the illustrative router.
- Bulk save, flags, storage, profile changes and transitions persist local mutations.
- Warehouse, Inventory and Endorsement drafts persist before completion, and navigation does not delete sessions.
- Page layouts and workflow guards are retained; supervisor bypasses role restrictions.
