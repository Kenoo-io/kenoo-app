export type PricingTier = {
  name: string;
  price: string;
  blurb: string;
  features: string[];
  featured?: boolean;
};

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Starter",
    price: "$49",
    blurb: "For small teams getting started with a shared workspace.",
    features: ["Business suite", "AI assist (core)", "Up to 5 seats"],
  },
  {
    name: "Growth",
    price: "$149",
    blurb: "For teams that need the full platform across every angle.",
    features: [
      "Everything in Starter",
      "Finance suite",
      "Health suite",
      "Priority support",
      "Up to 25 seats",
    ],
    featured: true,
  },
  {
    name: "Scale",
    price: "Custom",
    blurb: "For larger organizations with advanced requirements.",
    features: [
      "Everything in Growth",
      "SSO & advanced roles",
      "Dedicated success",
      "Custom integrations",
      "Unlimited seats",
    ],
  },
];
