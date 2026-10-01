"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Check, Code2, Copy, KeyRound, ShieldCheck, Users, Webhook } from "lucide-react";

const panelGlassClass = "border border-white/80 bg-white/75 backdrop-blur-xl shadow-[0_8px_28px_rgba(15,23,42,0.07),inset_0_1px_0_rgba(255,255,255,0.95)]";

const curlExample = `curl -X POST https://api.kenoo.io/v1/events \\
  -H "Authorization: Bearer knp_live_..." \\
  -H "Content-Type: application/json" \\
  -H "Idempotency-Key: checkout-started-123" \\
  -d '{
    "event": "checkout_started",
    "external_id": "checkout_123",
    "payload": {
      "checkout_id": "checkout_123",
      "email": "person@example.com",
      "cart_value": 49.99,
      "currency": "USD"
    },
    "context": {
      "source": "murphslife"
    }
  }'`;

const serverExample = `await fetch("https://api.kenoo.io/v1/events", {
  method: "POST",
  headers: {
    Authorization: \`Bearer \${process.env.KENOO_WORKFLOWS_API_KEY}\`,
    "Content-Type": "application/json",
    "Idempotency-Key": providerEventId,
  },
  body: JSON.stringify({
    event: "purchase_completed",
    external_id: orderId,
    payload: {
      checkout_id: checkoutId,
      order_id: orderId,
      email,
      value: total,
      currency: "USD",
    },
  }),
});`;

function CodeBlock({ value }: { value: string }) {
  const [copied, setCopied] = React.useState(false);

  const copy = async () => {
    await navigator.clipboard?.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#151515] text-neutral-100">
      <button type="button" onClick={() => void copy()} className="absolute right-3 top-3 inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 text-xs text-neutral-300 transition hover:bg-white/15 hover:text-white" aria-label="Copy code">
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? "Copied" : "Copy"}
      </button>
      <pre className="overflow-x-auto p-5 pr-24 text-[12px] leading-6"><code>{value}</code></pre>
    </div>
  );
}

function DocSection({ eyebrow, title, children }: { eyebrow?: string; title: string; children: React.ReactNode }) {
  return (
    <section className="pt-8">
      {eyebrow ? <p className="text-xs font-medium uppercase tracking-widest text-neutral-400">{eyebrow}</p> : null}
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <div className="mt-4 text-sm font-light leading-7 text-neutral-600">{children}</div>
    </section>
  );
}

function InfoCard({ icon: Icon, title, children }: { icon: typeof KeyRound; title: string; children: React.ReactNode }) {
  return (
    <div className={`rounded-[22px] p-5 ${panelGlassClass}`}>
      <div className="flex items-start gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-700"><Icon className="h-4 w-4" strokeWidth={1.75} /></span>
        <div><p className="text-sm font-medium text-foreground">{title}</p><p className="mt-1 text-sm font-light leading-6 text-neutral-500">{children}</p></div>
      </div>
    </div>
  );
}

