from __future__ import annotations

import json
import logging
from typing import Any

import httpx

from .firecrawl import (
    format_firecrawl_pages_for_synthesis_prompt,
    format_page_scrape_synthesis_for_prompt,
    parse_page_scrape_synthesis,
)
from .models import (
    ENRICHMENT_LLM_MODEL,
    ENRICHMENT_LLM_REASONING_EFFORT,
    ENRICHMENT_LLM_TIMEOUT_SECONDS,
    FirecrawlPageResult,
    PageScrapeSynthesis,
)
from .utils import format_enrichment_research_as_of, truncate_for_prompt

logger = logging.getLogger(__name__)


def _is_reasoning_chat_model(model: str) -> bool:
    name = model.lower().strip()
    return name.startswith(("gpt-5", "o1", "o3", "o4"))


def openai_chat_request_body(
    messages: list[dict[str, str]],
    *,
    model: str = ENRICHMENT_LLM_MODEL,
    json_mode: bool = False,
) -> dict[str, Any]:
    body: dict[str, Any] = {
        "model": model,
        "messages": messages,
    }
    if json_mode:
        body["response_format"] = {"type": "json_object"}
    if _is_reasoning_chat_model(model):
        body["reasoning_effort"] = ENRICHMENT_LLM_REASONING_EFFORT
    else:
        body["temperature"] = 0.2
    return body


IDENTITY_RESOLUTION_GUIDE = """
Entity resolution (keep this practical, not timid):

- A shared first+last name is not identity. Famous people with common names
  dominate Google, knowledge graphs, and "net worth" pages. Treat those hits as
  a namesake hypothesis until person-specific facts corroborate or refute them.
- Corroboration: street address, city/metro that matches the notable person's
  known history, email/handle, phone, employer, distinctive middle name, or a
  unique property. Property value confirming that a house exists does not prove
  which person lives there.
- Disconfirmation: person city/metro with no credible public link to the notable
  person; an email local-part year that conflicts with a documented birth year;
  several other people with this name in the same area. Any one of these is
  enough to reject a celebrity match even if Wikipedia filled the SERP.
- Do not copy a notable person's occupation, business, salary, or net worth
  onto this subject unless you conclude they are the same person. If they might
  be, say so — but keep profession/employer/financials on the private
  individual until the match is real.
- is_high_profile is about THIS person, not whether a namesake is famous.
- School / university emails (.edu, .ac.uk, K-12, similar): the person has a
  campus account. They may be a student, faculty, staff, or alumni. Do not
  invent a CEO, owner, or other executive title from the name alone. If
  research is silent (no LinkedIn, department page, or career trail), guess
  student — not staff or professor — and a younger age bracket. That is a
  default, not proof. A department page, professor title, or long career
  overrides it. alma_mater may be this school when they look like a student
  or alum; employer may be this school when they look like faculty or staff.
  A four-digit year in a school email local-part (falter2009@lawnet.ucla.edu)
  is usually a class or graduation year, not a birth year. Do not store that
  token as birth_year. If they graduated that year, age follows from a normal
  college/law timeline — class of 2009 is not "born 2009" and is not under_30.
- influence_category / influence_area describe THIS person only when
  is_high_profile is true. A famous namesake's sport or genre is not copied.
- confidence / confidence_score is confidence that the identity fields describe
  this person, not confidence that you recognized a famous name.
- Notability bar (strict): a public figure / famous namesake is someone
  independently notable — Wikipedia or equivalent encyclopedia entry, repeated
  independent news coverage, elected office, pro sports/entertainment credits,
  a widely known executive, or a creator with a large audience (tens of
  thousands of followers on a major platform, typically 10,000+, plus some
  corroboration). Having a Facebook, Instagram, TikTok, or LinkedIn profile is
  not fame.
- Facebook/Meta "Digital creator", Instagram "creator", TikTok "creator", or
  similar profile badges are account types available to ordinary people. A
  badge plus tens or hundreds of followers is a private individual. Do not set
  famous_namesake, is_high_profile, or influence_category=creator for that.
- Leave famous_namesake JSON null unless the colliding person would be famous
  even if they had a different name. A   namesake who is "the subject's own thin
  social profile with an extra middle name" is not a famous namesake.
""".strip()


