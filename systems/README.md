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

Research loop: Serper search → self-hosted page scrape → identity LLM → salary comps → financials + overview.

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

```bash
cd systems && python -m unittest discover -s tests -v
```

## Deploy recipe

Infra is Terraform, under `systems/infra/terraform/`. Each system is an ECS
Fargate service — one shared cluster (`kenoo-systems`), one ECR repo and one
Secrets Manager entry per system. See `systems/infra/terraform/README.md` for
the one-time setup and how to add system #2.

Routine deploys are automatic: push to `main` touching `systems/**` and
[`.github/workflows/deploy-systems.yml`](../.github/workflows/deploy-systems.yml)
builds the image, pushes it to that system's ECR repo, and force-deploys the
ECS service — no Terraform run needed for ordinary code changes.

Worker polls `systems_jobs` where `type = people-enrichment` and `status = pending`.
