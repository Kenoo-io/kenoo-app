/**
 * Polished Kenoo apps surfaced on the marketing site.
 * Icon URLs match the Supabase `apps.kenoo_icon_urls` column.
 */

export type FeaturedProductFeature = {
  title: string;
  description: string;
};

export type CapabilityFeatureIcon =
  | "link"
  | "megaphone"
  | "wallet"
  | "shield"
  | "sparkles"
  | "layers"
  | "users"
  | "building"
  | "handshake"
  | "mail"
  | "activity"
  | "utensils"
  | "target"
  | "heart";

export type CapabilitySection = {
  title: string;
  description: string;
  /** Which hovering product-UI mock to render beside the copy. */
  visual:
    | "adpilot-performance"
    | "adpilot-automation"
    | "adpilot-preview"
    | "crm-pipeline"
    | "crm-outreach"
    | "health-energy"
    | "health-meals";
  features: {
    title: string;
    description: string;
    icon: CapabilityFeatureIcon;
  }[];
};

export type FeaturedProduct = {
  slug: "adpilot" | "crm" | "health";
  name: string;
  tagline: string;
  description: string;
  /** Longer overview for the product landing page. */
  overview: string;
  icon: string;
  /** Live product subdomain URL. */
  appHref: string;
  accent: string;
  accentSoft: string;
  features: FeaturedProductFeature[];
  /** Alternating capability blocks below the hero. */
  capabilitySections: CapabilitySection[];
};

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kenoo.io";

function appUrl(subdomain: string) {
  return `https://${subdomain}.${ROOT_DOMAIN}`;
}

export const FEATURED_PRODUCT_SLUGS = ["adpilot", "crm", "health"] as const;

