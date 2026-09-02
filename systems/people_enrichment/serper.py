from __future__ import annotations

import logging
from typing import Any
from urllib.parse import urlparse

import httpx

from .models import (
    MAX_SCRAPE_URLS,
    OrganicUrlCandidate,
    SearchResult,
    scrape_url_sort_key,
)
from .utils import hostname_looks_unscrapable, normalize_url_for_dedup, sanitize_property_listing_url

logger = logging.getLogger(__name__)


def run_serper_searches(
    http: httpx.Client,
    api_key: str,
    queries: list[tuple[str, str]],
) -> list[SearchResult]:
    results: list[SearchResult] = []
    for label, query in queries:
        data = serper_search_sync(http, api_key, query)
        results.append(SearchResult(label=label, query=query, data=data))
    return results


def serper_search_sync(http: httpx.Client, api_key: str, query: str) -> dict[str, Any] | None:
    try:
        res = http.post(
            "https://google.serper.dev/search",
            headers={
                "X-API-KEY": api_key,
                "Content-Type": "application/json",
            },
            json={"q": query, "num": 5},
            timeout=30.0,
        )
        if not res.is_success:
            return None
        return res.json()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Serper search failed for %r: %s", query, exc)
        return None


def format_search_results(results: list[SearchResult]) -> str:
    blocks: list[str] = []
    for result in results:
        if not result.data:
            continue
        lines = [f'### Search [{result.label}]: "{result.query}"']
        data = result.data

        answer_box = data.get("answerBox")
        if isinstance(answer_box, dict):
            answer = answer_box.get("answer") or answer_box.get("snippet") or answer_box.get("title") or ""
            lines.append(f"Answer: {answer}")

        knowledge_graph = data.get("knowledgeGraph")
        if isinstance(knowledge_graph, dict):
            lines.append(
                "Knowledge graph: "
                f"{knowledge_graph.get('title', '')} "
                f"({knowledge_graph.get('type', '')}) — "
                f"{knowledge_graph.get('description', '')}"
            )
            attributes = knowledge_graph.get("attributes")
            if isinstance(attributes, dict):
                for key, value in attributes.items():
                    lines.append(f"  {key}: {value}")

        organic = data.get("organic") or []
        if isinstance(organic, list):
            for item in organic[:5]:
                if not isinstance(item, dict):
                    continue
                lines.append(
                    f"[{item.get('position', '?')}] {item.get('title', '')}\n"
                    f"    {item.get('snippet', '')}\n"
                    f"    {item.get('link', '')}"
                )
        blocks.append("\n".join(lines))
    return "\n\n---\n\n".join(blocks)


def pick_property_listing_url(search_results: list[SearchResult]) -> str | None:
    for result in search_results:
        if result.label not in {"property", "property_tx"}:
            continue
        organic = (result.data or {}).get("organic") or []
        if not isinstance(organic, list):
            continue
        for item in organic:
            if not isinstance(item, dict):
                continue
            url = sanitize_property_listing_url(str(item.get("link", "")).strip() or None)
            if url:
                return url
    return None


def pick_organic_urls_for_scrape(
    search_results: list[SearchResult],
    max_urls: int = MAX_SCRAPE_URLS,
) -> list[OrganicUrlCandidate]:
    rows: list[OrganicUrlCandidate] = []
    for search_result in search_results:
        organic = (search_result.data or {}).get("organic") or []
        if not isinstance(organic, list):
            continue
        for item in organic:
            if not isinstance(item, dict):
                continue
            link = str(item.get("link", "")).strip()
            if not link:
                continue
            try:
                host = urlparse(link).hostname or ""
            except Exception:  # noqa: BLE001
                continue
            if hostname_looks_unscrapable(host):
                continue
            rows.append(
                OrganicUrlCandidate(
                    url=link,
                    title=str(item.get("title", "")),
                    snippet=str(item.get("snippet", "")),
                    position=int(item.get("position") or 99),
                    search_label=search_result.label,
                )
            )

    rows.sort(key=lambda row: scrape_url_sort_key(row.search_label, row.position, row.url))
    seen: set[str] = set()
    out: list[OrganicUrlCandidate] = []
    for row in rows:
        key = normalize_url_for_dedup(row.url)
        if not key or key in seen:
            continue
        seen.add(key)
        out.append(row)
        if len(out) >= max_urls:
            break
    return out
