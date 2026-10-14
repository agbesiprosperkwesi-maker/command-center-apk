# TEAM APK Command Centre — go-live checklist

This package updates the Next.js application, not the separate browser-only HTML preview. The live app uses Supabase for shared records.

## 1. Apply the database update

1. Open the Supabase project used by `https://team-apk-command-center.vercel.app`.
2. Open **SQL Editor** and create a new query.
3. Open `supabase/feature-migration.sql` from this project, copy the entire file into SQL Editor, and run it once.
4. Confirm the result says success. Do not disable row-level security and do not put a service-role key in Vercel's `NEXT_PUBLIC_` variables.

This migration adds shared daily tasks, student call history and outreach fields, team members, transport requests, and incident records. It keeps records blank; import only authorised student records.

## 2. Publish the updated code

The GitHub integration available to this session could not see the configured repository (repository search returned no connected repositories and file requests returned 404). Therefore, no live deployment has been made from this session.

Use the existing repository connected to Vercel:

- Replace/update the project files with the contents of this package, keeping the folder structure.
- Commit and push to the deployment branch (normally `main`).
- Wait for Vercel's deployment to finish; open the deployment log and ensure the build succeeds.
- Keep the existing environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set to the correct Supabase project.

Do not upload `.env` files or any service-role/secret key.

## 3. Verify live behaviour

Sign in as an authorised admin and check:

- Dashboard election countdown and reminders.
- Daily checklist loads and saves shared completion/assignment state.
- Funding, expenses, tasks, and station readiness save and reload.
- Student CSV import, add/edit outreach, faculty, department, potential voter group, campus presence, hostel visit status/date, eligibility verification, and exports.
- Call tracker saves call outcomes, caller, last-called time, follow-up date and call history.
- Team, transport, incident registers and CSV exports.
- A second authorised account sees the same records, according to its role permissions.

## 4. Notifications limitation

The app shows live in-app reminders and can request browser notifications while the site is open. True push notifications while the browser is closed need a push provider/service-worker setup and credentials; do not describe those as enabled until configured and tested.

## 5. Countdown

The dashboard counts down to 24 October 2026 using the viewer's local device time. Verify it on the deployed HTTPS site.
