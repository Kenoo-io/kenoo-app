from __future__ import annotations

import logging
import re
from typing import Any

from .models import (
    ADDRESS_SOURCE_CRM,
    ADDRESS_SOURCE_PAYMENT,
    ADDRESS_SOURCE_RESEARCH,
    ADDRESS_SOURCES,
    IDENTITY_ADDRESS_MIN_CONFIDENCE,
    PeopleLocationFields,
    PeopleWorkFields,
)
from .utils import (
    coalesce_loc_field,
    sanitize_stored_value,
    trim_or_null,
)

logger = logging.getLogger(__name__)

_NON_ALNUM = re.compile(r"[^a-z0-9]+")
_FOLLOWER_COUNT = re.compile(
    r"(?P<num>\d{1,3}(?:,\d{3})+|\d+(?:\.\d+)?)\s*"
    r"(?P<suffix>k|m|thousand|million)?\s*"
    r"(?:followers|fans)\b",
    re.IGNORECASE,
)
_WEAK_SOCIAL_NOTABILITY = re.compile(
    r"digital creator|content creator|facebook creator|instagram creator|"
    r"creator account|profile (?:type|category)|meta (?:badge )?'?digital creator|"
    r"identified as a (?:digital |content )?creator",
    re.IGNORECASE,
)
_STRONG_NOTABILITY = re.compile(
    r"wikipedia|encyclopedia|imdb|billboard|espn|olympic|olympian|"
    r"\bnfl\b|\bnba\b|\bmlb\b|\bnhl\b|premier league|"
    r"grammy|oscar|emmy|tony award|pulitzer|"
    r"elected|senator|congress|governor|mayor|city council|"
    r"new york times|washington post|reuters|associated press|"
    r"historical figure|household name|pop star|superstar|"
    r"professional athlete|hall of fame|fortune 500|"
    r"tens of thousands|hundreds of thousands|millions of (?:followers|fans)",
    re.IGNORECASE,
)
MIN_CREATOR_FOLLOWERS_FOR_PUBLIC_FIGURE = 10_000


def _parse_follower_counts(text: str) -> list[int]:
    counts: list[int] = []
    for match in _FOLLOWER_COUNT.finditer(text):
        raw = match.group("num").replace(",", "")
        try:
            value = float(raw)
        except ValueError:
            continue
        suffix = (match.group("suffix") or "").lower()
        if suffix in {"k", "thousand"}:
            value *= 1_000
        elif suffix in {"m", "million"}:
            value *= 1_000_000
        counts.append(int(value))
    return counts


def _identity_notability_blob(identity_data: dict[str, Any]) -> str:
    parts = [
        identity_data.get("famous_namesake"),
        identity_data.get("high_profile_details"),
        identity_data.get("confidence_reasoning"),
        identity_data.get("most_likely_identity"),
        identity_data.get("profession"),
        identity_data.get("influence_area"),
        identity_data.get("influence_category"),
    ]
    return " ".join(str(part) for part in parts if part)


def is_weak_social_notability(text: str) -> bool:
    """True when fame rests on a tiny social profile or Meta 'creator' badge."""
    blob = text.strip()
    if not blob:
        return False
    if _STRONG_NOTABILITY.search(blob):
        return False
    follower_counts = _parse_follower_counts(blob)
    if follower_counts:
        return max(follower_counts) < MIN_CREATOR_FOLLOWERS_FOR_PUBLIC_FIGURE
    return bool(_WEAK_SOCIAL_NOTABILITY.search(blob))


def apply_public_figure_notability_guard(identity_data: dict[str, Any]) -> dict[str, Any]:
    """Drop CRM public-figure fields when the hit is a private social profile.

    Facebook/Instagram 'Digital creator' is a profile type, not notability.
    Staff still get a namesake warning for real celebrities (Wikipedia, press,
    pro sports, large audiences).
    """
    data = dict(identity_data)
    if not is_weak_social_notability(_identity_notability_blob(data)):
        return data

    data["famous_namesake"] = None
    data["famous_namesake_likelihood"] = None
    data["is_high_profile"] = False
    data["influence_category"] = None
    data["influence_area"] = None
    data["high_profile_details"] = None
    return data


def sanitize_address_source(value: str | None) -> str | None:
    text = trim_or_null(value)
    if not text:
        return None
    normalized = text.lower()
    return normalized if normalized in ADDRESS_SOURCES else None


def _norm_loc_token(value: str | None) -> str:
    text = sanitize_stored_value(value)
    if not text:
        return ""
    return _NON_ALNUM.sub("", text.lower())


def _zip_key(value: str | None) -> str:
    digits = re.sub(r"\D", "", sanitize_stored_value(value) or "")
    if len(digits) >= 5:
        return digits[:5]
    return digits


