/**
 * Polished Kenoo apps surfaced on the marketing site.
 * Icon URLs match the Supabase `apps.kenoo_icon_urls` column.
 */

export type FeaturedProductFeature = {
  title: string;
  description: string;
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
  /** Extra sections (AdPilot Meta Ads / Google Ads transparency, etc.). */
  compliance?: {
    title: string;
    paragraphs: string[];
    bullets?: string[];
  };
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
    compliance: {
      title: "Meta Ads, Google Ads & data use",
      paragraphs: [
        "AdPilot connects to Meta Ads and Google Ads so you can manage advertising operations in one Kenoo workspace. When you connect either platform, we process ad account identifiers, campaign and creative metadata, budgets, spend, performance metrics, and automation settings you configure.",
        "For Meta Ads, we may call Meta Marketing APIs using OAuth credentials you grant to list accessible ad accounts, sync insights, and execute or preview budget and campaign actions you authorize. Connected Meta Ads data is stored as Customer Content within the Kenoo workspace that completed the connection.",
        "When you connect Google Ads to AdPilot, Kenoo may access Google Ads account data according to the OAuth scopes you approve. That can include accessible customer accounts, campaign structure, budgets, and performance metrics needed to operate AdPilot.",
        "We use Google Ads user data only to provide and improve user-facing AdPilot features that are apparent in the product, such as listing accounts, syncing insights, reporting, and executing or previewing budget and campaign actions you authorize. We do not sell Google user data. We do not use Google user data for serving advertisements unrelated to the advertising accounts you connect.",
        "Our use and transfer of information received from Google APIs complies with the Google API Services User Data Policy, including the Limited Use requirements. You can disconnect Meta Ads or Google Ads in AdPilot settings; after disconnect we stop new syncing and delete or de-identify stored tokens and related synced data in accordance with our retention practices, except where retention is required for security, legal, or accounting purposes.",
      ],
      bullets: [
        "Product: AdPilot by Kenoo (WALLS Entertainment Group Inc. d/b/a Kenoo)",
        "Platforms: Meta Ads and Google Ads",
        "Primary use: advertising operations, reporting, and authorized spend automation",
        "Privacy Policy: kenoo.io/privacy-policy (see Google user data and Advertising sections)",
        "Terms: kenoo.io/terms-and-conditions",
        "Contact: hello@kenoo.io",
      ],
    },
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
  },
];

export function getFeaturedProduct(slug: string): FeaturedProduct | undefined {
  return FEATURED_PRODUCTS.find((p) => p.slug === slug);
}

export function marketingPathForSlug(slug: string): string {
  return `/product/${slug}`;
}
