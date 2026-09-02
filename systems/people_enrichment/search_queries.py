from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Any

from .models import MAX_SALARY_RESEARCH_QUERIES, MAX_SERPER_QUERIES, PeopleLocationFields
from .utils import coalesce_loc_field


@dataclass
class SearchQuery:
    label: str
    query: str


def pick_property_search_lines(
    donor: dict[str, str | None],
    extracted_addresses: list[str],
) -> list[str]:
    candidates: list[str] = []

    donor_line = None
    if donor.get("address_line_1"):
        donor_line = " ".join(
            part
            for part in [
                donor.get("address_line_1"),
                donor.get("address_line_2"),
                donor.get("city"),
                donor.get("state"),
                donor.get("post_code"),
            ]
            if part
        ).strip()
    if donor_line and len(donor_line) >= 8:
        candidates.append(donor_line)

    for address in extracted_addresses:
        compact = re.sub(r"\s+", " ", address.replace(",", " ")).strip()
        if len(compact) >= 8:
            candidates.append(compact)

    def score(line: str) -> int:
        value = 0
        if re.search(r"\d", line):
            value += 4
        if re.search(r"\d{5}(-\d{4})?", line):
            value += 3
        return value

    seen: set[str] = set()
    ranked: list[str] = []
    for line in sorted(candidates, key=lambda item: (-score(item), -len(item))):
        key = re.sub(r"[^a-z0-9]", "", line.lower())
        if len(key) < 6 or key in seen:
            continue
        seen.add(key)
        ranked.append(line)

    return ranked[:2]


def location_fields_for_search(
    donor: dict[str, str | None],
    from_tx: PeopleLocationFields,
    existing: dict[str, str | None] | None,
) -> dict[str, str | None]:
    """Prefer CRM, then payment metadata, then a prior people row."""
    existing = existing or {}
    return {
        "address_line_1": coalesce_loc_field(
            donor.get("address_line_1"),
            from_tx.address_line_1,
            existing.get("address_line_1"),
        ),
        "address_line_2": coalesce_loc_field(
            donor.get("address_line_2"),
            from_tx.address_line_2,
            existing.get("address_line_2"),
        ),
        "city": coalesce_loc_field(donor.get("city"), from_tx.city, existing.get("city")),
        "state": coalesce_loc_field(
            donor.get("state"), from_tx.state, existing.get("state")
        ),
        "post_code": coalesce_loc_field(
            donor.get("post_code"), from_tx.post_code, existing.get("post_code")
        ),
        "organization_name": donor.get("organization_name"),
    }


def build_search_queries(
    *,
    full_name: str,
    email: str | None,
    donor: dict[str, str | None],
    extracted_addresses: list[str],
    expanded_payment_search_names: list[str],
) -> list[SearchQuery]:
    property_lines = pick_property_search_lines(donor, extracted_addresses)
    queries: list[SearchQuery] = []
    location_str = ", ".join(part for part in [donor.get("city"), donor.get("state")] if part)

    # Identifier-anchored queries first so search/scrape results surface local people,
    # not only the most famous namesake.
    if full_name and email:
        queries.append(SearchQuery(label="name_email", query=f'"{full_name}" "{email}"'))
        queries.append(SearchQuery(label="email", query=f'"{email}"'))
    elif email:
        queries.append(SearchQuery(label="email", query=f'"{email}"'))

    if expanded_payment_search_names:
        payment_expanded = expanded_payment_search_names[0]
        if email:
            queries.append(
                SearchQuery(
                    label="name_payment_metadata_email",
                    query=f'"{payment_expanded}" "{email}"',
                )
            )
        else:
            queries.append(
                SearchQuery(label="name_payment_metadata", query=f'"{payment_expanded}"')
            )

    if full_name and property_lines:
        queries.append(
            SearchQuery(label="name_address", query=f'"{full_name}" {property_lines[0]}')
        )

    if full_name and location_str:
        queries.append(
            SearchQuery(label="name_location", query=f'"{full_name}" {location_str}')
        )

    property_suffix = (
        "home value Zestimate OR Redfin estimate OR property tax assessment "
        "site:zillow.com OR site:redfin.com OR site:realtor.com"
    )
    if property_lines:
        queries.append(
            SearchQuery(label="property", query=f"{property_lines[0]} {property_suffix}")
        )
    if len(property_lines) > 1:
        queries.append(
            SearchQuery(label="property_tx", query=f"{property_lines[1]} {property_suffix}")
        )

    organization = donor.get("organization_name")
    if full_name and organization:
        queries.append(
            SearchQuery(label="name_org", query=f'"{full_name}" "{organization}"')
        )

    if full_name:
        queries.append(SearchQuery(label="name", query=f'"{full_name}"'))

    if len(queries) < MAX_SERPER_QUERIES and full_name:
        location_clause = f"{location_str} " if location_str else ""
        queries.append(
            SearchQuery(
                label="name_financial",
                query=(
                    f'"{full_name}" {location_clause}'
                    "LinkedIn OR job title OR profession OR employer OR occupation "
                    "OR biography"
                ),
            )
        )

    return queries[:MAX_SERPER_QUERIES]


def _nonempty_text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    text = value.strip()
    if not text or text.lower() in {"unknown", "n/a", "none", "null"}:
        return None
    return text


def location_for_salary_research(
    donor: dict[str, str | None],
    identity_data: dict[str, Any],
) -> tuple[str | None, str | None]:
    """Prefer identity city/state when the person search filled them in."""
    city = _nonempty_text(identity_data.get("city")) or _nonempty_text(donor.get("city"))
    state = _nonempty_text(identity_data.get("state")) or _nonempty_text(donor.get("state"))
    return city, state


def occupation_for_salary_research(identity_data: dict[str, Any]) -> str | None:
    return _nonempty_text(identity_data.get("job_title")) or _nonempty_text(
        identity_data.get("profession")
    )


def build_salary_research_queries(
    *,
    donor: dict[str, str | None],
    identity_data: dict[str, Any],
) -> list[SearchQuery]:
    """Location and wage comps for salary — no donor name, so SERPs stay on Census/BLS."""
    city, state = location_for_salary_research(donor, identity_data)
    location_str = ", ".join(part for part in [city, state] if part)
    occupation = occupation_for_salary_research(identity_data)
    queries: list[SearchQuery] = []

    if location_str:
        queries.append(
            SearchQuery(
                label="local_income",
                query=(
                    f"{location_str} median household income Census Bureau "
                    "cost of living typical wages"
                ),
            )
        )

    if occupation and location_str:
        queries.append(
            SearchQuery(
                label="occupation_salary",
                query=(
                    f'"{occupation}" annual salary {location_str} '
                    "BLS OR Glassdoor OR Payscale"
                ),
            )
        )
    elif occupation:
        queries.append(
            SearchQuery(
                label="occupation_salary",
                query=f'"{occupation}" annual salary United States BLS OR Glassdoor',
            )
        )
    elif location_str:
        queries.append(
            SearchQuery(
                label="local_housing_income",
                query=(
                    f"{location_str} median home value median household income "
                    "homeowners Census"
                ),
            )
        )

    return queries[:MAX_SALARY_RESEARCH_QUERIES]