FINANCIAL_ESTIMATION_GUIDE = """
Salary estimates (research-backed, not timid and not invented):

- Conservative means grounded in Census, wage comps, occupation, and housing —
  not "assume a low number when the job is unknown." Missing profession is
  unknown income, not proof of poverty.
- People-search / consumer-file sites (CheckPeople, BeenVerified, Spokeo,
  National Public Data, Intelius, and similar) often print marketing income
  bands such as $30,000–$39,999. Those are modeled and frequently wrong. Do
  not copy them as salary unless a stronger source agrees.
- Gift or invoice size is not income. A $50 payment does not imply a $35k salary.
- A school / university email is not a salary. If identity still looks like a
  student (the default when a campus email has no career evidence), prefer
  little or no individual earned income, not metro household-median or
  executive comps. Faculty and staff have ordinary occupational wages when
  that is what the identity pass concluded. If occupation is unknown and the
  student default still holds, use a wide low individual range or household
  capacity from family/housing, and say which.
- Age alone is not a salary model. Peak-earning ages in high-cost metros
  usually earn far more than a national minimum-wage floor.
- Cross-check every salary against the property at the donor address and
  local Census figures. A ~$650k home in a NJ suburb with ~$110k median
  household income is inconsistent with a $30–40k individual salary unless
  you have a specific story (paid-off inherited house, spouse is the earner,
  renter, reverse mortgage). If those are only hypotheses, say so and do
  not report the low people-search band as the estimate.
- When occupation/title is known, prefer BLS / Glassdoor / Payscale / metro
  wage comps for that role. When occupation is unknown but city/state and
  housing are known, estimate likely household income (local median, adjusted
  toward housing value) and say it is household capacity, not a verified W-2.
- est_salary / est_salary_min / est_salary_max are ANNUAL USD. Glassdoor,
  university, and EU academic pages often list monthly pay (€2,400/month, $2,706
  /mo). Convert monthly × 12, weekly × 52, hourly × 2080 (full-time). A funded
  PhD or any full-time role is almost never ~$2–3k per year — that is a monthly
  listing. Never store monthly as annual.
- est_salary is the point estimate staff will score on: individual earned
  income when job evidence exists; otherwise household economic capacity
  consistent with location and housing. Use a wide min/max when evidence is
  thin. JSON null only when there is no location, housing, occupation, or
  credible wage evidence at all.
- Property value is the listing/Zestimate for that address. It does not prove
  the donor is the owner or the sole occupant.
- Do not use a famous namesake's net worth or salary unless identity analysis
  says this person is that namesake (famous_namesake_likelihood is confirmed).
""".strip()


def openai_chat(
    http: httpx.Client,
    api_key: str,
    messages: list[dict[str, str]],
    *,
    model: str = ENRICHMENT_LLM_MODEL,
    json_mode: bool = False,
) -> str | None:
    try:
        body: dict[str, Any] = openai_chat_request_body(
            messages, model=model, json_mode=json_mode
        )
        res = http.post(
            "https://api.openai.com/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json=body,
            timeout=ENRICHMENT_LLM_TIMEOUT_SECONDS,
        )
        if not res.is_success:
            logger.warning("OpenAI request failed: %s", res.text[:300])
            return None
        data = res.json()
        choices = data.get("choices") or []
        if not choices:
            return None
        return choices[0].get("message", {}).get("content")
    except Exception as exc:  # noqa: BLE001
        logger.warning("OpenAI request error: %s", exc)
        return None


