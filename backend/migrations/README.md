# Supabase migrations

Apply `001_initial_schema.sql` once in the Supabase SQL editor or through the
project's migration runner. It creates the workspace data model, onboarding
trigger, indexes, and deny-by-default RLS policies.

For production, configure the backend separately:

```env
DATABASE_PROVIDER=supabase
DATABASE_URL=postgresql+asyncpg://postgres:<password>@<host>:5432/postgres
SUPABASE_URL=https://<project-id>.supabase.co
SUPABASE_ANON_KEY=<anon-key>
```

The database URL and any service credential must stay backend-only. The React
app uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Auth.
