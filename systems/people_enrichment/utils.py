from __future__ import annotations

import json
import re
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import UTC, datetime
from typing import Any, Callable, TypeVar
from urllib.parse import unquote, urlparse

_EMAIL_YEAR_RE = re.compile(r"(?:19|20)\d{2}")
_EMAIL_TWO_DIGIT_SUFFIX_RE = re.compile(r"(?<=[a-z])(\d{2})$", re.IGNORECASE)
_MIN_DONOR_AGE_YEARS = 16
_MAX_DONOR_AGE_YEARS = 110
# Two-digit email suffixes like brownejoseph18 must not become 1918. A living
# donor over 100 is possible in a bio, but it is not a safe guess from an email.
_MAX_EMAIL_YEAR_AGE_YEARS = 99
# Full-time annual wages below this (USD) are almost always monthly listings
# (EU PhD stipends, Glassdoor /mo) copied as yearly.
_MONTHLY_SALARY_AS_ANNUAL_MIN = 1_200
_MONTHLY_SALARY_AS_ANNUAL_MAX = 8_000
_HOURLY_TO_ANNUAL_HOURS = 2_080
_MONTHLY_SALARY_RE = re.compile(
    r"\b(per[\s-]?month|monthly|/mo\b|a month|each month)\b",
    re.IGNORECASE,
)
_HOURLY_SALARY_RE = re.compile(
    r"\b(per[\s-]?hour|hourly|/hr\b|an hour)\b",
    re.IGNORECASE,
)
_WEEKLY_SALARY_RE = re.compile(
    r"\b(per[\s-]?week|weekly|/wk\b|a week)\b",
    re.IGNORECASE,
)

T = TypeVar("T")
R = TypeVar("R")

_PLACEHOLDER_STRINGS = frozenset({
    "unknown",
    "none",
    "n/a",
    "na",
    "null",
    "not available",
    "not provided",
    "unavailable",
    "undefined",
    "-",
})


def trim_or_null(value: str | None) -> str | None:
    text = value.strip() if isinstance(value, str) else ""
    return text if text else None


def sanitize_stored_value(value: str | None) -> str | None:
    """Normalize a value before writing to the database — empty/placeholder → null."""
    text = trim_or_null(value)
    if not text:
        return None
    normalized = text.lower().rstrip(".")
    if normalized in _PLACEHOLDER_STRINGS:
        return None
    return text


def coalesce_loc_field(*values: str | None) -> str | None:
    for value in values:
        result = sanitize_stored_value(value)
        if result:
            return result
    return None


def context_label(value: str | None) -> str:
    """Human-readable label for LLM prompts only — never written to the database."""
    return sanitize_stored_value(value) or "(not on file)"


def email_domain(email: str | None) -> str | None:
    text = trim_or_null(email)
    if not text or "@" not in text:
        return None
    domain = text.rsplit("@", 1)[1].strip().lower().rstrip(".")
    domain = domain.removeprefix("www.")
    if not domain or "." not in domain or " " in domain:
        return None
    return domain


def classify_email_kind(email: str | None) -> str | None:
    """personal = consumer inbox; business = custom/work domain for Apollo."""
    from .models import PERSONAL_EMAIL_DOMAINS

    domain = email_domain(email)
    if not domain:
        return None
    labels = domain.split(".")
    for index in range(len(labels) - 1):
        if ".".join(labels[index:]) in PERSONAL_EMAIL_DOMAINS:
            return "personal"
    return "business"


def is_school_email_domain(email: str | None) -> bool:
    """True for university, college, and K-12 style domains.

    A match means a campus account (student, faculty, staff, or sometimes
    alumni), not that the donor is currently a student.
    """
    domain = email_domain(email)
    if not domain:
        return False
    labels = domain.split(".")
    if labels[-1] == "edu":
        return True
    if len(labels) >= 2 and labels[-2] == "edu":
        return True
    if len(labels) >= 2 and labels[-2:] == ["ac", "uk"]:
        return True
    if len(labels) >= 3 and labels[-2] == "ac" and len(labels[-1]) == 2:
        return True
    if "k12" in labels:
        return True
    return len(labels) >= 2 and labels[-2:] == ["sch", "uk"]


