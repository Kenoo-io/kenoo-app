from __future__ import annotations

import sys
import unittest
from pathlib import Path

SYSTEMS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SYSTEMS_ROOT))

from people_enrichment.models import (  # noqa: E402
    ADDRESS_SOURCE_CRM,
    ADDRESS_SOURCE_PAYMENT,
    ADDRESS_SOURCE_RESEARCH,
    PeopleLocationFields,
)
from people_enrichment.people import merge_people_location_fields  # noqa: E402


class PeopleLocationMergeTests(unittest.TestCase):
    def test_payment_street_replaces_stored_research_address(self) -> None:
        loc, source = merge_people_location_fields(
            PeopleLocationFields(
                address_line_1="1 Celebrity Way",
                city="Los Angeles",
                state="CA",
                post_code="90001",
                country="US",
            ),
            PeopleLocationFields(),
            PeopleLocationFields(
                address_line_1="3822 Ammons Court",
                city="Kennesaw",
                state="GA",
                post_code="30152",
                country="US",
            ),
            PeopleLocationFields(address_line_1="1 Celebrity Way"),
            existing_source=ADDRESS_SOURCE_RESEARCH,
            identity_confidence=0.9,
        )
        self.assertEqual(loc.address_line_1, "3822 Ammons Court")
        self.assertEqual(loc.city, "Kennesaw")
        self.assertEqual(source, ADDRESS_SOURCE_PAYMENT)

    def test_crm_street_beats_payment(self) -> None:
        loc, source = merge_people_location_fields(
            None,
            PeopleLocationFields(
                address_line_1="50 Crm Blvd",
                city="Decatur",
                state="GA",
            ),
            PeopleLocationFields(
                address_line_1="3822 Ammons Court",
                city="Kennesaw",
                state="GA",
            ),
            PeopleLocationFields(),
        )
        self.assertEqual(loc.address_line_1, "50 Crm Blvd")
        self.assertEqual(source, ADDRESS_SOURCE_CRM)

    def test_rejects_uncorroborated_identity_street(self) -> None:
        loc, source = merge_people_location_fields(
            None,
            PeopleLocationFields(),
            PeopleLocationFields(),
            PeopleLocationFields(
                address_line_1="1 Celebrity Way",
                city="Los Angeles",
                state="CA",
                post_code="90001",
            ),
            identity_confidence=0.95,
        )
        self.assertIsNone(loc.address_line_1)
        self.assertIsNone(source)

    def test_fills_identity_street_when_city_state_agree_and_confidence_is_high(self) -> None:
        loc, source = merge_people_location_fields(
            None,
            PeopleLocationFields(city="Kennesaw", state="GA", country="US"),
            PeopleLocationFields(),
            PeopleLocationFields(
                address_line_1="3822 Ammons Court",
                address_line_2="Unit B",
                city="Kennesaw",
                state="GA",
                post_code="30152",
            ),
            identity_confidence=0.85,
        )
        self.assertEqual(loc.address_line_1, "3822 Ammons Court")
        self.assertEqual(loc.address_line_2, "Unit B")
        self.assertEqual(loc.post_code, "30152")
        self.assertEqual(source, ADDRESS_SOURCE_RESEARCH)

    def test_low_confidence_does_not_fill_identity_street(self) -> None:
        loc, source = merge_people_location_fields(
            None,
            PeopleLocationFields(city="Kennesaw", state="GA"),
            PeopleLocationFields(),
            PeopleLocationFields(
                address_line_1="3822 Ammons Court",
                city="Kennesaw",
                state="GA",
            ),
            identity_confidence=0.4,
        )
        self.assertIsNone(loc.address_line_1)
        self.assertEqual(source, ADDRESS_SOURCE_CRM)


if __name__ == "__main__":
    unittest.main()
