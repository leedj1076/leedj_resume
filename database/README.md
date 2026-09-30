# Ask DJ database

`001_initial.sql` is the versioned starting schema for a **new, empty** Supabase project. Apply it once with an administrator account after reviewing it. The application uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only on the server. Row level security is enabled on all three tables, with no public policies; browser clients should never receive the service-role key.

For an existing project, first inspect the live definitions of `app_settings`, `analytics_events`, and `chat_exchanges`, including columns, types, defaults, identity sequences, indexes, grants, and policies. Compare them against `001_initial.sql` and prepare a separate adoption migration for the differences. Do not run the fresh-install script over existing tables or assume that a matching table name means matching schema. Back up existing data before an adoption migration. This repository does not execute migrations automatically.

`chat_exchanges.id` is an integer identity because review APIs use numeric exchange IDs. `(created_at, id)` gives admin pagination a deterministic order when timestamps tie. The server reads complete exchange sets in 500-row batches before grouping sessions or calculating statistics; its UI response sizes remain 10 sessions and 20 exchanges.