def email_kind_fields(email: str | None) -> dict[str, str]:
    domain = email_domain(email)
    kind = classify_email_kind(email)
    if not domain or not kind:
        return {}
    return {"email_domain": domain, "email_kind": kind}


def salary_period_annual_factor(reasoning: str | None) -> int | None:
    """Hours/weeks/months in a year when the writeup is not already annual."""
    text = reasoning or ""
    if _HOURLY_SALARY_RE.search(text):
        return _HOURLY_TO_ANNUAL_HOURS
    if _WEEKLY_SALARY_RE.search(text):
        return 52
    if _MONTHLY_SALARY_RE.search(text):
        return 12
    return None


def _usd_amount(value: int | None) -> str | None:
    if value is None:
        return None
    return f"${value:,}"


def _annualized_salary_reasoning(
    factor: int,
    est_salary: int | None,
    est_salary_min: int | None,
    est_salary_max: int | None,
) -> str:
    amount = _usd_amount(est_salary) or "the converted figure"
    range_bit = ""
    low = _usd_amount(est_salary_min)
    high = _usd_amount(est_salary_max)
    if low and high:
        range_bit = f" (range {low}–{high})"
    if factor == 12:
        period = "monthly"
        how = "×12"
    elif factor == 52:
        period = "weekly"
        how = "×52"
    else:
        period = "hourly"
        how = "×2080 full-time hours"
    return (
        f"Stored annual estimate {amount}/yr{range_bit}. The source wage was a "
        f"{period} listing, converted {how}. Glassdoor and EU academic pages "
        "often show /mo, not /yr — do not read the source amount as yearly."
    )


def annualize_salary_fields(
    est_salary: int | None,
    est_salary_min: int | None,
    est_salary_max: int | None,
    reasoning: str | None,
) -> tuple[int | None, int | None, int | None, str | None]:
    """Store annual USD. Monthly PhD/Glassdoor figures must not be saved as yearly."""
    factor = salary_period_annual_factor(reasoning)
    if factor is None and est_salary is not None:
        if _MONTHLY_SALARY_AS_ANNUAL_MIN <= est_salary <= _MONTHLY_SALARY_AS_ANNUAL_MAX:
            factor = 12
    if factor is None or factor == 1:
        return est_salary, est_salary_min, est_salary_max, reasoning

    def scale(value: int | None) -> int | None:
        if value is None:
            return None
        return round(value * factor)

    annual = scale(est_salary)
    annual_min = scale(est_salary_min)
    annual_max = scale(est_salary_max)
    return (
        annual,
        annual_min,
        annual_max,
        _annualized_salary_reasoning(factor, annual, annual_min, annual_max),
    )


def _plausible_birth_year(
    year: int,
    *,
    now: datetime | None = None,
    max_age: int = _MAX_DONOR_AGE_YEARS,
) -> bool:
    year_now = (now or datetime.now(UTC)).year
    return year_now - max_age <= year <= year_now - _MIN_DONOR_AGE_YEARS


def _plausible_email_birth_year(year: int, *, now: datetime | None = None) -> bool:
    return _plausible_birth_year(year, now=now, max_age=_MAX_EMAIL_YEAR_AGE_YEARS)


def _expand_two_digit_year(yy: int, *, now: datetime | None = None) -> int | None:
    candidates = [
        year
        for year in (1900 + yy, 2000 + yy)
        if _plausible_email_birth_year(year, now=now)
    ]
    return candidates[0] if len(candidates) == 1 else None


def email_local_part_year_tokens(email: str | None, *, now: datetime | None = None) -> list[int]:
    """Birth/graduation year tokens from an email local-part.

    Four-digit years anywhere in the local-part, plus a two-digit suffix after a
    letter (samathacarl81 → 1981). Random trailing digits like user1234 are ignored.
    """
    text = trim_or_null(email)
    if not text or "@" not in text:
        return []
    local = text.split("@", 1)[0]
    years: list[int] = []
    seen: set[int] = set()
    for match in _EMAIL_YEAR_RE.findall(local):
        year = int(match)
        if not _plausible_email_birth_year(year, now=now) or year in seen:
            continue
        seen.add(year)
        years.append(year)
    suffix = _EMAIL_TWO_DIGIT_SUFFIX_RE.search(local)
    if suffix:
        expanded = _expand_two_digit_year(int(suffix.group(1)), now=now)
        if expanded is not None and expanded not in seen:
            years.append(expanded)
    return years


