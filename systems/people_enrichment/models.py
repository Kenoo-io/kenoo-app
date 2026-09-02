from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any


ENRICHMENT_LLM_MODEL = (
    os.getenv("PEOPLE_ENRICHMENT_LLM_MODEL")
    or os.getenv("DONOR_ENRICHMENT_LLM_MODEL")
    or "gpt-4o-mini"
).strip() or "gpt-4o-mini"
ENRICHMENT_LLM_REASONING_EFFORT = (
    os.getenv("PEOPLE_ENRICHMENT_LLM_REASONING_EFFORT")
    or os.getenv("DONOR_ENRICHMENT_LLM_REASONING_EFFORT")
    or "medium"
).strip() or "medium"
ENRICHMENT_LLM_TIMEOUT_SECONDS = 180.0
MAX_SERPER_QUERIES = 8
MAX_SALARY_RESEARCH_QUERIES = 3
MAX_SCRAPE_URLS = 6
MAX_MARKDOWN_CHARS_PER_PAGE = 4500
SCRAPE_TIMEOUT_SECONDS = 20.0
MAX_PAYPAL_HTTP_PER_ENRICH = 14
MAX_TX_METADATA_ROWS = 40
PREFERRED_TX_STATUSES = frozenset({"completed", "succeeded", "paid"})
ADDRESS_SOURCE_CRM = "crm"
ADDRESS_SOURCE_PAYMENT = "payment"
ADDRESS_SOURCE_RESEARCH = "research"
ADDRESS_SOURCES = frozenset(
    {ADDRESS_SOURCE_CRM, ADDRESS_SOURCE_PAYMENT, ADDRESS_SOURCE_RESEARCH}
)
EMAIL_KIND_VALUES = frozenset({"personal", "business"})
# Consumer / ISP inboxes. Custom domains classify as business for Apollo.
PERSONAL_EMAIL_DOMAINS = frozenset(
    {
        "gmail.com",
        "googlemail.com",
        "yahoo.com",
        "yahoo.co.uk",
        "yahoo.ca",
        "yahoo.com.au",
        "yahoo.co.in",
        "ymail.com",
        "rocketmail.com",
        "hotmail.com",
        "hotmail.co.uk",
        "hotmail.fr",
        "hotmail.it",
        "hotmail.es",
        "outlook.com",
        "outlook.co.uk",
        "live.com",
        "live.co.uk",
        "msn.com",
        "icloud.com",
        "me.com",
        "mac.com",
        "aol.com",
        "aim.com",
        "protonmail.com",
        "proton.me",
        "pm.me",
        "tutanota.com",
        "tutamail.com",
        "gmx.com",
        "gmx.net",
        "gmx.de",
        "mail.com",
        "email.com",
        "zoho.com",
        "zohomail.com",
        "fastmail.com",
        "fastmail.fm",
        "hey.com",
        "yandex.com",
        "yandex.ru",
        "inbox.com",
        "mail.ru",
        "bk.ru",
        "qq.com",
        "163.com",
        "126.com",
        "sina.com",
        "naver.com",
        "daum.net",
        "comcast.net",
        "verizon.net",
        "att.net",
        "sbcglobal.net",
        "bellsouth.net",
        "cox.net",
        "charter.net",
        "earthlink.net",
        "optonline.net",
        "frontier.com",
        "juno.com",
        "netzero.net",
        "pacbell.net",
        "ameritech.net",
        "wowway.com",
        "sky.com",
        "btinternet.com",
        "virginmedia.com",
        "ntlworld.com",
        "rediffmail.com",
        "inbox.lv",
    }
)
# Street/ZIP from identity research must meet this bar and match city/state already on file.
IDENTITY_ADDRESS_MIN_CONFIDENCE = 0.8

# Prefer scraping pages from identifier-anchored searches over unanchored
# name/net-worth hits (which are usually the most famous namesake).
ANCHORED_SEARCH_LABELS = frozenset(
    {
        "email",
        "name_email",
        "name_address",
        "name_location",
        "name_org",
        "name_payment_metadata",
        "name_payment_metadata_email",
        "property",
        "property_tx",
    }
)


def scrape_url_sort_key(search_label: str, position: int, url: str) -> tuple[int, int, str]:
    anchored = 0 if search_label in ANCHORED_SEARCH_LABELS else 1
    return (anchored, position, url)


@dataclass
class PeopleLocationFields:
    address_line_1: str | None = None
    address_line_2: str | None = None
    city: str | None = None
    state: str | None = None
    post_code: str | None = None
    country: str | None = None

    def has_street(self) -> bool:
        return bool(self.address_line_1)

    def has_any(self) -> bool:
        return any(
            [
                self.address_line_1,
                self.address_line_2,
                self.city,
                self.state,
                self.post_code,
                self.country,
            ]
        )


