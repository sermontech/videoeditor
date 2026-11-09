# Deploy Clear Take: Vercel + Render + Supabase

## Status and architecture

Deployment code is on **`arena/edccf97e-videoeditor`**, not `main`.

- **Vercel:** builds the React/Vite frontend, including Supabase sign-in.
- **Render Web Service:** authenticated HTTP API; uses the public Supabase key and forwards the caller's verified access token so RLS remains in effect.
- **Render Background Worker:** Node job runner plus Python/Pillow/FFmpeg; uses a privileged Supabase key to claim jobs and write private outputs.
- **Supabase / Seler Ecommerce:** durable state, Auth, private uploads and exports, job leases, feedback and daily usage counters.

Both SQL migrations in `supabase/migrations/` have already been applied to project `krkbcojvfmqrwvudntvq`. **Do not run them again on this project.** They are included for reproducibility on a fresh project.

The repo connection alone does not create or start these services. Render cannot be managed through the available Arena connector, so complete the dashboard steps below. No Render API key is required. Do not paste any secret into chat.

## 1. Render service configuration

Use the repository `sermontech/videoeditor`. Both services must use:

| Setting | Value |
|---|---|
| Branch | `arena/edccf97e-videoeditor` |
| Runtime / language | **Docker** |
| Root directory | **Leave blank** (repository root, not `server`) |
| Dockerfile path | `./Dockerfile` |
| Docker context | Repository root |

The repository includes `render.yaml`, so you can alternatively use **New → Blueprint** and select this branch to create both services. Review the plan prices before accepting: the blueprint proposes **Starter for the API** and **Standard for the worker**. These are paid plan selections, not a claim that free background rendering is available. The worker is given more memory for FFmpeg. No resources or purchases have been made by Arena.

### Web Service: `clear-take-api`

- **Docker command:** `node server/index.mjs`
- **Health check path:** `/healthz`
- **Port:** Render sets `PORT`; the server binds to `0.0.0.0`.
- **Persistent disk:** not needed. State and media live in Supabase.

Environment variables:

| Variable | Value |
|---|---|
| `CREATOR_MODE` | `cloud` |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | `https://krkbcojvfmqrwvudntvq.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | The project's **publishable key**, or legacy **anon** key, from Supabase Settings → API Keys |
| `CREATOR_ALLOWED_ORIGINS` | Your exact frontend origin, e.g. `https://videoeditor-orcin.vercel.app` **if that is still your frontend's assigned domain**. No trailing slash. Multiple explicit origins can be comma-separated. Do not use `*`. |

Do **not** put a service-role key on the API. Hosted startup rejects local mode, incomplete config, insecure origins and known secret/service-role key formats in the API's public-key slot.

Once the service is live, its URL will look like `https://<assigned-service>.onrender.com`. **Copy the actual URL Render gives you**; the example is not an existing backend.

Expected health response:

```json
{"ok":true,"mode":"cloud","service":"clear-take-api"}
```

Health confirms the API process/configuration, not a full database/render check. `/api/state` without a bearer token must return **401**. There is no public `/media` folder in cloud mode.

### Background Worker: `clear-take-worker`

- **Docker command:** `node server/worker.mjs`
- **Health URL:** none; workers do not serve HTTP.
- **Persistent disk:** not needed. Temporary files are deleted after each job.

Environment variables:

| Variable | Value |
|---|---|
| `CREATOR_MODE` | `cloud` |
| `NODE_ENV` | `production` |
| `SUPABASE_URL` | `https://krkbcojvfmqrwvudntvq.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase **secret key** or legacy **service_role** key, entered only in Render's worker environment settings |

The variable name supports either modern secret or legacy service-role credentials. **Never put it in any `VITE_*` variable or in Vercel's frontend configuration.** It is privileged across the shared Seler Ecommerce project; treat the worker as trusted infrastructure for that whole project.

Expected startup log:

```text
Clear Take worker started. Waiting for durable jobs.
```

The Dockerfile installs Node 22, Python, pinned rendering dependencies and DejaVu fonts, then runs as the non-root `node` user. A subprocess init handles child reaping. FFmpeg gets no Supabase keys in its environment. Docker was not available in the Arena environment, so the actual image build still needs validation on Render.

## 2. Vercel frontend configuration

Use the repo root, framework **Vite**, build command `npm run build`, output directory `dist`. Do not deploy the `server` folder as a Python app; `render.py` is a command-line renderer, not a Python web entry point.

Deploy **this branch** for the new cloud code, or merge it through your normal review process before deploying `main`. Do not expose the old local backend while waiting.

Set these **build-time** variables in Vercel:

| Variable | Value |
|---|---|
| `VITE_CREATOR_MODE` | `cloud` |
| `VITE_API_URL` | The actual HTTPS Render API URL, **without trailing slash** |
| `VITE_SUPABASE_URL` | `https://krkbcojvfmqrwvudntvq.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Same publishable/anon key as the API |

Redeploy after changing Vite variables. No runtime environment update can change an already-built frontend bundle. The Vercel build intentionally fails if cloud mode or required settings are missing, or a secret/service-role key is supplied as the public key.

