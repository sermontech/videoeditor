# Clear Take Supabase foundation

> **Runtime update:** migration `202611090002_cloud_runtime.sql` has also been applied. It adds invite-only membership, a durable usage ledger, job leases, atomic enqueue/review RPCs and removes direct client job/review inserts. Cloud API, frontend sessions and worker code are now implemented; hosted deployment and real-account integration tests are pending. See [deployment guide](../docs/RENDER_DEPLOYMENT.md). The notes below record the earlier foundation stage; its "not yet connected" section is historical, not the current code state.

## Applied remotely

On 9 November 2026, the user explicitly selected the existing **Seler Ecommerce** project, reference `krkbcojvfmqrwvudntvq`, region `eu-west-1`, for Clear Take.

`migrations/202611090001_clear_take_foundation.sql` records the additive schema applied through the authenticated Supabase connector as migration `clear_take_foundation`. The remote tool reported success; a follow-up catalog query independently verified the objects and privileges. Do not reapply this file to that project: it deliberately fails on name collisions instead of silently adopting existing resources.

### Created resources

| Resource | Purpose | Client access |
|---|---|---|
| `public.clear_take_profiles` | Owner-specific brand preferences | Owner CRUD |
| `public.clear_take_projects` | Script, scenes, sources, format and review status | Owner CRUD |
| `public.clear_take_assets` | Metadata and paths for uploaded media | Owner CRUD |
| `public.clear_take_generations` | Durable render request queue and results | Owner read; insert only request/identity columns |
| `public.clear_take_feedback` | One review per completed generation | Owner read/insert |
| `clear-take-media` bucket | Private image/video/audio uploads | Owner read/write under `<auth-user-id>/...` |
| `clear-take-exports` bucket | Private MP4 outputs | Owner read; trusted worker writes |

Upload limit: 100 MiB per media file. Export limit: 200 MiB per MP4. Bucket MIME allowlists supplement, but do not replace, safe media parsing and worker-side validation.

All five tables have row-level security enabled. No anonymous table access is granted. Composite foreign keys bind each generation to a project with the same owner, and each feedback record to a generation with the same owner. Clients cannot assign or modify job status/progress/output paths. Feedback insertion requires a completed generation.

Thirteen policies were created: seven table policies, two permissive owner-specific storage policies, and four restrictive storage boundaries. The restrictive policies only constrain the two Clear Take buckets; other buckets pass their boundary predicates unchanged. They guard against a future broadly permissive storage policy accidentally exposing Clear Take media. The service role bypasses RLS; never expose service-role credentials in browser builds.

### Shared-project implications

- Both apps share one Supabase Auth user pool, quotas and infrastructure. This is data separation, **not** independent identity infrastructure or infrastructure-level isolation.
- Existing Supabase users can use the same identity to create their own Clear Take data. No invitation-only membership model has been configured.
- Project-wide service-role credentials have privileges outside Clear Take. Any future worker using them must be trusted for the whole shared project, or be redesigned to use scoped access.
- Shared email templates, SMTP, signup rules, JWT settings, Auth site URL and redirect allowlist were **not changed**.
- Existing email auth is enabled and email confirmation is required. At inspection, the shared site URL was `http://localhost:3000` and the redirect allowlist was empty. Confirm the final frontend domain before adding explicit Clear Take callback URLs. Do not replace ecommerce redirects or weaken confirmation to work around login problems.
- No user records, ecommerce tables, API keys or secret values were created, retrieved, copied or modified. Before applying this migration, metadata inspection showed no tables in `public`, no storage buckets and no public/storage policies.

## Verification performed

The connector's follow-up query returned:

- Five `clear_take_*` tables, each with `relrowsecurity = true`.
- Anonymous SELECT privileges: false for each table.
- Authenticated SELECT privileges: true, subject to owner policies.
- Both storage buckets: `public = false`.
- Thirteen `clear_take_*` policies.
- Authenticated INSERT/UPDATE privilege on generation `status`: false.
- Authenticated INSERT privilege on generation `request`: true.

This verifies the schema and privileges, **not an end-to-end login, cross-user upload/download or render test**. Those must be exercised with controlled test users when app integration is implemented. No fake Auth accounts or production test media were inserted.

## Not yet connected or deployed

The current React/Express app **still uses its local JSON/file backend**. Applying this migration does not add a login screen, protect the existing API, switch its storage, or start a render worker. It must not be represented as an authenticated cloud application yet. Existing local project/media data has not been automatically copied into Supabase or assigned to an owner.

Remaining work before full Vercel deployment:

1. Add Supabase session management and explicit email-confirmation/recovery flows in the app.
2. Verify access tokens server-side on every protected operation, and use owner-bound queries rather than trusting client owner IDs.
3. Replace local state/storage with the new tables and private buckets; use signed URLs only for authorized users, with short expirations. Keep secrets out of `VITE_*` variables.
4. Add atomic job claiming, leases/retries, per-user quotas, validated render snapshots and a persistent Python/FFmpeg worker. Recheck asset ownership before downloads; do not trust paths embedded in user-supplied JSON.
5. Make feedback updates and brand-default changes atomic rather than letting duplicate reviews adjust preferences twice.
6. Add deployment-specific authentication redirects without disturbing the shared project's existing settings.
7. Run real two-user isolation tests, password-reset/email-confirmation checks, upload/download checks, and authenticated end-to-end renders.
8. Deploy the frontend to Vercel and the worker/API to a persistent host. Supabase database/Auth/storage do not run the existing Python FFmpeg process.

## Local safeguards

The migration is source-controlled; private media remains Git-ignored. `.env` and `.env.*` are ignored, except explicitly sanitized `.env.example` files. No keys are needed in this migration. Future configuration belongs in platform environment settings, not source files or chat.
