from __future__ import annotations

import logging
from typing import Any

import httpx

from .firecrawl import (
    format_page_scrape_synthesis_for_prompt,
    scrape_firecrawl_pages,
)
from .llm import analyze_financials, analyze_identity, generate_overview, synthesize_firecrawl_pages
from .models import (
    AGE_BRACKET_ALIASES,
    AGE_BRACKET_VALUES,
    EnrichmentResult,
    GENDER_ALIASES,
    GENDER_SOURCE_VALUES,
    GENDER_VALUES,
    INFLUENCE_CATEGORY_ALIASES,
    INFLUENCE_CATEGORY_VALUES,
    JOB_INDUSTRY_ALIASES,
    JOB_INDUSTRY_VALUES,
    JOB_SENIORITY_ALIASES,
    JOB_SENIORITY_VALUES,
    MARITAL_STATUS_ALIASES,
    MARITAL_STATUS_VALUES,
    MAX_ENRICHMENT_SOURCES,
    PeopleLocationFields,
    PeopleSignalFields,
    PeopleWorkFields,
    SearchResult,
)
from .payload import parse_person_subject
from .people import (
    apply_public_figure_notability_guard,
    merge_people_location_fields,
    merge_people_work_fields,
)
from .search_queries import (
    build_salary_research_queries,
    build_search_queries,
    location_fields_for_search,
)
from .serper import (
    format_search_results,
    pick_organic_urls_for_firecrawl,
    pick_property_listing_url,
    run_serper_searches,
)
from .utils import (
    annualize_salary_fields,
    email_kind_fields,
    resolve_ai_enrichment_confidence,
    resolve_allowed_value,
    resolve_birth_year,
    resolve_llm_bool,
    sanitize_facebook_url,
    sanitize_instagram_url,
    sanitize_linkedin_url,
    sanitize_property_listing_url,
    sanitize_stored_value,
    sanitize_website_url,
    sanitize_x_url,
    unique_http_urls,
    urls_from_llm_value,
)

logger = logging.getLogger(__name__)


def _format_location_line(loc: PeopleLocationFields) -> str:
    return ", ".join(
        part
        for part in [
            loc.address_line_1,
            loc.address_line_2,
            loc.city,
            loc.state,
            loc.post_code,
            loc.country,
        ]
        if sanitize_stored_value(part)
    )


def _round_money(value: Any) -> int | None:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return None
    if value != value:  # NaN
        return None
    return round(value)


def _salary_range(financial_data: dict[str, Any]) -> tuple[int | None, int | None]:
    low = _round_money(financial_data.get("est_salary_min"))
    high = _round_money(financial_data.get("est_salary_max"))
    if low is not None and high is not None and low > high:
        return high, low
    return low, high


def _collect_enrichment_sources(
    identity_data: dict[str, Any],
    page_scrape_synthesis: Any,
    extra_urls: list[str | None],
) -> list[str] | None:
    raw = urls_from_llm_value(identity_data.get("sources_used"))
    if page_scrape_synthesis is not None:
        raw.extend(page_scrape_synthesis.urls_that_appear_relevant)
    raw.extend(url for url in extra_urls if url)
    urls = unique_http_urls(raw, limit=MAX_ENRICHMENT_SOURCES)
    return urls or None


def _build_person_context(subject: dict[str, Any], loc: PeopleLocationFields) -> str:
    location_line = _format_location_line(loc)
    lines = [
        f"Name: {subject.get('name') or '(unknown)'}",
        f"Email: {subject.get('email') or '(none)'}",
        f"Phone: {subject.get('phone') or '(none)'}",
        f"Organization: {subject.get('organization') or '(none)'}",
        f"Location: {location_line or '(none)'}",
    ]
    aliases = subject.get("aliases") or []
    if aliases:
        lines.append(f"Also known as: {', '.join(aliases)}")
    extra_addresses = subject.get("extracted_addresses") or []
    if extra_addresses:
        lines.append(f"Additional addresses: {'; '.join(extra_addresses)}")
    if subject.get("notes"):
        lines.append(f"Notes: {subject['notes']}")
    return "\n".join(lines)


