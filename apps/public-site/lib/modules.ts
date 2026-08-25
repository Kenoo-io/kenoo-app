export type KenooModule = {
  id: string;
  name: string;
  headline: string;
  description: string;
};

/** Marketing angles, not a fixed app count. */
export const KENOO_MODULES: KenooModule[] = [
  {
    id: "business",
    name: "Business",
    headline: "Relationships, delivery, and growth",
    description:
      "CRM for pipeline and outreach, plus AdPilot for Meta Ads and Google Ads, so relationships and paid media stay in one rhythm with the rest of Kenoo.",
  },
  {
    id: "finance",
    name: "Finance",
    headline: "Money you can follow",
    description:
      "Invoices, cash flow, forecasts, and payouts designed to stay readable and easy to trust.",
  },
  {
    id: "health",
    name: "Health",
    headline: "Stay sharp for the work that matters",
    description:
      "A health monitor for meals, movement, and goals - so life balance stays visible and you’re not only optimizing output.",
  },
];
