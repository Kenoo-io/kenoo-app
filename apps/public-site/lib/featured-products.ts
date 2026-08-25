/**
 * Polished Kenoo apps surfaced on the marketing site.
 * Icon URLs match the Supabase `apps.kenoo_icon_urls` column.
 */

export type FeaturedProductFeature = {
  title: string;
  description: string;
};

export type FeaturedProductFaq = {
  question: string;
  answer: string;
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
    | "crm-contact"
    | "health-energy"
    | "health-meals"
    | "health-pulse";
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
  /** Product-specific FAQ shown at the bottom of the product page. */
  faq: FeaturedProductFaq[];
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
          "Track Meta Ads and Google Ads side by side - spend, clicks, purchases, and ROAS - so media decisions stay grounded in what actually moved.",
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
          "Use stop-loss floors or true break-even ROAS from profit kept per sale - then choose whether AdPilot pauses, alerts, or both.",
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
          "Dry-run the next AdPilot move - see the proposed daily budget, confidence, and why - before anything touches Meta or Google.",
        visual: "adpilot-preview",
        features: [
          {
            icon: "sparkles",
            title: "Generate preview",
            description:
              "Dry-run the next budget decision - nothing applies yet.",
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
              "Ads sit next to CRM and finance - not in a disconnected silo.",
          },
        ],
      },
    ],
    faq: [
      {
        question: "What is AdPilot?",
        answer:
          "AdPilot is Kenoo’s advertising operations app for teams that run Meta Ads and Google Ads. It centralizes ad accounts, campaigns, spend, and performance so media work stays visible and accountable.",
      },
      {
        question: "Which ad platforms does AdPilot support?",
        answer:
          "AdPilot connects to Meta Ads and Google Ads via OAuth. Accessible advertiser accounts sync into your Kenoo workspace with clear ownership.",
      },
      {
        question: "Will AdPilot change my budgets without approval?",
        answer:
          "No. You can preview budget decisions - proposed daily budget, confidence, and rationale - before anything applies. Automation runs only with the guardrails and approvals you set.",
      },
      {
        question: "What kinds of automation and guardrails are available?",
        answer:
          "You can set ROAS floors and alerts, hard min/max daily budgets, learning protection while campaigns are still learning, and workspace presets you can customize per campaign or ad set.",
      },
      {
        question: "Who can see connected ad account data?",
        answer:
          "Connected advertiser data lives as Customer Content in the Kenoo workspace that completed the connection, and is subject to that workspace’s permissions.",
      },
      {
        question: "How does AdPilot fit with the rest of Kenoo?",
        answer:
          "AdPilot sits alongside CRM, projects, and finance under one sign-in, so advertising stays part of how the business runs instead of a disconnected silo.",
      },
      {
        question: "How do I get started with AdPilot?",
        answer:
          "Open a Kenoo workspace, launch AdPilot, and connect your Meta Ads or Google Ads accounts. You can explore campaigns and spend right away, then turn on previews and automation when you’re ready.",
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
          "People, companies, and pipeline stages stay linked - so the next step is obvious and wins never get buried in a spreadsheet.",
        visual: "crm-pipeline",
        features: [
          {
            icon: "handshake",
            title: "Pipeline & deals",
            description:
              "Colored deal cards and stages that stay readable at a glance.",
          },
          {
            icon: "activity",
            title: "Stage funnel",
            description:
              "Weighted or total pipeline value without opening a spreadsheet.",
          },
          {
            icon: "building",
            title: "Account context",
            description:
              "Every pitch and follow-up stays attached to the right company.",
          },
          {
            icon: "layers",
            title: "Kanban that moves",
            description:
              "Drag deals across stages the way your team already thinks.",
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
              "Generate or edit emails inside the composer with model choice.",
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
      {
        title: "Know who you’re talking to",
        description:
          "Open a person and see title, company, and how to reach them - edit, email, or schedule without leaving the relationship.",
        visual: "crm-contact",
        features: [
          {
            icon: "users",
            title: "People & companies",
            description:
              "Roles, history, and next steps connected to accounts - not a dump.",
          },
          {
            icon: "mail",
            title: "Contact actions",
            description:
              "Edit, email, call, or schedule from the same contact panel.",
          },
          {
            icon: "building",
            title: "Company linkage",
            description:
              "Title and company stay visible so outreach never feels blind.",
          },
          {
            icon: "activity",
            title: "Last contacted",
            description:
              "See when you last touched base before you send again.",
          },
        ],
      },
    ],
    faq: [
      {
        question: "What is Kenoo CRM?",
        answer:
          "Kenoo CRM helps operators manage people, companies, deals, and outbound in one place. Lead tracking, sequences, pitches, and pipeline stay tied to the accounts that matter.",
      },
      {
        question: "Who is Kenoo CRM built for?",
        answer:
          "It’s built for teams that live in relationships - talent, brands, partners, and operators who need clear next steps without losing the human thread.",
      },
      {
        question: "Can I run outreach sequences and pitches?",
        answer:
          "Yes. You can draft sequences and pitches with AI assist, keep follow-ups structured, and send from the same workspace where the relationship already lives.",
      },
      {
        question: "Does CRM integrate with Gmail?",
        answer:
          "You can connect Gmail when you need inbox context, sequences, and delivery without leaving the relationship record.",
      },
      {
        question: "How are people, companies, and deals connected?",
        answer:
          "Roles, history, and next steps stay attached to accounts. Pipeline stages stay readable, and every pitch or follow-up links back to the right company and deal.",
      },
      {
        question: "How does CRM fit with the rest of Kenoo?",
        answer:
          "CRM shares the same workspace and identity as AdPilot, Health, projects, and finance - so context from relationships can inform the rest of the work.",
      },
      {
        question: "How do I get started with CRM?",
        answer:
          "Sign in to Kenoo, open CRM, and start with people and companies - or import the relationships you already manage. Add deals and sequences as your pipeline takes shape.",
      },
    ],
  },
  {
    slug: "health",
    name: "Health",
    tagline: "Stay sharp for the work that matters",
    description:
      "A personal health monitor for operators who refuse to burn out. Meals, movement, and goals - so you show up clear-headed, not just more productive.",
    overview:
      "High-output work is easy to optimize. Taking care of yourself is easier to forget. Kenoo Health is the reminder built into the suite: log meals, track activities, set simple goals, and optionally sync from fitness providers - so life balance stays visible next to the work, not buried under it. We’re not a heartless output machine. Peak performance starts with people who are still standing.",
    icon: "https://assest.kenoo.io/app-icons/health.png",
    appHref: appUrl("health"),
    accent: "#5bb8a8",
    accentSoft: "rgba(91,184,168,0.14)",
    features: [
      {
        title: "Nutrition & meals",
        description:
          "Log what you eat so fuel for the day stays honest - without turning lunch into another project.",
      },
      {
        title: "Activities & workouts",
        description:
          "Track movement and sync from providers when you want the fuller picture of how you actually recover.",
      },
      {
        title: "Goals & progress",
        description:
          "Set targets that keep you sharp for work - a calm dashboard for balance, not a guilt meter.",
      },
      {
        title: "Built for life balance",
        description:
          "Health sits beside AdPilot and CRM on purpose. Use it when you need a check-in; it never blocks the rest of Kenoo.",
      },
    ],
    capabilitySections: [
      {
        title: "A monitor for how you’re really doing",
        description:
          "Calories in and out, steps, and macros on one calm view - so you catch the dip before the week runs you over.",
        visual: "health-energy",
        features: [
          {
            icon: "target",
            title: "Daily balance",
            description:
              "Remaining energy, burned calories, and steps when you need a quick read.",
          },
          {
            icon: "activity",
            title: "Activities & workouts",
            description:
              "Track movement and sync providers when recovery matters as much as output.",
          },
          {
            icon: "layers",
            title: "Clear metric cards",
            description:
              "Sage, spectrum, and amber tiles that make today’s numbers easy to scan.",
          },
          {
            icon: "heart",
            title: "Life balance by design",
            description:
              "A check-in for yourself - it never blocks AdPilot, CRM, or the rest of Kenoo.",
          },
        ],
      },
      {
        title: "Fuel the day without the diet-app noise",
        description:
          "Log meals quickly, keep protein and carbs in view, and treat nutrition like the work fuel it is - not another guilt cycle.",
        visual: "health-meals",
        features: [
          {
            icon: "utensils",
            title: "Quick log",
            description:
              "Meal type, food, calories, and macros in one short form.",
          },
          {
            icon: "activity",
            title: "Macro awareness",
            description:
              "Protein, carbs, and fat that stay easy to scan after you log.",
          },
          {
            icon: "link",
            title: "Provider sync",
            description:
              "Optional Apple Health and fitness connections when you want them.",
          },
          {
            icon: "heart",
            title: "Built for operators",
            description:
              "Support for staying sharp - not another complicated diet app.",
          },
        ],
      },
      {
        title: "Know where you stand before the day closes",
        description:
          "One ring for today’s calories - progress, remaining, and status - so self-care isn’t something you remember after you’ve already crashed.",
        visual: "health-pulse",
        features: [
          {
            icon: "target",
            title: "Day pulse",
            description:
              "One ring for today’s intake versus your calorie target.",
          },
          {
            icon: "heart",
            title: "Goals & progress",
            description:
              "Steps, workouts, and custom targets Wallie can coach on.",
          },
          {
            icon: "activity",
            title: "Status at a glance",
            description:
              "Consumed, remaining, and burned without digging for numbers.",
          },
          {
            icon: "layers",
            title: "Widgets you choose",
            description:
              "Show the cards that keep you sharp - hide the rest when you want quiet.",
          },
        ],
      },
    ],
    faq: [
      {
        question: "What is Kenoo Health?",
        answer:
          "Kenoo Health is a personal health monitor inside the suite - built so operators don’t forget themselves while optimizing everything else. Log meals, track activities, set goals, and optionally sync from fitness providers to stay sharp for work with real life balance.",
      },
      {
        question: "Is Health required to use Kenoo?",
        answer:
          "No. Health is optional by design. Use it when you need a check-in; it never blocks AdPilot, CRM, or the rest of the platform.",
      },
      {
        question: "What can I track in Health?",
        answer:
          "Meals and nutrition, activities and workouts, daily energy balance, and goals for calories, macros, and movement - enough to stay aware without turning wellness into a second job.",
      },
      {
        question: "Can I sync Apple Health or other fitness providers?",
        answer:
          "Yes. Provider sync is optional. Connect Apple Health or other fitness sources when you want a fuller picture of movement and recovery.",
      },
      {
        question: "Is my health data private to my account?",
        answer:
          "Health data is personal wellness information in your Kenoo account and is subject to your workspace permissions and Kenoo’s Privacy Policy. It stays in its own lane alongside the rest of the suite.",
      },
      {
        question: "Why put Health next to ads and CRM?",
        answer:
          "Because sustained performance isn’t only pipeline and ROAS. Health is Kenoo’s way of saying the people doing the work matter - a practical reminder to take care of yourself so you can keep showing up clear and sharp.",
      },
      {
        question: "Does Health replace a full diet or training app?",
        answer:
          "No. Health supports everyday awareness and life balance next to your work - not specialized coaching or clinical tools. Keep what already works for you and use Kenoo Health as the monitor that lives where you already operate.",
      },
      {
        question: "How do I get started with Health?",
        answer:
          "Open Health from your Kenoo workspace, set a simple goal, and log a meal or activity. Add provider sync later if you want richer daily totals.",
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
