# Local Postgres telemetry

The local Hugging Face proxy records each Viber chat request in the `hf_requests` table. It never stores the Hugging Face token.

## Setup

Create a local database and initialize the table:

```bash
createdb scratch_viber
npm run db:init
```

The default connection is:

```text
postgres://localhost:5432/scratch_viber
```

Override it in `.env` with `DATABASE_URL` when needed. Then run the app normally:

```bash
npm start
```

If Postgres is unavailable, the proxy still serves requests and prints a warning; telemetry is simply skipped until the proxy is restarted.

## Captured data

Each row includes the prompt, a stable `experiment_id`, request messages, response, model, difficulty, provider (when returned), HTTP status, success/error status, total latency, provider latency, token usage, request parameters, and the raw JSON response. Semantically equivalent prompt variants share one experiment ID so they can be aggregated during analysis.

Each row is one experiment. After inserting and trying a generated result, use
the small Feedback button in the editor to add functional correctness, intent
alignment, outcome, and notes to that same row.

Useful queries:

```sql
SELECT model, COUNT(*), AVG(latency_ms), AVG(total_tokens)
FROM hf_requests
WHERE status = 'success'
GROUP BY model
ORDER BY COUNT(*) DESC;

SELECT created_at, model, prompt, error
FROM hf_requests
WHERE status = 'error'
ORDER BY created_at DESC;
```
