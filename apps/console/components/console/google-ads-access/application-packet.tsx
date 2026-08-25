"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, Copy, FileDown } from "lucide-react";

import {
  GOOGLE_ADS_ACCESS_DOC_TITLE,
  GOOGLE_ADS_ACCESS_SECTIONS,
} from "@/lib/google-ads-access-application";
import { Button } from "@/components/ui/button";

import {
  AdPilotAutomationMockup,
  AdPilotCampaignsMockup,
  AdPilotConnectionsMockup,
  AdPilotDashboardMockup,
} from "./adpilot-mockups";

function applicationPlainText() {
  return [
    GOOGLE_ADS_ACCESS_DOC_TITLE,
    "",
    "Note: AdPilot is externally accessible (authenticated Kenoo SaaS). Mockups of the tool are included below.",
    "",
    ...GOOGLE_ADS_ACCESS_SECTIONS.flatMap((section) => [
      `${section.label}:`,
      section.body,
      "",
    ]),
    "Tool Mockups: See the AdPilot screenshots in this document (dashboard, campaigns, Google Ads connection, and campaign guardrails).",
  ].join("\n");
}

export function ApplicationPacketActions({
  className,
}: {
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  function savePdf() {
    window.print();
  }

  function downloadHtmlDocument() {
    const article = document.getElementById("google-ads-access-document");
    if (!article) {
      savePdf();
      return;
    }
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${GOOGLE_ADS_ACCESS_DOC_TITLE}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body { font-family: ui-sans-serif, system-ui, sans-serif; background: #fff; margin: 0; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body class="bg-white px-8 py-10 text-neutral-900">
${article.outerHTML}
</body>
</html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "Kenoo-AdPilot-Google-Ads-API-Access-Application.html";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  async function copyAnswers() {
    await navigator.clipboard.writeText(applicationPlainText());
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className={`flex flex-wrap gap-2 print:hidden ${className ?? ""}`}>
      <Button type="button" onClick={savePdf} className="gap-2">
        <FileDown className="h-4 w-4" />
        Download PDF
      </Button>
      <Button type="button" variant="outline" onClick={downloadHtmlDocument} className="gap-2">
        <FileDown className="h-4 w-4" />
        Download HTML
      </Button>
      <Button type="button" variant="outline" onClick={copyAnswers} className="gap-2">
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied answers" : "Copy form answers"}
      </Button>
    </div>
  );
}

export function GoogleAdsAccessApplicationPacket() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (searchParams.get("download") !== "1") return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [searchParams]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 print:hidden sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl space-y-1.5">
          <h1 className="text-[28px] font-semibold tracking-tight text-neutral-950">
            Google Ads API access
          </h1>
          <p className="text-sm leading-6 text-neutral-500">
            Packet for AdPilot Basic Access. Download as PDF (print dialog →
            Save as PDF) and attach it to Google’s form, or copy the answers
            into the text fields and keep the PDF for mockups.
          </p>
        </div>
        <ApplicationPacketActions />
      </div>

      <article
        id="google-ads-access-document"
        className="rounded-2xl border border-neutral-200 bg-white px-6 py-8 shadow-sm sm:px-10 sm:py-10 print:border-0 print:shadow-none print:px-0 print:py-0"
      >
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-neutral-400">
          Google Ads API · Developer token · Basic access
        </p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950">
          {GOOGLE_ADS_ACCESS_DOC_TITLE}
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-neutral-600">
          Note: AdPilot is externally accessible as authenticated Kenoo
          software. Mockups of the tool are included in this document.
        </p>

        <div className="mt-8 space-y-8">
          {GOOGLE_ADS_ACCESS_SECTIONS.map((section) => (
            <section key={section.label}>
              <h3 className="text-sm font-semibold tracking-tight text-neutral-950">
                {section.label}
              </h3>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-neutral-700">
                {section.body}
              </p>
            </section>
          ))}

          <section>
            <h3 className="text-sm font-semibold tracking-tight text-neutral-950">
              Tool Mockups
            </h3>
            <p className="mt-2 text-sm leading-7 text-neutral-700">
              These mockups match AdPilot in the Kenoo app: reporting dashboard,
              campaigns, Google Ads OAuth connection, and campaign-level
              guardrails. Product URL: https://adpilot.kenoo.io
            </p>
            <div className="mt-5 grid gap-8">
              <AdPilotDashboardMockup />
              <AdPilotCampaignsMockup />
              <AdPilotConnectionsMockup />
              <AdPilotAutomationMockup />
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
