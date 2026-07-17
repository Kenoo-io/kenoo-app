export type SuiteCapability = {
  id: string;
  title: string;
  description: string;
  href: string;
  orb: {
    from: string;
    mid: string;
    to: string;
    glow: string;
  };
};

export type SuiteFeature = {
  id: string;
  name: string;
  capabilities: SuiteCapability[];
};

export type KenooSuite = {
  id: string;
  name: string;
  description: string;
  dot: string;
  features: SuiteFeature[];
};

export const KENOO_SUITES: KenooSuite[] = [
  {
    id: "grow",
    name: "KenooGrow",
    description:
      "Relationships, pipelines, and context so your team always knows who needs attention next.",
    dot: "#0b6eff",
    features: [
      {
        id: "pipelines",
        name: "Pipelines",
        capabilities: [
          {
            id: "deal-flow",
            title: "Deal flow",
            description:
              "Stages that stay readable so wins and blockers are never buried.",
            href: "/product#crm",
            orb: {
              from: "#1a6dff",
              mid: "#4d9fff",
              to: "#0a3d8c",
              glow: "rgba(11,110,255,0.7)",
            },
          },
          {
            id: "priorities",
            title: "Priorities",
            description:
              "Surface the next conversation instead of scrolling endless lists.",
            href: "/product#crm",
            orb: {
              from: "#30a1f4",
              mid: "#6ec4ff",
              to: "#0066b2",
              glow: "rgba(48,161,244,0.65)",
            },
          },
          {
            id: "handoffs",
            title: "Handoffs",
            description:
              "Pass context cleanly between sales, ops, and delivery without losing the thread.",
            href: "/product#crm",
            orb: {
              from: "#6eadc0",
              mid: "#9fd0dc",
              to: "#3d7a8a",
              glow: "rgba(110,173,192,0.65)",
            },
          },
        ],
      },
      {
        id: "contacts",
        name: "Contacts",
        capabilities: [
          {
            id: "people",
            title: "People",
            description:
              "A clear record of every relationship—roles, history, and next steps.",
            href: "/product#crm",
            orb: {
              from: "#0b6eff",
              mid: "#5a9fff",
              to: "#083d8f",
              glow: "rgba(11,110,255,0.65)",
            },
          },
          {
            id: "companies",
            title: "Companies",
            description:
              "Accounts that stay connected to deals, projects, and invoices.",
            href: "/product#crm",
            orb: {
              from: "#0066b2",
              mid: "#30a1f4",
              to: "#0a3a66",
              glow: "rgba(0,102,178,0.65)",
            },
          },
          {
            id: "context",
            title: "Context",
            description:
              "Notes and activity that make every follow-up feel informed.",
            href: "/product#crm",
            orb: {
              from: "#4d8ef0",
              mid: "#8eb8ff",
              to: "#1e4a9e",
              glow: "rgba(77,142,240,0.65)",
            },
          },
        ],
      },
      {
        id: "outreach",
        name: "Outreach",
        capabilities: [
          {
            id: "sequences",
            title: "Sequences",
            description:
              "Structured follow-ups that stay human, not spammy automation.",
            href: "/product#crm",
            orb: {
              from: "#30a1f4",
              mid: "#7cc8ff",
              to: "#0b6eff",
              glow: "rgba(48,161,244,0.65)",
            },
          },
          {
            id: "pitches",
            title: "Pitches",
            description:
              "Keep proposals and talking points tied to the right account.",
            href: "/product#crm",
            orb: {
              from: "#6eadc0",
              mid: "#a8d8e4",
              to: "#2f6b7a",
              glow: "rgba(110,173,192,0.65)",
            },
          },
          {
            id: "follow-ups",
            title: "Follow-ups",
            description:
              "Never lose a warm lead because it slipped out of view.",
            href: "/product#crm",
            orb: {
              from: "#0b6eff",
              mid: "#3d8cff",
              to: "#052a66",
              glow: "rgba(11,110,255,0.7)",
            },
          },
        ],
      },
      {
        id: "deals",
        name: "Deals",
        capabilities: [
          {
            id: "pipeline-health",
            title: "Pipeline health",
            description:
              "See momentum, risk, and stalled deals without opening ten tabs.",
            href: "/product#crm",
            orb: {
              from: "#0066b2",
              mid: "#4da3e0",
              to: "#083554",
              glow: "rgba(0,102,178,0.65)",
            },
          },
          {
            id: "close-plan",
            title: "Close plan",
            description:
              "Owners, dates, and next actions that keep deals moving forward.",
            href: "/product#crm",
            orb: {
              from: "#1a7ae0",
              mid: "#6eb4ff",
              to: "#0a3d70",
              glow: "rgba(26,122,224,0.65)",
            },
          },
          {
            id: "history",
            title: "History",
            description:
              "A durable trail of touches so nothing depends on memory alone.",
            href: "/product#crm",
            orb: {
              from: "#6eadc0",
              mid: "#8fc5d4",
              to: "#355f6a",
              glow: "rgba(110,173,192,0.6)",
            },
          },
        ],
      },
    ],
  },
  {
    id: "deliver",
    name: "KenooDeliver",
    description:
      "Projects and calendar in one rhythm—milestones, owners, and time that stay aligned.",
    dot: "#f08a5d",
    features: [
      {
        id: "boards",
        name: "Boards",
        capabilities: [
          {
            id: "status",
            title: "Status",
            description:
              "Work that stays clear from backlog to done without noisy boards.",
            href: "/product#projects",
            orb: {
              from: "#f08a5d",
              mid: "#ffb08a",
              to: "#a84a28",
              glow: "rgba(240,138,93,0.7)",
            },
          },
          {
            id: "owners",
            title: "Owners",
            description:
              "Every task has a person, so progress never becomes a guessing game.",
            href: "/product#projects",
            orb: {
              from: "#e07a4d",
              mid: "#f5a882",
              to: "#8c3a1e",
              glow: "rgba(224,122,77,0.65)",
            },
          },
          {
            id: "focus",
            title: "Focus",
            description:
              "Cut through noise and show the work that matters this week.",
            href: "/product#projects",
            orb: {
              from: "#ff9a6b",
              mid: "#ffc4a3",
              to: "#c45a30",
              glow: "rgba(255,154,107,0.65)",
            },
          },
        ],
      },
      {
        id: "milestones",
        name: "Milestones",
        capabilities: [
          {
            id: "plans",
            title: "Plans",
            description:
              "Milestones that connect ambition to what’s actually shipping.",
            href: "/product#projects",
            orb: {
              from: "#f08a5d",
              mid: "#ffae88",
              to: "#b04a25",
              glow: "rgba(240,138,93,0.65)",
            },
          },
          {
            id: "alignment",
            title: "Alignment",
            description:
              "Keep stakeholders on the same page without another status meeting.",
            href: "/product#projects",
            orb: {
              from: "#e2a06a",
              mid: "#f5c89a",
              to: "#9a5a30",
              glow: "rgba(226,160,106,0.65)",
            },
          },
          {
            id: "delivery",
            title: "Delivery",
            description:
              "Track outcomes, not just activity, as work moves through the team.",
            href: "/product#projects",
            orb: {
              from: "#d87848",
              mid: "#f0a070",
              to: "#7a3a18",
              glow: "rgba(216,120,72,0.65)",
            },
          },
        ],
      },
      {
        id: "schedule",
        name: "Schedule",
        capabilities: [
          {
            id: "meetings",
            title: "Meetings",
            description:
              "A shared calendar for ops, delivery, and client time in one view.",
            href: "/product#calendar",
            orb: {
              from: "#e2f85c",
              mid: "#f0ff9a",
              to: "#8a9a20",
              glow: "rgba(226,248,92,0.6)",
            },
          },
          {
            id: "deadlines",
            title: "Deadlines",
            description:
              "Dates that stay tied to projects so nothing slips quietly.",
            href: "/product#calendar",
            orb: {
              from: "#ceff00",
              mid: "#e8ff80",
              to: "#6a8a00",
              glow: "rgba(206,255,0,0.55)",
            },
          },
          {
            id: "ops-time",
            title: "Ops time",
            description:
              "Protect focus blocks and still see what the week demands.",
            href: "/product#calendar",
            orb: {
              from: "#e0ea00",
              mid: "#f2ff66",
              to: "#7a8200",
              glow: "rgba(224,234,0,0.55)",
            },
          },
        ],
      },
      {
        id: "timelines",
        name: "Timelines",
        capabilities: [
          {
            id: "roadmap",
            title: "Roadmap",
            description:
              "See how work stacks across weeks without a separate planning tool.",
            href: "/product#projects",
            orb: {
              from: "#f08a5d",
              mid: "#ffb899",
              to: "#9a4020",
              glow: "rgba(240,138,93,0.65)",
            },
          },
          {
            id: "dependencies",
            title: "Dependencies",
            description:
              "Spot blockers early when one delay would cascade into another.",
            href: "/product#projects",
            orb: {
              from: "#ff9f6e",
              mid: "#ffc8a8",
              to: "#b85028",
              glow: "rgba(255,159,110,0.65)",
            },
          },
          {
            id: "capacity",
            title: "Capacity",
            description:
              "Balance load across people so delivery stays realistic.",
            href: "/product#calendar",
            orb: {
              from: "#e07a4d",
              mid: "#f0a888",
              to: "#8c3818",
              glow: "rgba(224,122,77,0.65)",
            },
          },
        ],
      },
    ],
  },
  {
    id: "operate",
    name: "KenooOperate",
    description:
      "Finance, workflows, and AI—money you can follow and automation that stays understandable.",
    dot: "#8dcf76",
    features: [
      {
        id: "invoices",
        name: "Invoices",
        capabilities: [
          {
            id: "billing",
            title: "Billing",
            description:
              "Send clear invoices that stay connected to the work that earned them.",
            href: "/product#finance",
            orb: {
              from: "#8dcf76",
              mid: "#b8e8a4",
              to: "#3d7a2e",
              glow: "rgba(141,207,118,0.65)",
            },
          },
          {
            id: "collections",
            title: "Collections",
            description:
              "Know what’s outstanding without digging through spreadsheets.",
            href: "/product#finance",
            orb: {
              from: "#75b85f",
              mid: "#a4d890",
              to: "#2b5b00",
              glow: "rgba(117,184,95,0.65)",
            },
          },
          {
            id: "receipts",
            title: "Receipts",
            description:
              "A clean trail from quote to paid, ready when you need it.",
            href: "/product#finance",
            orb: {
              from: "#a8e090",
              mid: "#d0f5c0",
              to: "#4a8a38",
              glow: "rgba(168,224,144,0.6)",
            },
          },
        ],
      },
      {
        id: "ledger",
        name: "Ledger",
        capabilities: [
          {
            id: "cash-flow",
            title: "Cash flow",
            description:
              "Balances and forecasts designed to stay readable and easy to trust.",
            href: "/product#finance",
            orb: {
              from: "#2b5b00",
              mid: "#5a9a30",
              to: "#0f2800",
              glow: "rgba(43,91,0,0.6)",
            },
          },
          {
            id: "forecast",
            title: "Forecast",
            description:
              "See what’s coming in and going out before the month surprises you.",
            href: "/product#finance",
            orb: {
              from: "#8dcf76",
              mid: "#b5e6a0",
              to: "#456828",
              glow: "rgba(141,207,118,0.65)",
            },
          },
          {
            id: "trust",
            title: "Trust",
            description:
              "Numbers that feel accountable—not another opaque finance export.",
            href: "/product#finance",
            orb: {
              from: "#6eadc0",
              mid: "#9ed0dc",
              to: "#2f5a66",
              glow: "rgba(110,173,192,0.65)",
            },
          },
        ],
      },
      {
        id: "workflows",
        name: "Workflows",
        capabilities: [
          {
            id: "flows",
            title: "Flows",
            description:
              "Build the processes your business already uses, with clear controls.",
            href: "/product#workflows",
            orb: {
              from: "#ceff00",
              mid: "#e8ff70",
              to: "#6a8800",
              glow: "rgba(206,255,0,0.55)",
            },
          },
          {
            id: "routing",
            title: "Routing",
            description:
              "Move work to the right person at the right moment automatically.",
            href: "/product#workflows",
            orb: {
              from: "#e2f85c",
              mid: "#f4ff9e",
              to: "#7a8a18",
              glow: "rgba(226,248,92,0.55)",
            },
          },
          {
            id: "controls",
            title: "Controls",
            description:
              "Automation that stays understandable—no black-box mystery steps.",
            href: "/product#workflows",
            orb: {
              from: "#e0ea00",
              mid: "#f0fa60",
              to: "#6a7000",
              glow: "rgba(224,234,0,0.55)",
            },
          },
        ],
      },
      {
        id: "ai",
        name: "AI Assist",
        capabilities: [
          {
            id: "drafts",
            title: "Drafts",
            description:
              "An assistant that helps write and route without crowding the workspace.",
            href: "/product#ai",
            orb: {
              from: "#111111",
              mid: "#4a4a4a",
              to: "#000000",
              glow: "rgba(17,17,17,0.6)",
            },
          },
          {
            id: "highlights",
            title: "Highlights",
            description:
              "Surface what matters across CRM, projects, and finance in one pass.",
            href: "/product#ai",
            orb: {
              from: "#0b6eff",
              mid: "#4d9aff",
              to: "#062a66",
              glow: "rgba(11,110,255,0.65)",
            },
          },
          {
            id: "assist",
            title: "Assist",
            description:
              "Helpful when you need it—quiet when you don’t.",
            href: "/product#ai",
            orb: {
              from: "#2b5b00",
              mid: "#5a9a28",
              to: "#0a1a00",
              glow: "rgba(43,91,0,0.6)",
            },
          },
        ],
      },
    ],
  },
];
