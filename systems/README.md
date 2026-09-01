# Kenoo systems

Long-running Python workers that sit beside the Next.js apps. They are **not** Turbo/pnpm packages. Next.js talks to them through `systems_jobs` (and later, optional queues).

```
systems/
  shared/                 # env, logging, job claim/complete
  people_enrichment/      # generalized people research pipeline
  tests/
  infra/                  # Dockerfile + local Compose
```

Future workers (email, sync, scrapers) become siblings next to `people_enrichment/`.

## People enrichment

Research loop: Serper search → Firecrawl scrape → identity LLM → salary comps → financials + overview.

Input is a **person subject** (name and/or email, optional location, organization, notes). The worker returns a JSON profile. It does **not** write Kenoo CRM rows.

Platform (`apps/platform`) accepts `POST /api/v1/people-enrichment`, meters credits, inserts a `systems_jobs` row, and returns `{ job_id, status }`. Poll `GET /api/v1/people-enrichment/jobs/:id`.

A single run can take several minutes. Do not run this inside Vercel. AWS Lambda’s 15-minute cap is also tight. Prefer a **container that scales from zero**:

- **AWS:** ECS Fargate + SQS (or EventBridge), desired count `0`, scale on queue depth
- **Local / cheap always-on:** Docker Compose on a laptop or Hetzner VPS

## Local development

From the monorepo root (same `.env.local` as the apps):

```bash
cd systems
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
python -m people_enrichment
```

Or:

```bash
docker compose -f systems/infra/compose.yaml up
```

Required env (root `.env.local`):

- `NEXT_PUBLIC_SUPABASE_URL` or `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `SERPER_API_KEY`
- `FIRECRAWL_API_KEY` (optional; scrapes skip if missing)

```bash
cd systems && python -m unittest discover -s tests -v
```

## Deploy recipe (later)

1. Build `systems/infra/Dockerfile` (context = monorepo root).
2. Push the image to ECR (or any registry).
3. Run as an ECS service with min tasks `0`, or `docker compose` on Hetzner.
4. Worker polls `systems_jobs` where `type = people-enrichment` and `status = pending`.
