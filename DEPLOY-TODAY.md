# TEAM APK Command Centre — go-live checklist

This package updates the Next.js application, not the separate browser-only HTML preview. The live app uses Supabase for shared records.

## 1. Apply the database update

1. Open the Supabase project used by the Vercel app.
2. Open **SQL Editor** and create a new query.
3. Open `supabase/feature-migration.sql` from this project, copy the entire file into SQL Editor, and run it once.
4. Confirm the result says success. Do not disable row-level security and do not put a service-role key in Vercel's `NEXT_PUBLIC_` variables.
5. If you still see `Could not find the table 'public.daily_tasks'` in the schema cache, re-run the migration and confirm `public.daily_tasks`, `public.students`, `public.call_logs`, `public.team_members`, `public.transport_requests`, and `public.incidents` exist in the database explorer.

This migration adds shared daily tasks, student call history and outreach fields, team members, transport requests, and incident records. It keeps records blank; import only authorised student records.

## 2. Required Vercel environment variables

Add these in the Vercel project dashboard under Project > Settings > Environment Variables:

- `NEXT_PUBLIC_SUPABASE_URL` = your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` = anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` = service-role key only for server-side/admin operations; never expose in browser code
- `TWILIO_ACCOUNT_SID` = Twilio account ID (optional, only if SMS is enabled)
- `TWILIO_AUTH_TOKEN` = Twilio auth token (optional, only if SMS is enabled)
- `TWILIO_FROM_NUMBER` = Twilio sending number, e.g. `+1234567890` (optional, only if SMS is enabled)
- `TELEGRAM_BOT_TOKEN` = Telegram bot token from BotFather (optional, free alerts)
- `TELEGRAM_CHAT_ID` = Telegram target chat ID (group or user chat ID; optional, free alerts)

A matching example file is available in `.env.example`.

## 3. Publish the updated code

Use the existing repository connected to Vercel:

- Replace/update the project files with the contents of this package, keeping the folder structure.
- Commit and push to the deployment branch (normally `main`).
- Wait for Vercel's deployment to finish; open the deployment log and ensure the build succeeds.
- Confirm all required environment variables exist in Vercel.
- Keep the existing environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set to the correct Supabase project.

Do not upload `.env` files or any service-role/secret key to GitHub.

## 4. Verify live behaviour

Sign in as an authorised admin and check:

- Dashboard election countdown and reminders.
- Daily checklist loads and saves shared completion/assignment state.
- Funding, expenses, tasks, and station readiness save and reload.
- Student CSV import, add/edit outreach, faculty, department, potential voter group, campus presence, hostel visit status/date, eligibility verification, and exports.
- Call tracker saves call outcomes, caller, last-called time, follow-up date and call history.
- Team, transport, incident registers and CSV exports.
- A second authorised account sees the same records, according to its role permissions.

## 5. Notifications

The app supports:

- Browser notifications while the page is open and permission is granted
- Telegram bot notifications when `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are added to Vercel
- Twilio SMS when `TWILIO_*` values are added to Vercel

Use Telegram for free alert delivery and Twilio only when you need paid SMS delivery.

## 6. Countdown

The dashboard counts down to 24 October 2026 using the viewer's local device time. Verify it on the deployed HTTPS site.