def _location_dataclass(raw: dict[str, str | None]) -> PeopleLocationFields:
    return PeopleLocationFields(
        address_line_1=sanitize_stored_value(raw.get("address_line_1")),
        address_line_2=sanitize_stored_value(raw.get("address_line_2")),
        city=sanitize_stored_value(raw.get("city")),
        state=sanitize_stored_value(raw.get("state")),
        post_code=sanitize_stored_value(raw.get("post_code")),
        country=sanitize_stored_value(raw.get("country")),
    )


def run_people_enrichment(
    http: httpx.Client,
    *,
    serper_api_key: str,
    openai_api_key: str,
    firecrawl_api_key: str | None,
    payload: dict[str, Any] | None,
) -> EnrichmentResult:
    subject = parse_person_subject(payload)
    result = EnrichmentResult()
    submitted_loc = _location_dataclass(subject["location"])
    full_name = subject["name"] or ""
    email = subject["email"]

    search_person = location_fields_for_search(
        {
            "address_line_1": submitted_loc.address_line_1,
            "address_line_2": submitted_loc.address_line_2,
            "city": submitted_loc.city,
            "state": submitted_loc.state,
            "post_code": submitted_loc.post_code,
            "organization_name": subject.get("organization"),
        },
        PeopleLocationFields(),
        None,
    )

    person_context = _build_person_context(subject, submitted_loc)

    queries = build_search_queries(
        full_name=full_name,
        email=email,
        donor=search_person,
        extracted_addresses=list(subject.get("extracted_addresses") or []),
        expanded_payment_search_names=list(subject.get("aliases") or []),
    )

    logger.info("Running %s Serper searches for %s", len(queries), full_name or email)
    search_results = run_serper_searches(
        http,
        serper_api_key,
        [(query.label, query.query) for query in queries],
    )
    formatted_searches = format_search_results(search_results)
    successful_searches = [item for item in search_results if item.data is not None]
    result.searches_run = [item.label for item in successful_searches]

    firecrawl_candidates = pick_organic_urls_for_firecrawl(search_results)
    firecrawl_pages = scrape_firecrawl_pages(http, firecrawl_api_key, firecrawl_candidates)
    result.firecrawl_pages_ok = len([page for page in firecrawl_pages if page.markdown])

    page_scrape_synthesis = synthesize_firecrawl_pages(
        http,
        openai_api_key,
        person_context,
        formatted_searches,
        firecrawl_pages,
    )
    page_scrape_context = format_page_scrape_synthesis_for_prompt(page_scrape_synthesis)

    identity_data = apply_public_figure_notability_guard(
        analyze_identity(
            http,
            openai_api_key,
            person_context,
            formatted_searches,
            page_scrape_context,
        )
    )

    salary_queries = build_salary_research_queries(
        donor=search_person,
        identity_data=identity_data,
    )
    salary_search_results: list[SearchResult] = []
    if salary_queries:
        logger.info("Running %s salary-research Serper searches", len(salary_queries))
        salary_search_results = run_serper_searches(
            http,
            serper_api_key,
            [(query.label, query.query) for query in salary_queries],
        )
        result.searches_run.extend(
            item.label for item in salary_search_results if item.data is not None
        )
    formatted_salary_searches = format_search_results(salary_search_results)

    from_identity_loc = PeopleLocationFields(
        address_line_1=sanitize_stored_value(identity_data.get("address_line_1")),
        address_line_2=sanitize_stored_value(identity_data.get("address_line_2")),
        city=sanitize_stored_value(identity_data.get("city")),
        state=sanitize_stored_value(identity_data.get("state")),
        post_code=sanitize_stored_value(identity_data.get("post_code")),
        country=sanitize_stored_value(identity_data.get("country")),
    )
    from_identity_work = PeopleWorkFields(
        profession=sanitize_stored_value(identity_data.get("profession")),
        employer=sanitize_stored_value(identity_data.get("employer")),
        job_title=sanitize_stored_value(identity_data.get("job_title")),
        job_seniority=resolve_allowed_value(
            identity_data.get("job_seniority"),
            JOB_SENIORITY_VALUES,
            JOB_SENIORITY_ALIASES,
        ),
        job_industry=resolve_allowed_value(
            identity_data.get("job_industry"),
            JOB_INDUSTRY_VALUES,
            JOB_INDUSTRY_ALIASES,
        ),
    )
    from_identity_signals = PeopleSignalFields(
        is_high_profile=resolve_llm_bool(identity_data.get("is_high_profile")),
        owns_business=resolve_llm_bool(identity_data.get("owns_business")),
        business_name=sanitize_stored_value(identity_data.get("business_name")),
        influence_category=resolve_allowed_value(
            identity_data.get("influence_category"),
            INFLUENCE_CATEGORY_VALUES,
            INFLUENCE_CATEGORY_ALIASES,
        ),
        influence_area=sanitize_stored_value(identity_data.get("influence_area")),
        marital_status=resolve_allowed_value(
            identity_data.get("marital_status"),
            MARITAL_STATUS_VALUES,
            MARITAL_STATUS_ALIASES,
        ),
        spouse_name=sanitize_stored_value(identity_data.get("spouse_name")),
        gender=resolve_allowed_value(
            identity_data.get("gender"), GENDER_VALUES, GENDER_ALIASES
        ),
        gender_source=resolve_allowed_value(
            identity_data.get("gender_source"), GENDER_SOURCE_VALUES
        ),
        estimated_age_bracket=resolve_allowed_value(
            identity_data.get("estimated_age_bracket"),
            AGE_BRACKET_VALUES,
            AGE_BRACKET_ALIASES,
        ),
        birth_year=resolve_birth_year(identity_data.get("birth_year")),
        has_children=resolve_llm_bool(identity_data.get("has_children")),
        alma_mater=sanitize_stored_value(identity_data.get("alma_mater")),
        linkedin_url=sanitize_linkedin_url(identity_data.get("linkedin_url")),
        website_url=sanitize_website_url(identity_data.get("website_url")),
        facebook_url=sanitize_facebook_url(identity_data.get("facebook_url")),
        instagram_url=sanitize_instagram_url(identity_data.get("instagram_url")),
        x_url=sanitize_x_url(identity_data.get("x_url") or identity_data.get("twitter_url")),
        board_affiliations=sanitize_stored_value(identity_data.get("board_affiliations")),
        famous_namesake=sanitize_stored_value(identity_data.get("famous_namesake")),
        famous_namesake_likelihood=sanitize_stored_value(
            identity_data.get("famous_namesake_likelihood")
        ),
        high_profile_details=sanitize_stored_value(identity_data.get("high_profile_details")),
        identity_confidence_reasoning=sanitize_stored_value(
            identity_data.get("confidence_reasoning")
        ),
        namesake_researched=True,
    )
    ai_enrichment_confidence = resolve_ai_enrichment_confidence(identity_data)

    financial_data = analyze_financials(
        http,
        openai_api_key,
        person_context,
        identity_data,
        formatted_searches,
        page_scrape_context,
        ai_enrichment_confidence,
        formatted_salary_searches,
    )
    est_salary = _round_money(financial_data.get("est_salary"))
    est_salary_min, est_salary_max = _salary_range(financial_data)
    salary_reasoning = sanitize_stored_value(
        financial_data.get("est_salary_reasoning")
        if isinstance(financial_data.get("est_salary_reasoning"), str)
        else None
    )
    est_salary, est_salary_min, est_salary_max, salary_reasoning = annualize_salary_fields(
        est_salary,
        est_salary_min,
        est_salary_max,
        salary_reasoning,
    )

    overview_text = generate_overview(
        http,
        openai_api_key,
        person_context,
        identity_data,
        financial_data,
        page_scrape_context,
        ai_enrichment_confidence,
    )

    merged_loc, address_source = merge_people_location_fields(
        None,
        submitted_loc,
        PeopleLocationFields(),
        from_identity_loc,
        identity_confidence=ai_enrichment_confidence,
    )
    merged_work = merge_people_work_fields(None, from_identity_work)

    est_property_value = _round_money(financial_data.get("est_property_value"))
    property_listing_url = (
        sanitize_property_listing_url(financial_data.get("property_listing_url"))
        or sanitize_property_listing_url(identity_data.get("property_listing_url"))
        or pick_property_listing_url(search_results)
    )
    enrichment_sources = _collect_enrichment_sources(
        identity_data,
        page_scrape_synthesis,
        [
            from_identity_signals.linkedin_url,
            from_identity_signals.website_url,
            from_identity_signals.facebook_url,
            from_identity_signals.instagram_url,
            from_identity_signals.x_url,
            property_listing_url,
        ],
    )

    result.overview = overview_text
    result.confidence = str(identity_data.get("confidence") or "low")
    result.identity = sanitize_stored_value(identity_data.get("most_likely_identity"))
    result.person = {
        "name": subject.get("name"),
        "email": email,
        **email_kind_fields(email),
        "phone": subject.get("phone"),
        "organization": subject.get("organization"),
        "address_line_1": merged_loc.address_line_1,
        "address_line_2": merged_loc.address_line_2,
        "city": merged_loc.city,
        "state": merged_loc.state,
        "post_code": merged_loc.post_code,
        "country": merged_loc.country,
        "address_source": address_source,
        "profession": merged_work.profession,
        "employer": merged_work.employer,
        "job_title": merged_work.job_title,
        "job_seniority": merged_work.job_seniority,
        "job_industry": merged_work.job_industry,
        "is_high_profile": from_identity_signals.is_high_profile,
        "owns_business": from_identity_signals.owns_business,
        "business_name": from_identity_signals.business_name,
        "influence_category": from_identity_signals.influence_category,
        "influence_area": from_identity_signals.influence_area,
        "marital_status": from_identity_signals.marital_status,
        "spouse_name": from_identity_signals.spouse_name,
        "gender": from_identity_signals.gender,
        "gender_source": from_identity_signals.gender_source,
        "estimated_age_bracket": from_identity_signals.estimated_age_bracket,
        "birth_year": from_identity_signals.birth_year,
        "has_children": from_identity_signals.has_children,
        "alma_mater": from_identity_signals.alma_mater,
        "linkedin_url": from_identity_signals.linkedin_url,
        "website_url": from_identity_signals.website_url,
        "facebook_url": from_identity_signals.facebook_url,
        "instagram_url": from_identity_signals.instagram_url,
        "x_url": from_identity_signals.x_url,
        "board_affiliations": from_identity_signals.board_affiliations,
        "famous_namesake": from_identity_signals.famous_namesake,
        "famous_namesake_likelihood": from_identity_signals.famous_namesake_likelihood,
        "high_profile_details": from_identity_signals.high_profile_details,
        "identity_confidence": ai_enrichment_confidence,
        "identity_confidence_reasoning": from_identity_signals.identity_confidence_reasoning,
        "est_salary": est_salary,
        "est_salary_min": est_salary_min,
        "est_salary_max": est_salary_max,
        "est_salary_reasoning": salary_reasoning,
        "est_property_value": est_property_value,
        "est_property_value_reasoning": sanitize_stored_value(
            financial_data.get("est_property_value_reasoning")
            if isinstance(financial_data.get("est_property_value_reasoning"), str)
            else None
        ),
        "property_listing_url": property_listing_url,
        "sources": enrichment_sources,
    }

    logger.info(
        "People enrichment finished — identity=%s, confidence=%s",
        result.identity,
        result.confidence,
    )
    return result