JOB_SENIORITY_VALUES = frozenset(
    {
        "intern",
        "entry",
        "senior",
        "manager",
        "director",
        "vp",
        "c_level",
        "owner",
        "partner",
        "board",
        "other",
    }
)
JOB_SENIORITY_ALIASES = {
    "intern": "intern",
    "internship": "intern",
    "entry": "entry",
    "entry_level": "entry",
    "junior": "entry",
    "associate": "entry",
    "ic": "senior",
    "individual_contributor": "senior",
    "senior": "senior",
    "staff": "senior",
    "principal": "senior",
    "manager": "manager",
    "senior_manager": "manager",
    "head": "director",
    "director": "director",
    "senior_director": "director",
    "vp": "vp",
    "vice_president": "vp",
    "svp": "vp",
    "evp": "vp",
    "c_level": "c_level",
    "c_suite": "c_level",
    "clevel": "c_level",
    "csuite": "c_level",
    "executive": "c_level",
    "ceo": "c_level",
    "cfo": "c_level",
    "coo": "c_level",
    "cto": "c_level",
    "founder": "owner",
    "co_founder": "owner",
    "owner": "owner",
    "partner": "partner",
    "board": "board",
    "board_member": "board",
    "trustee": "board",
    "other": "other",
}

JOB_INDUSTRY_VALUES = frozenset(
    {
        "technology",
        "finance",
        "healthcare",
        "legal",
        "real_estate",
        "education",
        "government",
        "energy",
        "manufacturing",
        "retail",
        "hospitality",
        "media",
        "entertainment",
        "sports",
        "nonprofit",
        "construction",
        "agriculture",
        "transportation",
        "professional_services",
        "other",
    }
)
JOB_INDUSTRY_ALIASES = {
    "tech": "technology",
    "technology": "technology",
    "software": "technology",
    "it": "technology",
    "finance": "finance",
    "financial_services": "finance",
    "banking": "finance",
    "private_equity": "finance",
    "venture_capital": "finance",
    "insurance": "finance",
    "healthcare": "healthcare",
    "health": "healthcare",
    "medical": "healthcare",
    "pharma": "healthcare",
    "biotech": "healthcare",
    "legal": "legal",
    "law": "legal",
    "real_estate": "real_estate",
    "realty": "real_estate",
    "education": "education",
    "higher_education": "education",
    "government": "government",
    "public_sector": "government",
    "energy": "energy",
    "oil": "energy",
    "oil_and_gas": "energy",
    "manufacturing": "manufacturing",
    "retail": "retail",
    "ecommerce": "retail",
    "hospitality": "hospitality",
    "hotels": "hospitality",
    "media": "media",
    "journalism": "media",
    "entertainment": "entertainment",
    "sports": "sports",
    "nonprofit": "nonprofit",
    "non_profit": "nonprofit",
    "construction": "construction",
    "agriculture": "agriculture",
    "transportation": "transportation",
    "logistics": "transportation",
    "professional_services": "professional_services",
    "consulting": "professional_services",
    "other": "other",
}

INFLUENCE_CATEGORY_VALUES = frozenset(
    {
        "athlete",
        "musician",
        "actor",
        "artist",
        "politician",
        "media",
        "business_leader",
        "creator",
        "academic",
        "other",
    }
)
INFLUENCE_CATEGORY_ALIASES = {
    "athlete": "athlete",
    "sports": "athlete",
    "sport": "athlete",
    "basketball_player": "athlete",
    "football_player": "athlete",
    "musician": "musician",
    "singer": "musician",
    "rapper": "musician",
    "band": "musician",
    "actor": "actor",
    "actress": "actor",
    "film": "actor",
    "artist": "artist",
    "painter": "artist",
    "politician": "politician",
    "elected_official": "politician",
    "media": "media",
    "journalist": "media",
    "tv": "media",
    "business_leader": "business_leader",
    "executive": "business_leader",
    "founder": "business_leader",
    "creator": "creator",
    "influencer": "creator",
    "youtuber": "creator",
    "academic": "academic",
    "professor": "academic",
    "other": "other",
}

MARITAL_STATUS_VALUES = frozenset(
    {"single", "married", "partnered", "divorced", "widowed"}
)
MARITAL_STATUS_ALIASES = {
    "single": "single",
    "unmarried": "single",
    "married": "married",
    "wife": "married",
    "husband": "married",
    "spouse": "married",
    "partnered": "partnered",
    "domestic_partner": "partnered",
    "divorced": "divorced",
    "widowed": "widowed",
    "widow": "widowed",
    "widower": "widowed",
}