export const FEATURED_PRODUCTS: FeaturedProduct[] = [
  {
    slug: "adpilot",
    name: "AdPilot",
    tagline: "Paid media, under control",
    description:
      "Plan, launch, and optimize paid media across Meta Ads and Google Ads. Centralize ad accounts, campaigns, spend, and performance in one workspace.",
    overview:
      "AdPilot is Kenoo’s advertising operations app for teams that run Meta Ads and Google Ads. Connect your ad accounts, sync campaigns and ad sets, monitor spend and performance, and apply budget automation with clear previews and controls, so media work stays visible and accountable.",
    icon: "https://assest.kenoo.io/app-icons/adpilot.png",
    appHref: appUrl("adpilot"),
    accent: "#0b6eff",
    accentSoft: "rgba(11,110,255,0.12)",
    features: [
      {
        title: "Account connections",
        description:
          "Connect Meta Ads and Google Ads accounts with OAuth. Accessible advertiser accounts sync into your Kenoo workspace with clear ownership.",
      },
      {
        title: "Campaigns & creatives",
        description:
          "Browse Meta Ads and Google Ads campaigns, ad sets, and creatives the way media teams think: organized, searchable, and tied to performance.",
      },
      {
        title: "Spend & budgets",
        description:
          "See budgets, spend, and delivery in one view instead of jumping between platform UIs and spreadsheets.",
      },
      {
        title: "Automation with guardrails",
        description:
          "Preview or apply budget rules and agent instructions. Changes stay understandable before anything goes live.",
      },
      {
        title: "Workspace access control",
        description:
          "Connected advertiser data lives as Customer Content in the Kenoo workspace that completed the connection, subject to that workspace’s permissions.",
      },
      {
        title: "Part of Kenoo",
        description:
          "AdPilot sits alongside CRM, projects, and finance so advertising is part of how the business runs, not a disconnected silo.",
      },
    ],
    capabilitySections: [
      {
        title: "See spend and performance in one place",
        description:
          "Track Meta Ads and Google Ads side by side—spend, clicks, purchases, and ROAS—so media decisions stay grounded in what actually moved.",
        visual: "adpilot-performance",
        features: [
          {
            icon: "wallet",
            title: "Spend & budgets",
            description:
              "Budgets, delivery, and spend in one view instead of platform hopscotch.",
          },
          {
            icon: "megaphone",
            title: "Campaigns & creatives",
            description:
              "Campaigns, ad sets, and creatives organized the way media teams think.",
          },
          {
            icon: "layers",
            title: "Cross-platform reporting",
            description:
              "Impressions, CTR, purchases, and ROAS without exporting to sheets.",
          },
          {
            icon: "link",
            title: "Account connections",
            description:
              "OAuth into Meta Ads and Google Ads with clear ownership in Kenoo.",
          },
        ],
      },
      {
        title: "Set guardrails that match real margins",
        description:
          "Use stop-loss floors or true break-even ROAS from profit kept per sale—then choose whether AdPilot pauses, alerts, or both.",
        visual: "adpilot-automation",
        features: [
          {
            icon: "target",
            title: "ROAS floors & alerts",
            description:
              "Stop campaigns or email the team when floors are breached.",
          },
          {
            icon: "shield",
            title: "Budget bounds",
            description:
              "Hard min/max daily budgets the algorithm may not exceed.",
          },
          {
            icon: "sparkles",
            title: "Learning protection",
            description:
              "Block price adjustments while campaigns are still learning.",
          },
          {
            icon: "layers",
            title: "Workspace presets",
            description:
              "Start from Balanced ROAS or customize aggressiveness per entity.",
          },
        ],
      },
      {
        title: "Preview every budget decision first",
        description:
          "Dry-run the next AdPilot move—see the proposed daily budget, confidence, and why—before anything touches Meta or Google.",
        visual: "adpilot-preview",
        features: [
          {
            icon: "sparkles",
            title: "Generate preview",
            description:
              "Dry-run the next budget decision—nothing applies yet.",
          },
          {
            icon: "shield",
            title: "Automation with guardrails",
            description:
              "Apply only after you review the decision and reason.",
          },
          {
            icon: "megaphone",
            title: "Agent instructions",
            description:
              "Add guidance on top of presets for this campaign or ad set.",
          },
          {
            icon: "layers",
            title: "Part of Kenoo",
            description:
              "Ads sit next to CRM and finance—not in a disconnected silo.",
          },
        ],
      },
    ],
  },
  {
    slug: "crm",
    name: "CRM",
    tagline: "Relationships that stay in motion",
    description:
      "Manage people, companies, deals, and outbound at scale. Lead tracking, sequences, pitches, and pipeline, centralized for talent, brands, and partners.",
    overview:
      "Kenoo CRM is built for operators who live in relationships. Track people and companies, move deals through clear stages, run outreach sequences, and keep pitches and follow-ups tied to the right account, without losing the human thread.",
    icon: "https://assest.kenoo.io/app-icons/crm.png",
    appHref: appUrl("crm"),
    accent: "#0066b2",
    accentSoft: "rgba(0,102,178,0.12)",
    features: [
      {
        title: "People & companies",
        description:
          "A clear record of every relationship: roles, history, and next steps connected to accounts, not a disconnected contact dump.",
      },
      {
        title: "Pipeline & deals",
        description:
          "Stages that stay readable so wins and blockers are never buried, with deals linked to the work that closes them.",
      },
      {
        title: "Sequences & outreach",
        description:
          "Structured follow-ups that stay human, with drafts and pitches tied to the right account.",
      },
      {
        title: "Email that belongs to the CRM",
        description:
          "Connect Gmail when you need inbox context, sequences, and delivery without leaving the relationship record.",
      },
    ],
    capabilitySections: [
      {
        title: "Keep relationships and deals in motion",
        description:
          "People, companies, and pipeline stages stay linked—so the next step is obvious and wins never get buried in a spreadsheet.",
        visual: "crm-pipeline",
        features: [
          {
            icon: "users",
            title: "People & companies",
            description:
              "Roles, history, and next steps connected to accounts—not a contact dump.",
          },
          {
            icon: "handshake",
            title: "Pipeline & deals",
            description:
              "Readable stages with deals tied to the work that closes them.",
          },
          {
            icon: "building",
            title: "Account context",
            description:
              "Every pitch and follow-up stays attached to the right company.",
          },
          {
            icon: "activity",
            title: "Interaction history",
            description:
              "See recent deals and touchpoints without hunting across tools.",
          },
        ],
      },
      {
        title: "Outreach that still sounds human",
        description:
          "Draft sequences and pitches with AI assist, then send from the same workspace where the relationship already lives.",
        visual: "crm-outreach",
        features: [
          {
            icon: "mail",
            title: "Sequences & outreach",
            description:
              "Structured follow-ups that stay human, tied to the right account.",
          },
          {
            icon: "sparkles",
            title: "AI email writer",
            description:
              "Generate paragraphs, subjects, and follow-ups inside the composer.",
          },
          {
            icon: "megaphone",
            title: "Pitches",
            description:
              "Keep pitch drafts next to the people and deals they belong to.",
          },
          {
            icon: "link",
            title: "Gmail in context",
            description:
              "Inbox context and delivery without leaving the CRM record.",
          },
        ],
      },
    ],
  },
  {
    slug: "health",
    name: "Health",
    tagline: "Energy for the long run",
    description:
      "Calorie tracking, nutrition, and fitness goals. Optional wellness that supports the work without competing for attention.",
    overview:
      "Kenoo Health is a calm wellness companion inside the suite. Log meals, track activities, set goals, and optionally sync from fitness providers, so energy and habits stay visible without becoming another complicated diet app.",
    icon: "https://assest.kenoo.io/app-icons/health.png",
    appHref: appUrl("health"),
    accent: "#5bb8a8",
    accentSoft: "rgba(91,184,168,0.14)",
    features: [
      {
        title: "Nutrition & meals",
        description:
          "Log meals and stay aware of intake without turning everyday eating into a chore.",
      },
      {
        title: "Activities & workouts",
        description:
          "Track movement and sync from providers when you want the fuller picture.",
      },
      {
        title: "Goals & progress",
        description:
          "Set targets that stay visible next to meals and activity. A calm dashboard, not a guilt meter.",
      },
      {
        title: "Optional by design",
        description:
          "Health stays in its own lane. Use it when it helps; it never blocks the rest of Kenoo.",
      },
    ],
    capabilitySections: [
      {
        title: "Energy you can actually see",
        description:
          "Calories in and out, steps, and macros on a calm dashboard—so habits stay visible without becoming another guilt meter.",
        visual: "health-energy",
        features: [
          {
            icon: "heart",
            title: "Goals & progress",
            description:
              "Targets that stay visible next to meals and activity.",
          },
          {
            icon: "activity",
            title: "Activities & workouts",
            description:
              "Track movement and sync providers when you want the fuller picture.",
          },
          {
            icon: "target",
            title: "Daily balance",
            description:
              "Remaining energy, burned calories, and steps in one glance.",
          },
          {
            icon: "layers",
            title: "Optional by design",
            description:
              "Use Health when it helps—it never blocks the rest of Kenoo.",
          },
        ],
      },
      {
        title: "Nutrition without the noise",
        description:
          "Log meals quickly, watch protein and carbs stay on track, and keep wellness in its own lane beside the work that matters.",
        visual: "health-meals",
        features: [
          {
            icon: "utensils",
            title: "Nutrition & meals",
            description:
              "Log meals without turning everyday eating into a chore.",
          },
          {
            icon: "activity",
            title: "Macro awareness",
            description:
              "Protein, carbs, and calories that stay easy to scan.",
          },
          {
            icon: "link",
            title: "Provider sync",
            description:
              "Optional Apple Health and fitness connections when you want them.",
          },
          {
            icon: "heart",
            title: "Calm by default",
            description:
              "A companion inside the suite—not another complicated diet app.",
          },
        ],
      },
    ],
  },
];

export function getFeaturedProduct(slug: string): FeaturedProduct | undefined {
  return FEATURED_PRODUCTS.find((p) => p.slug === slug);
}

export function marketingPathForSlug(slug: string): string {
  return `/product/${slug}`;
}
