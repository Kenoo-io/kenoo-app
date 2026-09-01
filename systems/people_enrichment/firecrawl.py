from __future__ import annotations

import logging
import re
import httpx

from .models import (
    FIRECRAWL_SCRAPE_TIMEOUT_MS,
    MAX_MARKDOWN_CHARS_PER_PAGE,
    FirecrawlPageResult,
    OrganicUrlCandidate,
    PageScrapeSynthesis,
)
from .utils import map_pool, truncate_for_prompt

logger = logging.getLogger(__name__)

# Once Firecrawl returns a credits/payment error, skip scrapes for the rest of
# this worker process so a drained quota does not add 6 HTTP calls per donor.
_firecrawl_skip_reason: str | None = None
_CREDIT_ERROR_RE = re.compile(
    r"insufficient credits|out of credits|payment required|upgrade your plan",
    re.IGNORECASE,
)


def reset_firecrawl_skip_for_tests() -> None:
    global _firecrawl_skip_reason
    _firecrawl_skip_reason = None


def _is_credit_exhausted(status_code: int, error: str | None) -> bool:
    if status_code == 402:
        return True
    return bool(error and _CREDIT_ERROR_RE.search(error))


def firecrawl_scrape_markdown(
    http: httpx.Client,
    api_key: str,
    url: str,
) -> tuple[str | None, str | None]:
    try:
        res = http.post(
            "https://api.firecrawl.dev/v1/scrape",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={
                "url": url,
                "formats": ["markdown"],
                "onlyMainContent": True,
                "timeout": FIRECRAWL_SCRAPE_TIMEOUT_MS,
            },
            timeout=FIRECRAWL_SCRAPE_TIMEOUT_MS / 1000 + 10,
        )
        payload = res.json()
        error = None
        if isinstance(payload, dict):
            raw_error = payload.get("error")
            if isinstance(raw_error, str) and raw_error.strip():
                error = raw_error.strip()
        if not res.is_success or (isinstance(payload, dict) and payload.get("success") is False):
            error = error or res.reason_phrase or "scrape_failed"
            if _is_credit_exhausted(res.status_code, error):
                return None, "FIRECRAWL credits exhausted"
            return None, error
        markdown = (payload.get("data") or {}).get("markdown") if isinstance(payload, dict) else None
        if not isinstance(markdown, str) or not markdown.strip():
            return None, "empty_markdown"
        return markdown, None
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)


def scrape_firecrawl_pages(
    http: httpx.Client,
    api_key: str | None,
    candidates: list[OrganicUrlCandidate],
) -> list[FirecrawlPageResult]:
    global _firecrawl_skip_reason
    skip = _firecrawl_skip_reason
    if not api_key:
        skip = "FIRECRAWL_API_KEY not set"
    if skip:
        return [
            FirecrawlPageResult(
                url=candidate.url,
                title=candidate.title,
                snippet=candidate.snippet,
                search_label=candidate.search_label,
                markdown=None,
                scrape_error=skip,
            )
            for candidate in candidates
        ]

    def scrape(candidate: OrganicUrlCandidate, _index: int) -> FirecrawlPageResult:
        global _firecrawl_skip_reason
        if _firecrawl_skip_reason:
            return FirecrawlPageResult(
                url=candidate.url,
                title=candidate.title,
                snippet=candidate.snippet,
                search_label=candidate.search_label,
                markdown=None,
                scrape_error=_firecrawl_skip_reason,
            )
        markdown, error = firecrawl_scrape_markdown(http, api_key, candidate.url)
        if error == "FIRECRAWL credits exhausted":
            if _firecrawl_skip_reason is None:
                logger.warning(
                    "Firecrawl credits exhausted; skipping page scrapes for remaining jobs"
                )
            _firecrawl_skip_reason = error
        return FirecrawlPageResult(
            url=candidate.url,
            title=candidate.title,
            snippet=candidate.snippet,
            search_label=candidate.search_label,
            markdown=markdown,
            scrape_error=error,
        )

    return map_pool(candidates, 3, scrape)


def format_firecrawl_pages_for_synthesis_prompt(pages: list[FirecrawlPageResult]) -> str:
    blocks: list[str] = []
    for index, page in enumerate(pages, start=1):
        markdown = (
            truncate_for_prompt(page.markdown, MAX_MARKDOWN_CHARS_PER_PAGE)
            if page.markdown
            else f"(scrape failed: {page.scrape_error or 'unknown'})"
        )
        blocks.append(
            "\n".join(
                [
                    f"### Page {index}",
                    f"URL: {page.url}",
                    f"From Serper [{page.search_label}]: {page.title}",
                    f"Snippet (search): {page.snippet}",
                    "",
                    "Full-page markdown (Firecrawl):",
                    markdown,
                ]
            )
        )
    return "\n\n---\n\n".join(blocks)


def format_page_scrape_synthesis_for_prompt(synthesis: PageScrapeSynthesis | None) -> str:
    if not synthesis:
        return (
            "(No Firecrawl page synthesis — key missing, scrapes failed, "
            "or no usable markdown.)"
        )
    identity_lines = (
        [f"- {item}" for item in synthesis.identity_signals]
        if synthesis.identity_signals
        else ["- (none)"]
    )
    financial_lines = (
        [f"- {item}" for item in synthesis.financial_signals]
        if synthesis.financial_signals
        else ["- (none)"]
    )
    lines = [
        synthesis.summary,
        "",
        f"likely_same_person: {synthesis.likely_same_person}",
        f"confidence_note: {synthesis.confidence_note}",
        "",
        "identity_signals:",
        *identity_lines,
        "",
        "financial_signals:",
        *financial_lines,
        "",
        "urls_that_appear_relevant: "
        + (", ".join(synthesis.urls_that_appear_relevant) or "(none)"),
    ]
    return "\n".join(lines)


def parse_page_scrape_synthesis(raw: str | None) -> PageScrapeSynthesis | None:
    if not raw:
        return None
    try:
        import json

        data = json.loads(raw)
        if not isinstance(data, dict):
            return None
        return PageScrapeSynthesis(
            summary=str(data.get("summary", "")),
            identity_signals=list(data.get("identity_signals") or []),
            financial_signals=list(data.get("financial_signals") or []),
            likely_same_person=bool(data.get("likely_same_person")),
            confidence_note=str(data.get("confidence_note", "")),
            urls_that_appear_relevant=list(data.get("urls_that_appear_relevant") or []),
        )
    except Exception:  # noqa: BLE001
        return None