def birth_year_from_email(email: str | None, *, now: datetime | None = None) -> int | None:
    """Single year of birth when the local-part has exactly one plausible year.

    School/university addresses keep the year as a class/graduation clue in
    email_local_part_year_tokens; they do not become people.birth_year.
    """
    if is_school_email_domain(email):
        return None
    years = email_local_part_year_tokens(email, now=now)
    return years[0] if len(years) == 1 else None


def resolve_birth_year(value: Any, *, now: datetime | None = None) -> int | None:
    if isinstance(value, bool) or value is None:
        return None
    if isinstance(value, float) and value == int(value):
        value = int(value)
    if isinstance(value, int):
        return value if _plausible_birth_year(value, now=now) else None
    text = sanitize_stored_value(value if isinstance(value, str) else None)
    if not text:
        return None
    match = re.fullmatch(r"(?:19|20)\d{2}", text)
    if not match:
        return None
    year = int(match.group(0))
    return year if _plausible_birth_year(year, now=now) else None


def birth_year_fields(
    email: str | None,
    research_year: int | None = None,
    *,
    now: datetime | None = None,
) -> dict[str, int | str]:
    email_year = birth_year_from_email(email, now=now)
    if is_school_email_domain(email):
        school_years = set(email_local_part_year_tokens(email, now=now))
        if research_year in school_years:
            research_year = None
    if email_year and research_year == email_year:
        return {"birth_year": email_year, "birth_year_source": "both"}
    if email_year:
        return {"birth_year": email_year, "birth_year_source": "email"}
    if research_year:
        return {"birth_year": research_year, "birth_year_source": "research"}
    return {}


def resolve_ai_enrichment_confidence(identity: dict[str, Any]) -> float | None:
    raw = identity.get("confidence_score")
    if isinstance(raw, (int, float)) and raw == raw:  # not NaN
        if 0 <= raw <= 1:
            return round(raw, 3)
        if 1 < raw <= 100:
            return round(raw / 100, 3)

    label = str(identity.get("confidence", "")).lower().strip()
    if label == "high":
        return 0.85
    if label == "medium":
        return 0.55
    if label == "low":
        return 0.25
    return None


def resolve_allowed_value(
    value: Any,
    allowed: frozenset[str],
    aliases: dict[str, str] | None = None,
) -> str | None:
    """Map an LLM label onto a controlled CRM filter value."""
    if not isinstance(value, str):
        return None
    text = sanitize_stored_value(value)
    if not text:
        return None
    key = re.sub(r"[^a-z0-9]+", "_", text.lower()).strip("_")
    if not key:
        return None
    mapped = (aliases or {}).get(key, key)
    return mapped if mapped in allowed else None


def _host_allowed(host: str, allowed_hosts: frozenset[str]) -> bool:
    return any(host == allowed or host.endswith(f".{allowed}") for allowed in allowed_hosts)


def sanitize_http_url(
    value: str | None,
    *,
    allowed_hosts: frozenset[str] | None = None,
) -> str | None:
    text = sanitize_stored_value(value)
    if not text:
        return None
    candidate = text if "://" in text else f"https://{text}"
    try:
        parsed = urlparse(candidate)
    except Exception:  # noqa: BLE001
        return None
    if parsed.scheme not in {"http", "https"}:
        return None
    host = (parsed.hostname or "").lower().removeprefix("www.")
    if not host:
        return None
    if allowed_hosts is not None and not _host_allowed(host, allowed_hosts):
        return None
    path = parsed.path.rstrip("/") or "/"
    query = f"?{parsed.query}" if parsed.query else ""
    return f"https://{host}{path}{query}"


