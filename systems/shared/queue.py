from __future__ import annotations

import os
from typing import Any

import boto3


def get_sqs_client() -> Any:
    return boto3.client("sqs", region_name=os.getenv("AWS_REGION", "us-east-2"))


def wait_for_wake_signal(sqs: Any, queue_url: str, *, wait_time_seconds: int = 20) -> str | None:
    """Long-poll for one message; returns its receipt handle, or None on timeout.

    Callers should hold the receipt handle open (not delete it) for as long as
    there might still be a backlog to drain — that's what keeps the queue's
    (visible + in-flight) message count above zero for the Application Auto
    Scaling policy watching it, so the service isn't scaled to zero mid-job.
    """
    response = sqs.receive_message(
        QueueUrl=queue_url,
        MaxNumberOfMessages=1,
        WaitTimeSeconds=wait_time_seconds,
    )
    messages = response.get("Messages") or []
    return messages[0]["ReceiptHandle"] if messages else None


def delete_message(sqs: Any, queue_url: str, receipt_handle: str) -> None:
    sqs.delete_message(QueueUrl=queue_url, ReceiptHandle=receipt_handle)
