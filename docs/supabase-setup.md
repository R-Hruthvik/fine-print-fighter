# Supabase account and case storage

The app keeps guest analysis available without an account. Saved-case routes and authentication need a Supabase project.

1. Create a Supabase project and configure email/password sign-in with email verification enabled.
2. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from the project API settings. Set `SUPABASE_SERVICE_ROLE_KEY` only on the server; it is used for account deletion.
3. Apply the migrations in timestamp order using the Supabase CLI. If a project already has the earlier `202610240001_cases.sql` schema, `202610250001_private_cases.sql` upgrades its profile and case columns in place, converts saved documents to the current format, and keeps existing account and case rows. For a manual SQL Editor setup, run the committed `202610250001_private_cases.sql` migration after the earlier schema if it is already present.
4. Add the site origin to Supabase Auth's allowed redirect URLs. Password reset returns to `/reset-password`; sign-up verification returns to `/profile`.

The cases table stores the selected company, complaint pack, jurisdiction, original document text, analysis result, draft letter, owner ID, and timestamps. Row Level Security policies restrict reads and writes to the authenticated owner. API handlers also resolve the owner from the session and never accept an owner ID from the browser.

If the project or migration is not configured, account screens explain that storage is unavailable and the guest analysis route remains usable. The service role key must never use a `NEXT_PUBLIC_` variable.