def synthesize_firecrawl_pages(
    http: httpx.Client,
    api_key: str,
    donor_context: str,
    formatted_searches: str,
    pages: list[FirecrawlPageResult],
) -> PageScrapeSynthesis | None:
    ok_pages = [page for page in pages if page.markdown and page.markdown.strip()]
    if not ok_pages:
        return None

    raw = openai_chat(
        http,
        api_key,
        [
            {
                "role": "system",
                "content": (
                    "You synthesize full web page text (scraped markdown) for people "
                    "research. Compare page content to the known person facts. "
                    "Return compact, valid JSON only. Be skeptical: many URLs are false "
                    "positives for common names.\n\n"
                    f"{IDENTITY_RESOLUTION_GUIDE}"
                ),
            },
            {
                "role": "user",
                "content": (
                    "You are given (1) person facts, (2) Google search snippets we already "
                    "used, and (3) full-page markdown from Firecrawl for a few of those "
                    "result URLs.\n\n"
                    f"PERSON FACTS:\n{donor_context}\n\n"
                    f"SEARCH SNIPPETS (Serper — for context):\n"
                    f"{truncate_for_prompt(formatted_searches, 12_000)}\n\n"
                    f"FULL-PAGE MARKDOWN (Firecrawl):\n"
                    f"{format_firecrawl_pages_for_synthesis_prompt(pages)}\n\n"
                    "Return JSON:\n"
                    "{\n"
                    '  "summary": "2–5 sentences...",\n'
                    '  "identity_signals": ["..."],\n'
                    '  "financial_signals": ["..."],\n'
                    '  "likely_same_person": true or false,\n'
                    '  "confidence_note": "...",\n'
                    '  "urls_that_appear_relevant": ["..."]\n'
                    "}"
                ),
            },
        ],
        json_mode=True,
    )
    return parse_page_scrape_synthesis(raw)