def sanitize_linkedin_url(value: str | None) -> str | None:
    return sanitize_http_url(value, allowed_hosts=frozenset({"linkedin.com", "lnkd.in"}))


def sanitize_facebook_url(value: str | None) -> str | None:
    return sanitize_http_url(value, allowed_hosts=frozenset({"facebook.com", "fb.com"}))


_INSTAGRAM_USERNAME_RE = re.compile(r"^[A-Za-z0-9._]{1,30}$")
_INSTAGRAM_RESERVED_PATHS = frozenset(
    {
        "about",
        "accounts",
        "ads",
        "api",
        "blog",
        "challenge",
        "developer",
        "direct",
        "directory",
        "emails",
        "explore",
        "graphql",
        "help",
        "igtv",
        "legal",
        "lite",
        "nametag",
        "oauth",
        "p",
        "popular",
        "privacy",
        "reel",
        "reels",
        "share",
        "stories",
        "tags",
        "tv",
        "web",
    }
)


def sanitize_instagram_url(value: str | None) -> str | None:
    """Keep only a profile handle URL, not search/popular/explore/post pages."""
    url = sanitize_http_url(value, allowed_hosts=frozenset({"instagram.com"}))
    if not url:
        return None
    parts = [part for part in (urlparse(url).path or "").split("/") if part]
    if len(parts) != 1:
        return None
    handle = parts[0]
    if handle.lower() in _INSTAGRAM_RESERVED_PATHS:
        return None
    if not _INSTAGRAM_USERNAME_RE.fullmatch(handle):
        return None
    return f"https://instagram.com/{handle}"


def sanitize_x_url(value: str | None) -> str | None:
    url = sanitize_http_url(value, allowed_hosts=frozenset({"x.com", "twitter.com"}))
    if not url:
        return None
    return url.replace("https://twitter.com", "https://x.com", 1)


def sanitize_website_url(value: str | None) -> str | None:
    url = sanitize_http_url(value)
    if not url:
        return None
    host = (urlparse(url).hostname or "").lower().removeprefix("www.")
    reserved = {
        "linkedin.com",
        "lnkd.in",
        "facebook.com",
        "fb.com",
        "instagram.com",
        "x.com",
        "twitter.com",
        "zillow.com",
        "redfin.com",
        "realtor.com",
    }
    if _host_allowed(host, frozenset(reserved)):
        return None
    return url


def sanitize_property_listing_url(value: str | None) -> str | None:
    return sanitize_http_url(
        value,
        allowed_hosts=frozenset(
            {"zillow.com", "redfin.com", "realtor.com", "homes.com", "trulia.com"}
        ),
    )


def urls_from_llm_value(value: Any) -> list[str]:
    found: list[str] = []
    if isinstance(value, str):
        found.append(value)
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, str):
                found.append(item)
            elif isinstance(item, dict):
                for key in ("url", "link", "href", "source"):
                    raw = item.get(key)
                    if isinstance(raw, str):
                        found.append(raw)
                        break
    return found


def unique_http_urls(values: list[str], *, limit: int) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for value in values:
        url = sanitize_http_url(value)
        if not url or url in seen:
            continue
        seen.add(url)
        out.append(url)
        if len(out) >= limit:
            break
    return out


def resolve_llm_bool(value: Any) -> bool | None:
    """Read a yes/no LLM answer, keeping "don't know" distinct from "no".

    Scoring treats null and false differently: false is a researched negative,
    null means the question was never answered.
    """
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return bool(value)
    text = sanitize_stored_value(value if isinstance(value, str) else None)
    if not text:
        return None
    normalized = text.lower()
    if normalized in {"true", "yes", "y", "likely", "probably"}:
        return True
    if normalized in {"false", "no", "n", "unlikely"}:
        return False
    return None


def format_enrichment_research_as_of(date: datetime | None = None) -> str:
    now = date or datetime.now(UTC)
    iso = now.isoformat().replace("+00:00", "Z")
    utc_ymd = iso[:10]
    utc_year = now.year
    utc_month = now.month
    return (
        "REFERENCE — current instant for this enrichment run (server clock, UTC). "
        "Use it to compare sale years, listing ages, and how much time has passed "
        "since any historical price.\n"
        f"ISO 8601: {iso}\n"
        f"UTC calendar date: {utc_ymd} (year={utc_year}, month={utc_month})."
    )


