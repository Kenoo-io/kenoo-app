from __future__ import annotations

import logging

import httpx
import trafilatura

from .models import (
    MAX_MARKDOWN_CHARS_PER_PAGE,
    SCRAPE_TIMEOUT_SECONDS,
    OrganicUrlCandidate,
    PageScrapeSynthesis,
    ScrapedPageResult,
)
from .utils import map_pool, truncate_for_prompt

logger = logging.getLogger(__name__)

_SCRAPE_USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)


def scrape_page_markdown(http: httpx.Client, url: str) -> tuple[str | None, str | None]:
    try:
        res = http.get(
            url,
            headers={"User-Agent": _SCRAPE_USER_AGENT},
            timeout=SCRAPE_TIMEOUT_SECONDS,
            follow_redirects=True,
        )
        if not res.is_success:
            return None, f"http_{res.status_code}"
        markdown = trafilatura.extract(
            res.text,
            url=url,
            output_format="markdown",
            include_tables=True,
            include_comments=False,
            favor_precision=True,
        )
        if not markdown or not markdown.strip():
            return None, "empty_extract"
        return markdown, None
    except Exception as exc:  # noqa: BLE001
        return None, str(exc)


def scrape_pages(
    http: httpx.Client,
    candidates: list[OrganicUrlCandidate],
) -> list[ScrapedPageResult]:
    def scrape(candidate: OrganicUrlCandidate, _index: int) -> ScrapedPageResult:
        markdown, error = scrape_page_markdown(http, candidate.url)
        return ScrapedPageResult(
            url=candidate.url,
            title=candidate.title,
            snippet=candidate.snippet,
            search_label=candidate.search_label,
            markdown=markdown,
            scrape_error=error,
        )

    return map_pool(candidates, 3, scrape)


def format_scraped_pages_for_synthesis_prompt(pages: list[ScrapedPageResult]) -> str:
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
                    "Full-page markdown (scraped):",
                    markdown,
                ]
            )
        )
    return "\n\n---\n\n".join(blocks)


def format_page_scrape_synthesis_for_prompt(synthesis: PageScrapeSynthesis | None) -> str:
    if not synthesis:
        return "(No page scrape synthesis — scrapes failed or produced no usable markdown.)"
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