GENDER_VALUES = frozenset({"female", "male", "nonbinary"})
GENDER_ALIASES = {
    "female": "female",
    "woman": "female",
    "f": "female",
    "male": "male",
    "man": "male",
    "m": "male",
    "nonbinary": "nonbinary",
    "non_binary": "nonbinary",
    "nb": "nonbinary",
}

GENDER_SOURCE_VALUES = frozenset({"name", "research", "both"})
BIRTH_YEAR_SOURCE_VALUES = frozenset({"email", "research", "both"})
FAMOUS_NAMESAKE_LIKELIHOOD_VALUES = frozenset({"confirmed", "possible", "unlikely"})
FAMOUS_NAMESAKE_LIKELIHOOD_ALIASES = {
    "confirmed": "confirmed",
    "yes": "confirmed",
    "same_person": "confirmed",
    "possible": "possible",
    "likely": "possible",
    "maybe": "possible",
    "unlikely": "unlikely",
    "no": "unlikely",
    "not_the_same": "unlikely",
}
MAX_ENRICHMENT_SOURCES = 20
AGE_BRACKET_VALUES = frozenset(
    {"under_30", "30s", "40s", "50s", "60s", "70_plus"}
)
AGE_BRACKET_ALIASES = {
    "under_30": "under_30",
    "20s": "under_30",
    "twenties": "under_30",
    "30s": "30s",
    "thirties": "30s",
    "40s": "40s",
    "forties": "40s",
    "50s": "50s",
    "fifties": "50s",
    "60s": "60s",
    "sixties": "60s",
    "70_plus": "70_plus",
    "70s": "70_plus",
    "seventies": "70_plus",
    "80s": "70_plus",
}


@dataclass
class PeopleWorkFields:
    profession: str | None = None
    employer: str | None = None
    job_title: str | None = None
    job_seniority: str | None = None
    job_industry: str | None = None


@dataclass
class PeopleSignalFields:
    """Nurture and CRM-filter signals from identity research."""

    is_high_profile: bool | None = None
    owns_business: bool | None = None
    business_name: str | None = None
    influence_category: str | None = None
    influence_area: str | None = None
    marital_status: str | None = None
    spouse_name: str | None = None
    gender: str | None = None
    gender_source: str | None = None
    estimated_age_bracket: str | None = None
    birth_year: int | None = None
    has_children: bool | None = None
    alma_mater: str | None = None
    linkedin_url: str | None = None
    website_url: str | None = None
    facebook_url: str | None = None
    instagram_url: str | None = None
    x_url: str | None = None
    board_affiliations: str | None = None
    famous_namesake: str | None = None
    famous_namesake_likelihood: str | None = None
    high_profile_details: str | None = None
    identity_confidence_reasoning: str | None = None
    # True when this payload came from a full identity pass, so JSON null means
    # "no namesake" and must clear a stale CRM public-figure warning.
    namesake_researched: bool = False


@dataclass
class TransactionRow:
    amount_cents: int
    status: str
    raw_metadata: Any
    payment_provider: str | None = None
    provider_transaction_id: str | None = None


@dataclass
class SearchResult:
    label: str
    query: str
    data: dict[str, Any] | None


@dataclass
class OrganicUrlCandidate:
    url: str
    title: str
    snippet: str
    position: int
    search_label: str


@dataclass
class ScrapedPageResult:
    url: str
    title: str
    snippet: str
    search_label: str
    markdown: str | None
    scrape_error: str | None = None


@dataclass
class PageScrapeSynthesis:
    summary: str = ""
    identity_signals: list[str] = field(default_factory=list)
    financial_signals: list[str] = field(default_factory=list)
    likely_same_person: bool = False
    confidence_note: str = ""
    urls_that_appear_relevant: list[str] = field(default_factory=list)


@dataclass
class EnrichmentResult:
    success: bool = True
    overview: str | None = None
    confidence: str | None = None
    identity: str | None = None
    person: dict[str, Any] = field(default_factory=dict)
    searches_run: list[str] = field(default_factory=list)
    pages_scraped_ok: int = 0
    errors: int = 0
    error_messages: list[str] = field(default_factory=list)

    def record_error(self, message: str) -> None:
        self.errors += 1
        self.error_messages.append(message)

    def error_summary(self) -> str:
        if self.error_messages:
            summary = "; ".join(self.error_messages)
            return summary[:3997] + "..." if len(summary) > 4000 else summary
        return f"Enrichment finished with {self.errors} error(s)"

    def to_dict(self) -> dict[str, Any]:
        return {
            "success": self.success,
            "overview": self.overview,
            "confidence": self.confidence,
            "identity": self.identity,
            "person": self.person,
            "searches_run": self.searches_run,
            "pages_scraped_ok": self.pages_scraped_ok,
            "errors": self.errors,
            "error_messages": self.error_messages,
        }