def analyze_identity(
    http: httpx.Client,
    api_key: str,
    donor_context: str,
    formatted_searches: str,
    page_scrape_context: str,
) -> dict[str, Any]:
    raw = openai_chat(
        http,
        api_key,
        [
            {
                "role": "system",
                "content": (
                    "You are a people research analyst. "
                    "Your job is to analyze web search results and determine who a person "
                    "most likely is. Be accurate and use hedging language. "
                    "Always return valid JSON.\n\n"
                    f"{IDENTITY_RESOLUTION_GUIDE}"
                ),
            },
            {
                "role": "user",
                "content": (
                    "Analyze these web search results to identify who this person most likely is.\n\n"
                    f"PERSON DATA:\n{donor_context}\n\n"
                    f"WEB SEARCH RESULTS:\n{formatted_searches}\n\n"
                    "FULL-PAGE SCRAPE SYNTHESIS (Firecrawl markdown → model summary; "
                    "use together with snippets above):\n"
                    f"{page_scrape_context}\n\n"
                    "Return JSON with fields: most_likely_identity, profession, employer, "
                    "job_title, job_seniority, job_industry, "
                    "location, address_line_1, address_line_2, city, state, country, post_code, "
                    "is_high_profile, influence_category, influence_area, "
                    "high_profile_details, famous_namesake, famous_namesake_likelihood, "
                    "owns_business, business_name, "
                    "marital_status, spouse_name, has_children, "
                    "gender, gender_source, estimated_age_bracket, birth_year, "
                    "alma_mater, linkedin_url, website_url, facebook_url, instagram_url, "
                    "x_url, board_affiliations, property_listing_url, "
                    "confidence, confidence_score, "
                    "confidence_reasoning, sources_used.\n\n"
                    "famous_namesake: short label of a genuinely notable person who "
                    "shares this name (press, Wikipedia, pro sports/entertainment, "
                    "elected office, or a large verified audience), or JSON null if "
                    "none came up. Do not use this field for a Facebook/Instagram "
                    "digital-creator badge, a small personal following, or any other "
                    "ordinary social profile. "
                    "famous_namesake_likelihood: confirmed, possible, unlikely, or JSON "
                    "null. Use possible when a real celebrity match is not proven but is "
                    "still plausible enough that staff should know. Use unlikely when the "
                    "name collides with a real celebrity but person facts point at a "
                    "private individual. JSON null when there is no notable namesake.\n"
                    "Set is_high_profile true only when THIS person appears to be a "
                    "publicly notable person under the notability bar above "
                    "(famous_namesake_likelihood confirmed, or possible with "
                    "corroborating donor facts). A famous namesake alone is not enough. "
                    "A Meta/Facebook 'Digital creator' label or similar is never enough.\n"
                    "influence_category (only if is_high_profile is true): athlete, "
                    "musician, actor, artist, politician, media, business_leader, "
                    "creator, academic, or other. Use creator only for people with a "
                    "substantial public audience, not hobby posters. "
                    "influence_area: short specific label for filters and triggers, "
                    "e.g. basketball player, country singer, painter. JSON null if "
                    "is_high_profile is false.\n"
                    "job_title: current role title (e.g. Vice President of Sales). "
                    "job_seniority: intern, entry, senior, manager, director, vp, "
                    "c_level, owner, partner, board, or other. "
                    "job_industry: technology, finance, healthcare, legal, real_estate, "
                    "education, government, energy, manufacturing, retail, hospitality, "
                    "media, entertainment, sports, nonprofit, construction, agriculture, "
                    "transportation, professional_services, or other.\n"
                    "Set owns_business true only if the evidence shows this person founded "
                    "or owns a company, or holds an ownership-level role such as founder, "
                    "co-founder, owner, partner, or principal. Being employed somewhere is "
                    "not ownership. Put the company name in business_name when you can "
                    "name it. Do not attach a celebrity brand unless this person is that "
                    "celebrity.\n"
                    "marital_status: single, married, partnered, divorced, or widowed — "
                    "only from evidence (property records naming a spouse, obituaries, "
                    "wedding coverage, a bio). Do not guess from the first name. "
                    "spouse_name: the other adult named at the same household when that "
                    "looks like a spouse or partner, else JSON null.\n"
                    "has_children: true/false only if public evidence says so; otherwise "
                    "JSON null.\n"
                    "gender: female, male, or nonbinary. Predict from the given first "
                    "name when research is silent. gender_source: name, research, or "
                    "both. Prefer research (pronouns, bio) when it exists.\n"
                    "estimated_age_bracket: under_30, 30s, 40s, 50s, 60s, or 70_plus "
                    "only from graduation years, career length, or similar clues. A "
                    "school email with no career evidence is a weak default of under_30 "
                    "(guess student), not a birth date — never invent a birth date.\n"
                    "birth_year: four-digit year of birth only from evidence (a bio "
                    "or obituary). Store the year, never a computed age. JSON null if "
                    "unsure. On a school/university email, a local-part year is a class "
                    "or graduation year unless a bio independently states that birth "
                    "year — never copy it into birth_year. Do not treat a random number "
                    "in any email as a birth year when it could be a graduation year "
                    "or junk.\n"
                    "alma_mater: college/university if clearly this person. "
                    "linkedin_url: full https LinkedIn /in/ URL if it appears to be "
                    "this person, else JSON null. "
                    "website_url: personal or professional homepage for THIS person. "
                    "facebook_url, instagram_url, x_url: full https profile URLs only if "
                    "they appear to be this person, else JSON null. "
                    "instagram_url must be a profile handle "
                    "(https://instagram.com/username). Never store Instagram search, "
                    "popular, explore, tag, or post URLs such as "
                    "/popular/name or /p/shortcode. "
                    "board_affiliations: short list of boards or nonprofit roles for this "
                    "person, else JSON null. "
                    "property_listing_url: Zillow/Redfin/Realtor URL for the person's "
                    "address when found, else JSON null. "
                    "sources_used: array of source URLs that actually support this "
                    "identity, not famous-namesake hits.\n\n"
                    "IMPORTANT: For any field you cannot determine, use JSON null. "
                    "Never use placeholder strings like 'Unknown', 'N/A', or 'None'."
                ),
            },
        ],
        json_mode=True,
    )
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def analyze_financials(
    http: httpx.Client,
    api_key: str,
    donor_context: str,
    identity_data: dict[str, Any],
    formatted_searches: str,
    page_scrape_context: str,
    ai_enrichment_confidence: float | None,
    formatted_salary_searches: str = "",
) -> dict[str, Any]:
    research_as_of = format_enrichment_research_as_of()
    confidence_label = identity_data.get("confidence", "unknown")
    confidence_score_note = (
        f" (score {ai_enrichment_confidence} on 0–1)"
        if ai_enrichment_confidence is not None
        else ""
    )
    raw = openai_chat(
        http,
        api_key,
        [
            {
                "role": "system",
                "content": (
                    "You are a financial research analyst. Estimate financial data for a "
                    "person profile based on web search results. Be conservative and grounded "
                    "in real-world salary/property data. Always return valid JSON.\n\n"
                    f"{IDENTITY_RESOLUTION_GUIDE}\n\n"
                    f"{FINANCIAL_ESTIMATION_GUIDE}"
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Estimate financial information for this person based on available data.\n\n"
                    f"{research_as_of}\n\n"
                    f"PERSON DATA:\n{donor_context}\n\n"
                    f"IDENTITY ANALYSIS:\n{json.dumps(identity_data, indent=2)}\n\n"
                    f"PROPERTY AND PERSON SEARCH RESULTS:\n{formatted_searches}\n\n"
                    "LOCAL INCOME AND WAGE RESEARCH (Census/metro comps for the person's "
                    "city — not a people-search profile of this person):\n"
                    f"{formatted_salary_searches or '(no dedicated local-income search)'}\n\n"
                    f"FULL-PAGE SCRAPE SYNTHESIS:\n{page_scrape_context}\n\n"
                    f"Identity confidence is {confidence_label}{confidence_score_note}.\n\n"
                    "Return JSON with est_salary, est_salary_min, est_salary_max, "
                    "est_salary_reasoning, est_property_value, est_property_value_reasoning, "
                    "property_listing_url, financial_notes.\n\n"
                    "est_salary, est_salary_min, and est_salary_max must be ANNUAL USD "
                    "(convert monthly × 12). "
                    "Use LOCAL INCOME AND WAGE RESEARCH plus property value when "
                    "occupation is missing. Reject people-search income bands that "
                    "conflict with Census medians or housing. "
                    "est_salary_min / est_salary_max: a range around the point "
                    "estimate (wider when evidence is thin), JSON null if you cannot "
                    "estimate. "
                    "est_salary_reasoning must describe the ANNUAL USD figure staff "
                    "will see, and say household vs individual. Never call a monthly "
                    "stipend 'per year'. "
                    "est_property_value_reasoning: one or two sentences grounded in "
                    "the listing evidence. "
                    "property_listing_url: Zillow/Redfin/Realtor URL for the person "
                    "address if present in the search results, else JSON null.\n\n"
                    "Use JSON null for any numeric field you cannot estimate — "
                    "never use placeholder strings."
                ),
            },
        ],
        json_mode=True,
    )
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return {}


