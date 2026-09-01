from __future__ import annotations

import unittest
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import Mock

import sys

SYSTEMS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SYSTEMS_ROOT))

from people_enrichment.firecrawl import reset_firecrawl_skip_for_tests, scrape_firecrawl_pages
from people_enrichment.models import OrganicUrlCandidate, PeopleLocationFields, PeopleWorkFields
from people_enrichment.payload import parse_person_subject
from people_enrichment.people import (
    apply_public_figure_notability_guard,
    merge_people_work_fields,
)
from people_enrichment.search_queries import (
    build_salary_research_queries,
    build_search_queries,
    location_fields_for_search,
)
from people_enrichment.utils import (
    annualize_salary_fields,
    birth_year_fields,
    birth_year_from_email,
    classify_email_kind,
    email_kind_fields,
    email_local_part_year_tokens,
    is_school_email_domain,
)


class EmailYearTokenTests(unittest.TestCase):
    def test_reads_plausible_years_from_local_part(self) -> None:
        now = datetime(2026, 8, 24, tzinfo=UTC)
        self.assertEqual(
            email_local_part_year_tokens("jessicasimpson1981@gmail.com", now=now),
            [1981],
        )

    def test_ignores_future_and_non_year_digits(self) -> None:
        now = datetime(2026, 8, 24, tzinfo=UTC)
        self.assertEqual(email_local_part_year_tokens("donor2099@gmail.com", now=now), [])
        self.assertEqual(email_local_part_year_tokens("user1234@gmail.com", now=now), [])

    def test_two_digit_suffix_after_a_letter_is_a_birth_year(self) -> None:
        now = datetime(2026, 8, 24, tzinfo=UTC)
        self.assertEqual(
            birth_year_from_email("samathacarl81@gmail.com", now=now),
            1981,
        )

    def test_school_email_year_is_graduation_not_birth_year(self) -> None:
        now = datetime(2026, 8, 24, tzinfo=UTC)
        email = "falter2009@lawnet.ucla.edu"
        self.assertEqual(email_local_part_year_tokens(email, now=now), [2009])
        self.assertIsNone(birth_year_from_email(email, now=now))
        self.assertEqual(birth_year_fields(email, 2009, now=now), {})


class EmailKindTests(unittest.TestCase):
    def test_consumer_inboxes_are_personal(self) -> None:
        self.assertEqual(classify_email_kind("Ada@Gmail.com"), "personal")
        self.assertEqual(classify_email_kind("ada@icloud.com"), "personal")

    def test_custom_domains_are_business(self) -> None:
        self.assertEqual(classify_email_kind("ada@acmecorp.com"), "business")
        self.assertEqual(
            email_kind_fields("ada@acmecorp.com"),
            {"email_domain": "acmecorp.com", "email_kind": "business"},
        )


class SchoolEmailDomainTests(unittest.TestCase):
    def test_university_and_k12_domains_are_school_accounts(self) -> None:
        self.assertTrue(is_school_email_domain("ada@duke.edu"))
        self.assertTrue(is_school_email_domain("ada@cs.ox.ac.uk"))

    def test_consumer_and_company_domains_are_not_school_accounts(self) -> None:
        self.assertFalse(is_school_email_domain("ada@gmail.com"))
        self.assertFalse(is_school_email_domain("ada@acmecorp.com"))


class SearchQueryOrderTests(unittest.TestCase):
    def test_location_from_payments_is_used_when_crm_address_is_empty(self) -> None:
        donor = location_fields_for_search(
            {
                "address_line_1": None,
                "city": None,
                "state": None,
                "post_code": None,
                "organization_name": None,
            },
            PeopleLocationFields(
                address_line_1="3822 Ammons Court",
                city="Kennesaw",
                state="GA",
                post_code="30152",
                country="US",
            ),
            None,
        )
        queries = build_search_queries(
            full_name="Jessica Simpson",
            email="jessicasimpson1981@gmail.com",
            donor=donor,
            extracted_addresses=["3822 Ammons Court, Kennesaw, GA, 30152"],
            expanded_payment_search_names=[],
        )
        labels = [query.label for query in queries]
        self.assertEqual(labels[0], "name_email")
        self.assertIn("name_location", labels)
        self.assertIn("name_address", labels)
        self.assertLess(labels.index("name_location"), labels.index("name"))

    def test_unanchored_name_search_is_still_included(self) -> None:
        queries = build_search_queries(
            full_name="Jessica Simpson",
            email=None,
            donor={"city": "Kennesaw", "state": "GA"},
            extracted_addresses=[],
            expanded_payment_search_names=[],
        )
        self.assertIn("name", [query.label for query in queries])


