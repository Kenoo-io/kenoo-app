export const GOOGLE_ADS_ACCESS_DOC_TITLE =
  "Kenoo AdPilot — Google Ads API Basic Access Application";

export const GOOGLE_ADS_ACCESS_SECTIONS = [
  {
    label: "Company Name",
    body: "WALLS Entertainment Group Inc., doing business as Kenoo.",
  },
  {
    label: "Business Model",
    body: `Kenoo (kenoo.io) is the business operating system we build and operate. Our products include CRM, AdPilot, Calendar, Ledger, Health, and related Kenoo apps.

AdPilot is Kenoo’s advertising operations product. We use it internally so Kenoo employees and ad managers can run and review paid media for properties we own (including kenoo.io and Kenoo product apps). AdPilot is also available to signed-in users inside a Kenoo workspace so they can connect Google Ads accounts they own or are authorized to operate.

We do not scrape or manage Google Ads accounts without the advertiser’s OAuth consent. Connected advertiser data stays in the Kenoo workspace that completed the connection and is subject to that workspace’s access controls. We advertise Kenoo’s own sites and do not run a separate “manage anyone’s ads without login” service.`,
  },
  {
    label: "Tool Access/Use",
    body: `AdPilot is a web application at adpilot.kenoo.io. It is used by Kenoo employees and by authorized workspace members (operators and ad managers) after Kenoo authentication. Third parties such as an outside agency cannot open AdPilot unless a workspace admin invites them as a Kenoo user with AdPilot access. They will not receive our Google Ads developer credentials or a shared backdoor into other customers’ accounts.

Inside AdPilot, users can:
• Connect Google Ads with OAuth and see which advertiser accounts they can access
• View a reporting dashboard of spend, impressions, clicks, conversions, and ROAS over selectable time periods
• Browse campaigns, ad groups, and ads synced from Google Ads
• Review audiences, automation presets, and spend guardrails
• Trigger a sync that refreshes campaign structure and performance into our database (also intended to run on a recurring hourly schedule)

We may share exported summaries with partners outside Kenoo, but those partners cannot access the tool directly unless they are invited into the workspace.`,
  },
  {
    label: "Tool Design",
    body: `AdPilot is externally accessible (authenticated SaaS). For reporting, we pull metrics from the Google Ads API into our Postgres database. The AdPilot UI reads from that database so users can view account, campaign, ad group, and ad performance over different time ranges without calling Google on every page load.

On Google Ads connect, on demand from the dashboard, and on a recurring sync job, Kenoo refreshes:
• Accessible customers, including client accounts under a manager (MCC)
• Campaigns, budgets, ad groups, and ads
• Daily performance metrics (impressions, clicks, cost, conversions, CTR, CPC, CPM, conversion value)

Spend-automation and ROAS guardrail screens live in the same product so operators can preview rules before anything is applied. The Google Ads path implemented for this access request is read/sync via GoogleAdsService search, not bulk unattended mutation of other advertisers’ accounts.`,
  },
  {
    label: "API Services Called",
    body: `OAuth 2.0 with scope https://www.googleapis.com/auth/adwords

CustomerService
• customers:listAccessibleCustomers — list Google Ads accounts the signed-in user can access

GoogleAdsService (googleAds:search)
• Customer — account profile (id, name, manager flag, status) and account-level performance reports
• CustomerClient — enabled client accounts under a manager account
• Campaign and CampaignBudget — campaign structure, status, channel, and budget
• AdGroup — ad group structure and status
• AdGroupAd — ads in each ad group (id, name/type, status, final URLs) and ad-level performance reports

Metrics requested on Customer, Campaign, AdGroup, and AdGroupAd include impressions, clicks, cost_micros, conversions, conversions_value, ctr, average_cpc, and average_cpm, segmented by date.`,
  },
] as const;