def _city_state_agree(base: PeopleLocationFields, other: PeopleLocationFields) -> bool:
    city = _norm_loc_token(base.city)
    state = _norm_loc_token(base.state)
    other_city = _norm_loc_token(other.city)
    other_state = _norm_loc_token(other.state)
    return bool(city and state and city == other_city and state == other_state)


def _zip_agree(base: PeopleLocationFields, other: PeopleLocationFields) -> bool:
    left = _zip_key(base.post_code)
    right = _zip_key(other.post_code)
    return bool(left and right and left == right)


def _streets_agree(base: PeopleLocationFields, other: PeopleLocationFields) -> bool:
    left = _norm_loc_token(base.address_line_1)
    right = _norm_loc_token(other.address_line_1)
    return bool(left and right and left == right)


def _locations_corroborate(base: PeopleLocationFields, other: PeopleLocationFields) -> bool:
    return _city_state_agree(base, other) or _zip_agree(base, other) or _streets_agree(base, other)


def _is_hard_address_source(source: str | None) -> bool:
    return source in {ADDRESS_SOURCE_CRM, ADDRESS_SOURCE_PAYMENT}


def _copy_location(loc: PeopleLocationFields) -> PeopleLocationFields:
    return PeopleLocationFields(
        address_line_1=sanitize_stored_value(loc.address_line_1),
        address_line_2=sanitize_stored_value(loc.address_line_2),
        city=sanitize_stored_value(loc.city),
        state=sanitize_stored_value(loc.state),
        post_code=sanitize_stored_value(loc.post_code),
        country=sanitize_stored_value(loc.country),
    )


def merge_people_location_fields(
    existing: PeopleLocationFields | None,
    donor_loc: PeopleLocationFields,
    from_transactions: PeopleLocationFields,
    from_identity: PeopleLocationFields,
    *,
    existing_source: str | None = None,
    identity_confidence: float | None = None,
) -> tuple[PeopleLocationFields, str | None]:
    """CRM/payment objects beat a stored people row. Identity fills gaps only when corroborated."""
    donor = _copy_location(donor_loc)
    payment = _copy_location(from_transactions)
    identity = _copy_location(from_identity)
    stored = _copy_location(existing) if existing else PeopleLocationFields()
    stored_source = sanitize_address_source(existing_source)

    if donor.has_street():
        chosen = donor
        source: str | None = ADDRESS_SOURCE_CRM
    elif payment.has_street():
        chosen = payment
        source = ADDRESS_SOURCE_PAYMENT
    elif donor.has_any():
        chosen = donor
        source = ADDRESS_SOURCE_CRM
    elif payment.has_any():
        chosen = payment
        source = ADDRESS_SOURCE_PAYMENT
    elif stored.has_any():
        chosen = stored
        source = stored_source
    else:
        chosen = PeopleLocationFields()
        source = None

    facts_are_hard = _is_hard_address_source(source)
    high_confidence = (
        identity_confidence is not None
        and identity_confidence >= IDENTITY_ADDRESS_MIN_CONFIDENCE
    )
    can_use_identity = facts_are_hard and high_confidence and _locations_corroborate(
        chosen, identity
    )

    if can_use_identity:
        if not chosen.address_line_1 and identity.address_line_1:
            chosen.address_line_1 = identity.address_line_1
            source = ADDRESS_SOURCE_RESEARCH
        if not chosen.address_line_2 and identity.address_line_2:
            chosen.address_line_2 = identity.address_line_2
        if not chosen.post_code and identity.post_code:
            chosen.post_code = identity.post_code
        if not chosen.city and identity.city:
            chosen.city = identity.city
        if not chosen.state and identity.state:
            chosen.state = identity.state
        if not chosen.country and identity.country:
            chosen.country = identity.country

    return chosen, source


def merge_people_work_fields(
    existing: PeopleWorkFields | None,
    from_identity: PeopleWorkFields,
) -> PeopleWorkFields:
    # Latest identity research wins so a namesake mis-tag can be corrected
    # on re-enrichment. Location still prefers CRM / payment facts.
    return PeopleWorkFields(
        profession=coalesce_loc_field(
            from_identity.profession,
            existing.profession if existing else None,
        ),
        employer=coalesce_loc_field(
            from_identity.employer,
            existing.employer if existing else None,
        ),
        job_title=coalesce_loc_field(
            from_identity.job_title,
            existing.job_title if existing else None,
        ),
        job_seniority=coalesce_loc_field(
            from_identity.job_seniority,
            existing.job_seniority if existing else None,
        ),
        job_industry=coalesce_loc_field(
            from_identity.job_industry,
            existing.job_industry if existing else None,
        ),
    )