class SalaryResearchQueryTests(unittest.TestCase):
    def test_local_income_search_uses_city_without_the_person_name(self) -> None:
        queries = build_salary_research_queries(
            donor={"city": "Totowa", "state": "NJ"},
            identity_data={},
        )
        labels = [query.label for query in queries]
        self.assertIn("local_income", labels)
        for query in queries:
            self.assertNotIn("Zuniga", query.query)

    def test_identity_city_and_job_title_drive_wage_comps(self) -> None:
        queries = build_salary_research_queries(
            donor={"city": None, "state": None},
            identity_data={
                "city": "Atlanta",
                "state": "GA",
                "job_title": "Director of Sales",
            },
        )
        occupation = next(
            query.query for query in queries if query.label == "occupation_salary"
        )
        self.assertIn("Director of Sales", occupation)
        self.assertIn("Atlanta", occupation)

    def test_skips_salary_research_without_location_or_occupation(self) -> None:
        queries = build_salary_research_queries(donor={}, identity_data={})
        self.assertEqual(queries, [])


class AnnualSalaryNormalizationTests(unittest.TestCase):
    def test_monthly_stipend_copied_as_yearly_is_annualized(self) -> None:
        est, low, high, reasoning = annualize_salary_fields(
            2_706,
            2_500,
            2_900,
            "Glassdoor lists about $2706 per year for a PhD candidate in Vienna.",
        )
        self.assertEqual(est, 32_472)
        self.assertEqual(low, 30_000)
        self.assertEqual(high, 34_800)
        self.assertIn("$32,472/yr", reasoning or "")


class WorkFieldMergeTests(unittest.TestCase):
    def test_new_identity_overwrites_stale_celebrity_profession(self) -> None:
        merged = merge_people_work_fields(
            PeopleWorkFields(profession="Singer, Actress, Fashion Designer"),
            PeopleWorkFields(profession="Realtor"),
        )
        self.assertEqual(merged.profession, "Realtor")


class PublicFigureNotabilityGuardTests(unittest.TestCase):
    def test_drops_facebook_digital_creator_namesake(self) -> None:
        cleaned = apply_public_figure_notability_guard(
            {
                "famous_namesake": "Reydavid Valencia Garcia",
                "famous_namesake_likelihood": "possible",
                "is_high_profile": True,
                "influence_category": "creator",
                "influence_area": "digital creator",
                "high_profile_details": (
                    "A Facebook profile lists Reydavid Valencia Garcia as a "
                    "digital creator. There is no corroboration with the donor address."
                ),
                "confidence_reasoning": (
                    "The donor appears to be a private individual without "
                    "significant public presence."
                ),
            }
        )
        self.assertIsNone(cleaned["famous_namesake"])
        self.assertIs(cleaned["is_high_profile"], False)

    def test_keeps_real_celebrity_namesake_collision(self) -> None:
        payload = {
            "famous_namesake": "Jessica Simpson",
            "famous_namesake_likelihood": "unlikely",
            "is_high_profile": False,
            "high_profile_details": (
                "Not the pop star; Wikipedia and Billboard coverage is a namesake."
            ),
        }
        self.assertEqual(apply_public_figure_notability_guard(payload), payload)


class FirecrawlCreditSkipTests(unittest.TestCase):
    def setUp(self) -> None:
        reset_firecrawl_skip_for_tests()
        self.candidate = OrganicUrlCandidate(
            url="https://example.com/a",
            title="A",
            snippet="",
            position=1,
            search_label="name_email",
        )

    def tearDown(self) -> None:
        reset_firecrawl_skip_for_tests()

    def test_payment_error_skips_later_jobs(self) -> None:
        response = Mock()
        response.is_success = False
        response.status_code = 402
        response.reason_phrase = "Payment Required"
        response.json.return_value = {"success": False, "error": "Insufficient credits"}
        http = Mock()
        http.post.return_value = response

        first = scrape_firecrawl_pages(http, "fc-key", [self.candidate])
        self.assertEqual(first[0].scrape_error, "FIRECRAWL credits exhausted")
        second = scrape_firecrawl_pages(http, "fc-key", [self.candidate])
        self.assertEqual(second[0].scrape_error, "FIRECRAWL credits exhausted")
        self.assertEqual(http.post.call_count, 1)


class PersonSubjectParseTests(unittest.TestCase):
    def test_requires_name_or_email(self) -> None:
        with self.assertRaises(ValueError):
            parse_person_subject({"organization": "Acme"})

    def test_accepts_nested_location_and_aliases(self) -> None:
        subject = parse_person_subject(
            {
                "name": "Jane Doe",
                "email": "Jane@Acme.com",
                "organization": "Acme",
                "location": {"city": "Austin", "state": "TX"},
                "also_known_as": ["J. Doe"],
            }
        )
        self.assertEqual(subject["email"], "jane@acme.com")
        self.assertEqual(subject["location"]["city"], "Austin")
        self.assertEqual(subject["aliases"], ["J. Doe"])


if __name__ == "__main__":
    unittest.main()
