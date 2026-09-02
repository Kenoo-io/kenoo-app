from __future__ import annotations

import os
from dataclasses import dataclass

from shared.config import load_supabase_settings

JOB_TYPE = "people-enrichment"


@dataclass(frozen=True)
class PeopleEnrichmentSettings:
    supabase_url: str
    supabase_service_role_key: str
    serper_api_key: str
    openai_api_key: str
    poll_interval_seconds: float


def load_settings() -> PeopleEnrichmentSettings:
    supabase = load_supabase_settings()

    serper_api_key = os.getenv("SERPER_API_KEY")
    openai_api_key = os.getenv("OPENAI_API_KEY")

    missing = [
        name
        for name, value in [
            ("SERPER_API_KEY", serper_api_key),
            ("OPENAI_API_KEY", openai_api_key),
        ]
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

    return PeopleEnrichmentSettings(
        supabase_url=supabase.url,
        supabase_service_role_key=supabase.service_role_key,
        serper_api_key=serper_api_key,  # type: ignore[arg-type]
        openai_api_key=openai_api_key,  # type: ignore[arg-type]
        poll_interval_seconds=float(os.getenv("POLL_INTERVAL_SECONDS", "10")),
    )