export function EventApiDocumentation() {
  return (
    <main className="min-h-full w-full bg-kenoo-white px-6 pb-16 pt-6 md:px-10 md:pt-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col">
        <Link href="/settings" className="group mb-8 inline-flex w-fit items-center gap-2 text-sm font-light text-neutral-500 transition-colors hover:text-neutral-800"><ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" /> Settings</Link>
        <header className="max-w-2xl">
          <div className="flex items-center gap-3 text-[var(--kenoo-sky)]"><Code2 className="h-7 w-7" strokeWidth={1.5} /><p className="text-xs font-medium uppercase tracking-widest">Developer documentation</p></div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">Event API</h1>
          <p className="mt-3 text-lg font-light leading-8 text-neutral-500">Send events from your applications into Workflows and use them as triggers for customer workflows.</p>
        </header>

        <div className="mt-8 grid gap-3 md:grid-cols-3">
          <InfoCard icon={KeyRound} title="1. Create a key">Create a Workflows key from <Link href="/settings/api-keys" className="font-medium text-[var(--kenoo-sky)] hover:underline">Settings → API keys</Link>.</InfoCard>
          <InfoCard icon={Code2} title="2. Define events">Add the <Link href="/analytics/metrics" className="font-medium text-[var(--kenoo-sky)] hover:underline">event presets or custom events</Link> your application will send.</InfoCard>
          <InfoCard icon={ShieldCheck} title="3. Send server-side">Keep the secret key in your server environment, never in browser code.</InfoCard>
        </div>

        <DocSection eyebrow="Endpoint" title="Send an event">
          <p>Use the API when something meaningful happens in your product. The event definition must already exist in the account’s Workflows workspace.</p>
          <div className={`mt-4 flex items-center gap-3 rounded-[22px] px-5 py-4 font-mono text-xs ${panelGlassClass}`}><span className="rounded-md bg-[#eaf8ff] px-2 py-1 font-semibold text-[#1684b5]">POST</span><span className="text-neutral-700">https://api.kenoo.io/v1/events</span></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2"><InfoCard icon={KeyRound} title="Authorization">Bearer token from your Workflows API key.</InfoCard><InfoCard icon={Webhook} title="Idempotency-Key">Use a stable unique value so retries do not create duplicate occurrences.</InfoCard></div>
        </DocSection>

        <DocSection eyebrow="Example" title="Send from a server">
          <p>Here is a complete request for a checkout start:</p>
          <div className="mt-4"><CodeBlock value={curlExample} /></div>
          <p className="mt-4">For payment completion, send the event from your provider webhook after the payment is confirmed:</p>
          <div className="mt-4"><CodeBlock value={serverExample} /></div>
        </DocSection>

        <DocSection eyebrow="Request body" title="Event fields">
          <div className={`overflow-hidden rounded-[22px] ${panelGlassClass}`}>
            <div className="grid grid-cols-[minmax(110px,0.7fr)_minmax(0,1.3fr)] border-b border-neutral-100 px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-400"><span>Field</span><span>Use</span></div>
            {[['event', 'Required event key, such as checkout_started or purchase_completed.'], ['payload', 'Required JSON object containing the event data your workflow needs.'], ['context', 'Optional JSON object for source, page, campaign, or other metadata.'], ['external_id', 'Optional provider or application identifier for correlation and debugging.'], ['occurred_at', 'Optional ISO timestamp. Defaults to the time Kenoo receives the request.']].map(([field, description]) => <div key={field} className="grid grid-cols-[minmax(110px,0.7fr)_minmax(0,1.3fr)] border-b border-neutral-100 px-4 py-3 text-sm last:border-0"><code className="font-mono text-xs text-neutral-700">{field}</code><span className="font-light text-neutral-500">{description}</span></div>)}
          </div>
        </DocSection>

        <DocSection eyebrow="Audience capture" title="Build your Workflow audience from events">
          <p>Workflows automatically maintains a separate, account-scoped audience from identifiable events. This audience is designed for workflow automation and is separate from Kenoo CRM people.</p>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <InfoCard icon={Users} title="Who is captured?">An audience record is created when the payload includes an email or a stable identifier such as <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs">user_id</code>, <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs">customer_id</code>, or <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs">external_id</code>.</InfoCard>
            <InfoCard icon={ShieldCheck} title="Separate from CRM">Audience records do not create or expose CRM contacts. They remain in Workflows unless you later choose to connect them to CRM.</InfoCard>
            <InfoCard icon={Webhook} title="Anonymous events">Events without an email or stable identifier are still recorded for analytics and workflows, but do not create an audience record.</InfoCard>
          </div>
          <div className={`mt-5 overflow-hidden rounded-[22px] ${panelGlassClass}`}>
            <div className="border-b border-neutral-100 px-4 py-3 text-xs font-medium uppercase tracking-wide text-neutral-400">Audience field mapping</div>
            {[['email', 'Normalized and used to deduplicate audience records.'], ['first_name / firstName', 'Stored as the audience first name.'], ['last_name / lastName', 'Stored as the audience last name.'], ['full_name / fullName / name', 'Stored as the full name; first and last name are used as a fallback.'], ['phone, company, job_title', 'Stored as standard audience fields when present.'], ['Any other payload fields', 'Preserved in custom_payload for future segmentation and enrichment.']].map(([field, description]) => <div key={field} className="grid grid-cols-[minmax(150px,0.7fr)_minmax(0,1.3fr)] border-b border-neutral-100 px-4 py-3 text-sm last:border-0"><code className="font-mono text-xs text-neutral-700">{field}</code><span className="font-light text-neutral-500">{description}</span></div>)}
          </div>
          <div className="mt-5 rounded-[22px] bg-[#f7fbfd] p-5 text-sm font-light leading-7 text-neutral-600">
            <p className="font-medium text-neutral-800">Deduplication and enrichment</p>
            <p className="mt-1">Email addresses are normalized before matching. If an audience record already exists, new standard fields and custom payload values enrich it, <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">last_seen_at</code> is updated, and its event count increases. Use the same stable identifier and a stable <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs">Idempotency-Key</code> when retrying an event.</p>
          </div>
        </DocSection>

        <DocSection eyebrow="Checkout lifecycle" title="Checkout abandonment is automatic">
          <p>For abandoned checkout workflows, correlate every related event with the same <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700">checkout_id</code> in the payload or the same <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs text-neutral-700">external_id</code>.</p>
          <div className="mt-5 space-y-3">
            {[['checkout_started', 'Your application sends this when a checkout begins.'], ['checkout_completed / purchase_completed', 'Your payment provider webhook sends this only after successful confirmation.'], ['checkout_abandoned', 'Kenoo generates this automatically after 60 minutes if no successful event exists for that checkout.']].map(([event, description], index) => <div key={event} className={`flex gap-3 rounded-[22px] p-5 ${panelGlassClass}`}><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-xs font-medium text-neutral-600">{index + 1}</span><div><code className="font-mono text-xs text-neutral-700">{event}</code><p className="mt-1 text-sm font-light text-neutral-500">{description}</p></div></div>)}
          </div>
        </DocSection>

        <DocSection eyebrow="Responses" title="What to expect">
          <div className="grid gap-3 sm:grid-cols-2"><InfoCard icon={Check} title="202 Accepted">The event was durably recorded and can trigger workflows.</InfoCard><InfoCard icon={Check} title="200 OK">The request was safely deduplicated using its idempotency key.</InfoCard><InfoCard icon={Code2} title="400 / 404">Check the event key, payload shape, and that the event exists in Workflows.</InfoCard><InfoCard icon={ShieldCheck} title="401">The API key is missing, invalid, revoked, or lacks event write access.</InfoCard></div>
        </DocSection>

      </div>
    </main>
  );
}
