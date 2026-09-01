from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_SYSTEMS_ROOT = Path(__file__).resolve().parents[1]
_REPO_ROOT = _SYSTEMS_ROOT.parent

# Prefer the monorepo root env files so Next.js and workers share secrets.
for candidate in (
    _REPO_ROOT / ".env.local",
    _REPO_ROOT / ".env",
    _SYSTEMS_ROOT / ".env",
):
    if candidate.exists():
        load_dotenv(candidate, override=False)


@dataclass(frozen=True)
class SupabaseSettings:
    url: str
    service_role_key: str


def load_supabase_settings() -> SupabaseSettings:
    url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

    missing = [
        name
        for name, value in [
            ("SUPABASE_URL", url),
            ("SUPABASE_SERVICE_ROLE_KEY", key),
        ]
        if not value
    ]
    if missing:
        raise RuntimeError(f"Missing required environment variables: {', '.join(missing)}")

    return SupabaseSettings(url=url, service_role_key=key)  # type: ignore[arg-type]
