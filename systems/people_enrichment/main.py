#!/usr/bin/env python3
"""Poll systems_jobs for people-enrichment work and run profile research."""

from __future__ import annotations

import logging
import time
from typing import Any

import httpx
from shared.jobs import (
    claim_next_job,
    complete_job,
    parse_job_input,
    reclaim_stale_processing_jobs,
)
from shared.logging_setup import configure_logging, log_error
from supabase import create_client

from .enrich import run_people_enrichment
from .settings import JOB_TYPE, load_settings

configure_logging()
logger = logging.getLogger(__name__)


def process_job(
    supabase: Any,
    http: httpx.Client,
    job: dict[str, Any],
    settings: Any,
) -> None:
    job_id = job["id"]
    payload = parse_job_input(job)

    logger.info("Processing job %s", job_id)
    try:
        results = run_people_enrichment(
            http,
            serper_api_key=settings.serper_api_key,
            openai_api_key=settings.openai_api_key,
            payload=payload,
        )
        complete_job(supabase, job_id, success=True, result=results.to_dict())
        logger.info(
            "Job %s completed — identity=%s confidence=%s",
            job_id,
            results.identity,
            results.confidence,
        )
    except Exception as exc:  # noqa: BLE001
        log_error(logger, "Job %s failed — %s", job_id, exc)
        complete_job(supabase, job_id, success=False, error_message=str(exc))


def run_loop() -> None:
    settings = load_settings()
    supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)

    logger.info(
        "People enrichment worker started (job type: %s, poll every %ss)",
        JOB_TYPE,
        settings.poll_interval_seconds,
    )

    with httpx.Client(timeout=120.0) as http:
        while True:
            try:
                reclaim_stale_processing_jobs(supabase, JOB_TYPE)
                job = claim_next_job(supabase, JOB_TYPE)
                if job:
                    process_job(supabase, http, job, settings)
                    continue
                time.sleep(settings.poll_interval_seconds)
            except KeyboardInterrupt:
                logger.info("People enrichment worker shutting down")
                break
            except Exception as exc:  # noqa: BLE001
                log_error(
                    logger,
                    "Unexpected error in worker loop — %s. Retrying.",
                    exc,
                )
                time.sleep(settings.poll_interval_seconds)


if __name__ == "__main__":
    run_loop()
