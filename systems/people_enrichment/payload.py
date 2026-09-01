from __future__ import annotations

from typing import Any

from .utils import sanitize_stored_value, trim_or_null


def _text(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    return trim_or_null(value)


def _location_dict(raw: Any) -> dict[str, str | None]:
    if not isinstance(raw, dict):
        return {}
    return {
        "address_line_1": _text(raw.get("address_line_1") or raw.get("line1")),
        "address_line_2": _text(raw.get("address_line_2") or raw.get("line2")),
        "city": _text(raw.get("city")),
        "state": _text(raw.get("state") or raw.get("region")),
        "post_code": _text(raw.get("post_code") or raw.get("postal_code") or raw.get("zip")),
        "country": _text(raw.get("country")),
    }


def parse_person_subject(payload: dict[str, Any] | None) -> dict[str, Any]:
    """Normalize a company-agnostic people-enrichment request."""
    if not payload:
        raise ValueError("Request body must include name or email")

    location = _location_dict(payload.get("location"))
    # Flat location fields are also accepted.
    for key in (
        "address_line_1",
        "address_line_2",
        "city",
        "state",
        "post_code",
        "country",
    ):
        if not location.get(key):
            location[key] = _text(payload.get(key))

    name = _text(payload.get("name") or payload.get("full_name"))
    first = _text(payload.get("first_name"))
    last = _text(payload.get("last_name"))
    if not name:
        name = " ".join(part for part in [first, last] if part).strip() or None

    email = _text(payload.get("email"))
    if email:
        email = email.lower()

    if not name and not email:
        raise ValueError("Request body must include name or email")

    extra_names = payload.get("also_known_as") or payload.get("aliases") or []
    if isinstance(extra_names, str):
        extra_names = [extra_names]
    aliases = [part for part in (_text(item) for item in extra_names) if part]

    addresses = payload.get("addresses") or []
    if isinstance(addresses, str):
        addresses = [addresses]
    extracted_addresses = [part for part in (_text(item) for item in addresses) if part]

    notes = sanitize_stored_value(payload.get("notes") if isinstance(payload.get("notes"), str) else None)

    return {
        "name": name,
        "email": email,
        "phone": _text(payload.get("phone")),
        "organization": _text(
            payload.get("organization")
            or payload.get("company")
            or payload.get("organization_name")
        ),
        "location": location,
        "aliases": aliases,
        "extracted_addresses": extracted_addresses,
        "notes": notes,
    }
