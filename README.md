# TEAM APK Election Command Centre

Next.js 15 + Supabase shared operations MVP for the KTU SRC election on 24 October 2026.

## Modules
- Dashboard with election countdown, reminders and key metrics
- Shared daily checklist
- Funding and sponsors; expenses and budget
- Tasks and meetings
- Student register with faculty, department, potential voter category, campus presence, hostel visit tracking and eligibility verification
- Call tracker with assigned caller, outcomes, last call and follow-up date/history
- Team and volunteers
- Six polling stations and readiness checklists
- Transport and logistics
- Election-day incidents
- CSV reports and exports

## Setup
1. Install dependencies with `npm install`.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from your Supabase project.
3. Run `supabase/schema.sql` only if the base schema has not already been created.
4. Run `supabase/feature-migration.sql` in Supabase SQL Editor.
5. Run `npm run dev` locally or deploy to Vercel.

See `DEPLOY-TODAY.md` for the live deployment checklist and notification limitations.

**Privacy:** student records should only be imported from an authorised source and remain restricted to authorised roles. A student's level/category is not official eligibility confirmation. Never put the Supabase service-role key in browser code or a `NEXT_PUBLIC_` environment variable.