def generate_overview(
    http: httpx.Client,
    api_key: str,
    donor_context: str,
    identity_data: dict[str, Any],
    financial_data: dict[str, Any],
    page_scrape_context: str,
    ai_enrichment_confidence: float | None,
) -> str:
    research_as_of = format_enrichment_research_as_of()
    confidence_reasoning = identity_data.get("confidence_reasoning")
    raw = openai_chat(
        http,
        api_key,
        [
            {
                "role": "system",
                "content": (
                    "You write professional people-profile overviews for internal research. "
                    "Write factually, use hedging language, and keep it suitable "
                    "for internal team use. Write in third person.\n\n"
                    f"{IDENTITY_RESOLUTION_GUIDE}"
                ),
            },
            {
                "role": "user",
                "content": (
                    "Write a 2–3 paragraph person profile overview based on the research below.\n\n"
                    f"{research_as_of}\n\n"
                    f"PERSON DATA:\n{donor_context}\n\n"
                    f"IDENTITY ANALYSIS:\n{json.dumps(identity_data, indent=2)}\n\n"
                    f"FINANCIAL ANALYSIS:\n{json.dumps(financial_data, indent=2)}\n\n"
                    f"FULL-PAGE SCRAPE SYNTHESIS:\n{page_scrape_context}\n\n"
                    f"Categorical label: {identity_data.get('confidence', 'unknown')}\n"
                    f"Numeric score: {ai_enrichment_confidence if ai_enrichment_confidence is not None else 'unknown'}\n"
                    f"{f'- Reasoning: {confidence_reasoning}' if confidence_reasoning else ''}\n\n"
                    "If PERSON DATA includes optional notes or context, treat those as "
                    "hints, not proof.\n"
                    "If identity analysis includes a famous_namesake, mention them and "
                    "whether this person appears to be that namesake (confirmed / possible / "
                    "unlikely). Do not invent a namesake. Do not describe a small social "
                    "account or Facebook/Instagram 'creator' badge as a public figure. "
                    "Do not describe the subject as that celebrity unless identity "
                    "analysis says so.\n"
                    "When known, weave in job title/seniority, influence area, household "
                    "status, and school — without turning the overview into a spec sheet.\n"
                    "Follow FINANCIAL ANALYSIS for income: do not repeat a people-search "
                    "income band that the salary reasoning rejected.\n"
                    "Write only the paragraph text — no headers, no JSON, no bullet points."
                ),
            },
        ],
        json_mode=False,
    )
    return (
        raw
        or "Enrichment was completed but the narrative overview could not be generated."
    )
