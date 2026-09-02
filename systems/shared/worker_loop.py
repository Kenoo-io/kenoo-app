from __future__ import annotations

import logging
import signal
import time
from typing import Any, Callable

from .jobs import claim_next_job, reclaim_stale_processing_jobs
from .logging_setup import log_error
from .queue import delete_message, get_sqs_client, wait_for_wake_signal

_shutdown_requested = False


def _handle_sigterm(signum: int, frame: Any) -> None:
    # ECS sends SIGTERM (not SIGINT) when scaling a service down. Setting a
    # flag instead of exiting here lets the loop finish whatever job it's
    # mid-way through and only stop between iterations.
    global _shutdown_requested
    _shutdown_requested = True


signal.signal(signal.SIGTERM, _handle_sigterm)


def run_polling_worker_loop(
    *,
    job_type: str,
    supabase: Any,
    process_job: Callable[[dict[str, Any]], None],
    poll_interval_seconds: float,
    sqs_queue_url: str | None,
    logger: logging.Logger,
) -> None:
    """Scale-to-zero-friendly claim/process loop, shared by every systems/ worker.

    Jobs are claimed from Supabase's systems_jobs table exactly as before —
    that table stays the source of truth for actual work. `sqs_queue_url` is
    optional and only changes how the loop waits when there's nothing to do:

    - Without it: a fixed time.sleep(poll_interval_seconds), same as always.
    - With it: a long-poll receive on that queue instead, and the received
      message is held open (received, not deleted) until the DB backlog is
      confirmed drained. That's deliberate: Application Auto Scaling watches
      this queue's (visible + in-flight) message count to decide when it's
      safe to scale desired_count to 0, so deleting the message on receipt —
      before the job it announced is actually finished — would let that
      count hit zero while a job might still be running. See queue.py.

    `process_job` receives one claimed job dict and is responsible for its
    own error handling (catch, log, complete_job with success=False) — this
    loop's own try/except is only for infra-level failures (a claim or
    reclaim call itself throwing), not job-level ones.
    """
    sqs = get_sqs_client() if sqs_queue_url else None

    logger.info(
        "Worker started (job type: %s, poll every %ss, scale-to-zero: %s)",
        job_type,
        poll_interval_seconds,
        "on" if sqs else "off",
    )

    held_receipt_handle: str | None = None

    while not _shutdown_requested:
        try:
            reclaim_stale_processing_jobs(supabase, job_type)
            job = claim_next_job(supabase, job_type)
            if job:
                process_job(job)
                continue

            if sqs and sqs_queue_url:
                if held_receipt_handle:
                    delete_message(sqs, sqs_queue_url, held_receipt_handle)
                    held_receipt_handle = None
                held_receipt_handle = wait_for_wake_signal(
                    sqs, sqs_queue_url, wait_time_seconds=20
                )
            else:
                time.sleep(poll_interval_seconds)
        except KeyboardInterrupt:
            break
        except Exception as exc:  # noqa: BLE001
            log_error(logger, "Unexpected error in worker loop — %s. Retrying.", exc)
            time.sleep(poll_interval_seconds)

    logger.info("Worker shutting down")