def parse_transaction_metadata(raw: Any) -> dict[str, Any] | None:
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, str):
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            return None
    return None


def tokenize_person_name(value: str | None) -> list[str]:
    text = trim_or_null(value)
    if not text:
        return []
    return [part.lower() for part in text.split() if part]


def is_ordered_token_subsequence(small: list[str], large: list[str]) -> bool:
    if not small:
        return False
    index = 0
    for token in large:
        if index < len(small) and token == small[index]:
            index += 1
    return index == len(small)


def is_expanded_payment_name_vs_crm_full_name(crm_full_name: str, payment_name: str) -> bool:
    crm = tokenize_person_name(crm_full_name)
    meta = tokenize_person_name(payment_name)
    if len(crm) < 1 or len(meta) < 2:
        return False
    if not is_ordered_token_subsequence(crm, meta):
        return False
    if len(crm) == 1:
        return len(meta) >= 3
    return len(meta) > len(crm)


def pick_expanded_payment_search_names(crm_full_name: str, payment_names: list[str]) -> list[str]:
    crm = trim_or_null(crm_full_name)
    if not crm:
        return []
    expanded = [
        name for name in payment_names if is_expanded_payment_name_vs_crm_full_name(crm, name)
    ]
    if not expanded:
        return []
    expanded.sort(key=len, reverse=True)
    return [expanded[0]]


def truncate_for_prompt(text: str, max_chars: int) -> str:
    if len(text) <= max_chars:
        return text
    return f"{text[:max_chars]}\n\n[…truncated…]"


def normalize_url_for_dedup(raw: str) -> str | None:
    try:
        from urllib.parse import urlparse

        parsed = urlparse(raw.strip())
        if parsed.scheme not in ("http", "https"):
            return None
        path = parsed.path.rstrip("/") or "/"
        return f"{parsed.scheme}://{parsed.netloc}{path}{parsed.query and '?' + parsed.query or ''}"
    except Exception:  # noqa: BLE001
        return None


def hostname_looks_unscrapable(host: str) -> bool:
    hostname = host.lower().removeprefix("www.")
    blocked = {
        "google.com",
        "youtube.com",
        "facebook.com",
        "instagram.com",
        "twitter.com",
        "x.com",
        "tiktok.com",
        "pinterest.com",
        "reddit.com",
        "threads.net",
    }
    return hostname in blocked


def map_pool(
    items: list[T],
    concurrency: int,
    fn: Callable[[T, int], R],
) -> list[R]:
    if not items:
        return []
    results: list[R | None] = [None] * len(items)
    workers = min(concurrency, len(items))
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {executor.submit(fn, item, index): index for index, item in enumerate(items)}
        for future in as_completed(futures):
            index = futures[future]
            results[index] = future.result()
    return [r for r in results if r is not None]


def extract_paypal_checkout_order_id(meta: dict[str, Any]) -> str | None:
    supplementary = meta.get("supplementary_data") or {}
    if isinstance(supplementary, dict):
        related = supplementary.get("related_ids") or {}
        if isinstance(related, dict):
            order_id = related.get("order_id")
            if isinstance(order_id, str) and order_id.strip():
                return order_id.strip()

    if (
        isinstance(meta.get("intent"), str)
        and isinstance(meta.get("purchase_units"), list)
        and isinstance(meta.get("id"), str)
        and meta["id"].strip()
    ):
        return meta["id"].strip()

    links = meta.get("links")
    if isinstance(links, list):
        for link in links:
            if not isinstance(link, dict):
                continue
            rel = str(link.get("rel", ""))
            href = str(link.get("href", ""))
            if rel == "up" and "/v2/checkout/orders/" in href:
                import re

                match = re.search(r"/checkout/orders/([^/?#]+)", href)
                if match:
                    return unquote(match.group(1))
    return None
