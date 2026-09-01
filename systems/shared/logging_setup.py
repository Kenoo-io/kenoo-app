from __future__ import annotations

import logging
import sys
from typing import Any

_QUIET_LOGGERS = (
    "httpx",
    "httpcore",
    "hpack",
    "urllib3",
    "supabase",
    "postgrest",
    "gotrue",
    "realtime",
)


def configure_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S",
        stream=sys.stdout,
        force=True,
    )
    for name in _QUIET_LOGGERS:
        logging.getLogger(name).setLevel(logging.WARNING)


def log_error(logger: logging.Logger, message: str, *args: Any) -> None:
    logger.error("ERROR | " + message, *args)