Keep production and preview environment values deliberate. Add only preview origins you actually trust to the API's allowed-origin list and Supabase callback list; do not wildcard every Vercel deployment.

## 3. Supabase Auth callbacks and first member

The project is shared with Seler Ecommerce: **do not replace its Site URL or delete its existing redirect entries**.

In Supabase Authentication → URL Configuration, add the exact Clear Take frontend URL to the allowed redirect URLs. Use the same scheme/host as your Vercel deployment. The app requests this origin for email confirmation and recovery. Email confirmation stays enabled.

Then:

1. Open the frontend and create an account, or sign in with your existing Supabase email/password.
2. Confirm the email if it is a new account. The project's email sending limits/SMTP setup still apply.
3. In the Supabase SQL Editor, enable **only your intended account**. Replace the sample address below with the actual confirmed email. This is an admin operation, not a public endpoint:

```sql
insert into public.clear_take_members (owner_id, enabled)
select id, true from auth.users
where lower(email) = lower('YOUR_CONFIRMED_EMAIL_HERE')
  and email_confirmed_at is not null
on conflict (owner_id) do update set enabled = true
returning owner_id, enabled;
```

If it returns no rows, verify the address and confirmation status. This session has **not** enabled any account or created test Auth users. Existing ecommerce users are not automatically Clear Take members.

To disable access later, set that account's `clear_take_members.enabled` to false. New API/storage requests are denied, but already-issued signed media URLs can remain valid for up to **15 minutes**. Do not share signed URLs as permanent public links.

Password resets change the shared Supabase account password, potentially affecting ecommerce access as well. Use your existing password if you already have an account; don't reset another person's identity.

## 4. Acceptance checks before using private footage

- Logged out → sign-in screen; API requests without a token → 401.
- Signed in, not invited → clear membership-required message, no workspace data.
- Invited user A creates a project and uploads a small test image/audio clip.
- Invited user B cannot read/edit A's project, list A's media, sign A's storage paths or view A's render.
- Render a 3–10 second test. Watch `queued → rendering → complete`; download/play the MP4.
- Restart the worker during a test. Expired leases are reclaimed after roughly two minutes; at most three claim attempts. Validate retry handling before trusting long jobs.
- Review once. A second review must fail without changing brand defaults again.
- Save, sign out, sign back in; projects and preferences remain.
- Test real email confirmation and recovery from the final deployed domain.

Tests executed in Arena:

- 14 unit tests: local rules, hosted-mode refusal, credential separation, ownership/path validation and worker-side revalidation.
- Cloud API/worker integration test with **simulated Supabase endpoints**: rejected missing/forged tokens, uninvited users and unapproved origins; owner-filtered data queries; a real FFmpeg MP4 upload/complete cycle with fenced writes.
- Cloud frontend test with **simulated providers**: sign-in, bearer header, persisted session, sign-out and private UI unmount.
- Existing local end-to-end browser test: CRUD, actual exports in all three formats, images/video/audio, reviews, persistence and mobile overflow.
- Real Supabase catalog checks: membership/usage RLS, function grants, prohibited direct enqueue/review/quota writes. The real claim function was invoked in a rollback-only empty-queue check and returned zero jobs.

**Not yet verified:** real user email/login flows, two-user Supabase isolation end-to-end, actual Docker build, Render service startup, or Vercel-to-Render-to-Supabase rendering. Do not confuse mocked integration results with a completed live deployment.

## Operational boundaries

- Private, invite-only pilot, not an open-registration rendering service. Membership gates exist in both the API and database/storage policies.
- One queued/running render per owner; 20 accepted jobs per UTC day, recorded in a quota ledger that project deletion cannot reset. Worker consumes one job at a time. The API has an additional per-IP request limit.
- Upload: 100 MiB each. Selected media: 500 MiB combined per job. Output: 200 MiB. Rendering timeout: 10 minutes. Limit media to trusted sources; FFmpeg/Pillow are not a full hostile-media sandbox.
- Concurrent workers use `FOR UPDATE SKIP LOCKED`, claim tokens and leases. Progress/completion updates require the current claim token, preventing stale workers from overwriting a reclaimed job.
- Projects can only be deleted when not rendering. Cloud project deletion cascades render history/feedback; stored files are not automatically garbage-collected. Download exports first. Orphaned uploads/exports can accumulate after errors or deletion; plan storage cleanup and cost monitoring.
- API never serves the local shared `.creator` directory. Local files are not automatically migrated or assigned to a cloud account; upload them while signed in.
- External AI writing, online research and generated voice integrations remain out of scope. Uploaded audio and template-based rendering work.
- Keep the project-wide service key limited to the worker. RLS protects ordinary clients, not a compromised service-role process.

## Local developer commands

```sh
npm ci
npm run setup:render
npm test
npm run test:cloud
npx playwright install chromium
npm run test:browser
npm run test:cloud-ui
```

Local development defaults to the original local backend. Cloud/Render/production execution refuses that default. `npm start` dispatches by `CREATOR_MODE`; the Docker image always defaults to cloud mode. `npm run start:worker` requires cloud worker configuration.
