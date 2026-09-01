from __future__ import annotations

import json
import logging
from datetime import UTC, datetime, timedelta
from typing import Any

logger = logging.getLogger(__name__)

JOBS_TABLE = "systems_jobs"
DEFAULT_JOB_STALE_SECONDS = 30 * 60


def utc_now_iso() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def reclaim_stale_processing_jobs(
    supabase: Any,
    job_type: str,
    *,
    stale_after_seconds: float = DEFAULT_JOB_STALE_SECONDS,
) -> int:
    cutoff = (datetime.now(UTC) - timedelta(seconds=stale_after_seconds)).isoformat().replace(
        "+00:00", "Z"
    )
    reset = {"status": "pending", "started_at": None}

    stale = (
        supabase.table(JOBS_TABLE)
        .update(reset)
        .eq("type", job_type)
        .eq("status", "processing")
        .lte("started_at", cutoff)
        .execute()
    )
    missing_started_at = (
        supabase.table(JOBS_TABLE)
        .update(reset)
        .eq("type", job_type)
        .eq("status", "processing")
        .is_("started_at", "null")
        .execute()
    )
    reclaimed = len(stale.data or []) + len(missing_started_at.data or [])
    if reclaimed:
        logger.warning(
            "Reclaimed %s orphaned %s job(s) stuck in processing "
            "(stale > %ss or missing started_at)",
            reclaimed,
            job_type,
            stale_after_seconds,
        )
    return reclaimed


def claim_next_job(supabase: Any, job_type: str) -> dict[str, Any] | None:
    pending = (
        supabase.table(JOBS_TABLE)
        .select("id, input, created_at")
        .eq("status", "pending")
        .eq("type", job_type)
        .order("created_at")
        .limit(1)
        .execute()
    )
    rows = pending.data or []
    if not rows:
        return None

    job = rows[0]
    job_id = job["id"]
    claimed = (
        supabase.table(JOBS_TABLE)
        .update({"status": "processing", "started_at": utc_now_iso()})
        .eq("id", job_id)
        .eq("status", "pending")
        .execute()
    )
    if not claimed.data:
        return None

    full = supabase.table(JOBS_TABLE).select("*").eq("id", job_id).single().execute()
    return full.data if full.data else job


def complete_job(
    supabase: Any,
    job_id: str,
    *,
    success: bool,
    result: dict[str, Any] | None = None,
    error_message: str | None = None,
) -> None:
    update: dict[str, Any] = {
        "status": "completed" if success else "failed",
        "completed_at": utc_now_iso(),
        "updated_at": utc_now_iso(),
    }
    if error_message:
        update["error"] = error_message
    if result is not None:
        update["result"] = result

    supabase.table(JOBS_TABLE).update(update).eq("id", job_id).execute()


def parse_job_input(job: dict[str, Any]) -> dict[str, Any] | None:
    payload = job.get("input")
    if payload is None:
        payload = job.get("payload")
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except json.JSONDecodeError:
            return None
    if payload is not None and not isinstance(payload, dict):
        return None
    return payload
