import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { getCrmDataScope, crmScopeFields } from "@/lib/crm-scope";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

const INTERNAL_COMPANY_DOMAINS = new Set(["wallsentertainment.com", "walls.agency"]);
const INTERNAL_COMPANY_NAMES = new Set(["walls", "walls entertainment", "walls agency"]);
const INTERNAL_EMAIL_DOMAINS = new Set(["wallsentertainment.com", "walls.agency", "cherrystreetmusic.com"]);

const normalizeDomain = (value: string | null | undefined) => {
  if (!value) return null;
  const raw = value.trim().toLowerCase();
  if (!raw || raw.includes("@wallsentertainment.com") || raw.includes("@walls.agency")) return null;
  const domain = raw.includes("@") ? raw.split("@").pop() : raw.replace(/^https?:\/\//, "").split("/")[0];
  return domain?.replace(/^www\./, "") || null;
};

function parseJson(content: string | null | undefined) {
  if (!content) return null;
  try { return JSON.parse(content); } catch {
    const match = content.match(/\{[\s\S]*\}/);
    try { return match ? JSON.parse(match[0]) : null; } catch { return null; }
  }
}

function isInternalCompany(company: { name?: unknown; domain?: unknown }) {
  const name = String(company.name || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const domain = normalizeDomain(typeof company.domain === "string" ? company.domain : null);
  return INTERNAL_COMPANY_NAMES.has(name) || Boolean(domain && INTERNAL_COMPANY_DOMAINS.has(domain));
}

function isInternalEmail(email: string) {
  const domain = email.toLowerCase().split("@").pop()?.trim();
  return Boolean(domain && INTERNAL_EMAIL_DOMAINS.has(domain));
}

async function enrichPersonFromEmail(email: string, cookieHeader: string, baseUrl: string) {
  if (!baseUrl || !email) return false;
  try {
    const response = await fetch(`${baseUrl}/api/apollo/custom/apollo-person-id-supabase-sync`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
      body: JSON.stringify({ email }),
    });
    return response.ok;
  } catch (error) {
    console.warn("[create-from-email] person enrichment failed:", error);
    return false;
  }
}

async function enrichOrCreateCompany(
  company: { name: string; domain?: string | null },
  accountId: string,
) {
  const domain = normalizeDomain(company.domain);
  const query = supabase.from("companies").select("id,name,domain,website,logo_url").eq("account_id", accountId);
  const { data: existing } = domain
    ? await query.eq("domain", domain).maybeSingle()
    : await query.ilike("name", company.name).maybeSingle();
  if (existing) return existing;

  if (domain) {
    const { data: alias } = await supabase.from("companies_domains").select("company_id").eq("domain", domain).maybeSingle();
    if (alias?.company_id) {
      const { data: aliasedCompany } = await supabase.from("companies").select("id,name,domain,website,logo_url").eq("id", alias.company_id).eq("account_id", accountId).maybeSingle();
      if (aliasedCompany) return aliasedCompany;
    }
  }

  let enriched: Record<string, unknown> = {};
  if (domain && process.env.APOLLO_API_KEY) {
    try {
      const response = await fetch("https://api.apollo.io/v1/organizations/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": process.env.APOLLO_API_KEY },
        body: JSON.stringify({ domain }),
      });
      const organization = (await response.json()).organization;
      if (organization) {
        enriched = {
          name: organization.name || company.name,
          domain: organization.primary_domain || domain,
          website: organization.website_url || `https://${domain}`,
          logo_url: organization.logo_url || null,
          industry: organization.industry || null,
          employee_count: organization.estimated_num_employees ? Number(organization.estimated_num_employees) : null,
          apollo_organization_id: organization.id || null,
          last_enriched: new Date().toISOString(),
        };
      }
    } catch (error) {
      console.warn("[create-from-email] Apollo enrichment failed:", error);
    }
  }

  const { data: created, error } = await supabase
    .from("companies")
    .insert({
      name: company.name,
      domain,
      website: domain ? `https://${domain}` : null,
      ...enriched,
      ...crmScopeFields({ accountId, userId: "" }),
    })
    .select("id,name,domain,website,logo_url")
    .single();
  if (error) throw new Error(`Unable to create company ${company.name}: ${error.message}`);
  return created;
}

export async function POST(request: Request) {
  const scope = await getCrmDataScope();
  if (!scope) return NextResponse.json({ error: "You must be signed in with an active CRM account" }, { status: 401 });

  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const baseUrl = new URL(request.url).origin;
    const body = await request.json();
    const providerThreadId = typeof body.threadId === "string" ? body.threadId.trim() : "";
    if (!providerThreadId) return NextResponse.json({ error: "threadId is required" }, { status: 400 });

    const { data: thread, error: threadError } = await supabase
      .from("email_threads")
      .select("id,provider_thread_id,subject,deal_id")
      .eq("user_id", scope.userId)
      .eq("provider_thread_id", providerThreadId)
      .maybeSingle();
    if (threadError || !thread) return NextResponse.json({ error: "Email thread not found" }, { status: 404 });
    if (thread.deal_id) return NextResponse.json({ dealId: thread.deal_id, alreadyLinked: true });

    const { data: messages } = await supabase
      .from("email_messages")
      .select("id,from,from_name,subject,text,html,snippet,received_at,direction")
      .eq("thread_id", thread.id)
      .order("received_at", { ascending: true })
      .limit(40);
    const messageIds = (messages ?? []).map((m: any) => m.id).filter(Boolean);
    const { data: recipients } = messageIds.length
      ? await supabase.from("email_message_recipients").select("message_id,email,name,recipient_type").in("message_id", messageIds)
      : { data: [] as any[] };
    const recipientsByMessage = new Map<string, string>();
    for (const recipient of recipients ?? []) {
      const current = recipientsByMessage.get(recipient.message_id) || "";
      recipientsByMessage.set(recipient.message_id, `${current}${current ? ", " : ""}${recipient.name || ""} <${recipient.email}>`);
    }
    const transcript = (messages ?? []).map((m: any) =>
      `FROM: ${m.from_name || m.from}\nTO: ${recipientsByMessage.get(m.id) || ""}\nSUBJECT: ${m.subject || thread.subject || ""}\n${m.text || m.snippet || m.html || ""}`
    ).join("\n\n--- MESSAGE ---\n\n").slice(0, 60000);
    if (!transcript) return NextResponse.json({ error: "This email thread has no message content to analyze" }, { status: 422 });

    const { data: rosterTalent } = await supabase
      .from("talent")
      .select("id,first_name,last_name,avatar_url,walls_email,user_id")
      .eq("status", "Active");
    const talentCandidates = (rosterTalent ?? [])
      .map((t: any) => ({ id: t.id, name: [t.first_name, t.last_name].filter(Boolean).join(" ").trim(), avatar_url: t.avatar_url, walls_email: t.walls_email, user_id: t.user_id }))
      .filter((t: any) => t.name);
    const externalDomains = Array.from(new Set(
      [
        ...(messages ?? []).map((m: any) => m.from),
        ...(recipients ?? []).map((r: any) => r.email),
      ]
        .map((value: string | null | undefined) => normalizeDomain(value))
        .filter((domain): domain is string => Boolean(domain)),
    ));

    if (!process.env.OPENAI_API_KEY) return NextResponse.json({ error: "AI analysis is not configured" }, { status: 503 });
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `Analyze this partnership/sponsorship email thread. Return JSON only with: deal_name (short useful name), companies (array of up to 2 objects {name,domain,role} where role is client, agency, or brand; include both a brand and its agency when clearly present), talent (array of {name,role} using only names from the roster list when the conversation discusses a specific roster talent; role should be "featured talent" when the deal is for them), contacts (array of {name,email,role} for external brand/agency people we are negotiating with; include their name even when it is not present in the email address), deliverables (array of {name,description,quantity,unit_price_cents,currency,billing_type,billing_interval,recurrence_count,pricing_model,rate_cents,rate_basis,maximum_compensation_cents,evaluation_period_days}), confidence (number 0-1). Convert discussed money into integer cents. For performance-based pricing with an explicit maximum compensation/cap, set maximum_compensation_cents to that cap; the cap is the deliverable's headline unit_price_cents, while rate_cents and rate_basis preserve the underlying CPM/CPV/rate. Include evaluation_period_days when stated. For capped performance deals, prefer the maximum cap as the amount shown in the deal rather than the CPM rate. Only include deliverables when a rate or explicit cap is actually stated or clearly agreed. Never invent prices, dates, companies, talent, or emails. WALLS Entertainment and wallsentertainment.com are our internal agency and must never be returned as a deal company, even if they appear in signatures or replies. Use null/empty arrays when unknown. Known external email domains: ${externalDomains.join(", ") || "none"}. Roster candidates: ${talentCandidates.map((t: any) => t.name).join(", ")}` },
        { role: "user", content: transcript },
      ],
    });
    const analysis = parseJson(completion.choices[0]?.message?.content) || {};
    const companies = Array.isArray(analysis.companies)
      ? analysis.companies.filter((c: any) => c?.name && !isInternalCompany(c)).slice(0, 2)
      : [];
    if (!companies.length) return NextResponse.json({ error: "AI could not identify a company in this conversation" }, { status: 422 });

    const createdCompanies = await Promise.all(companies.map((c: any) => enrichOrCreateCompany({
      name: String(c.name).trim(),
      domain: c.domain || (externalDomains.length === 1 ? externalDomains[0] : null),
    }, scope.accountId)));
    const { data: stage } = await supabase.from("deal_stages").select("id").eq("account_id", scope.accountId).eq("is_won", false).eq("is_lost", false).order("order_index", { ascending: true }).limit(1).maybeSingle();
    if (!stage) return NextResponse.json({ error: "No active deal stage is configured for this account" }, { status: 422 });

    const { data: deal, error: dealError } = await supabase.from("deals").insert({
      deal_name: String(analysis.deal_name || `${createdCompanies[0].name} partnership`).slice(0, 180),
      source: "inbound-agency-email",
      deal_type: "partnership",
      deal_stage_id: stage.id,
      deal_owner: scope.userId,
      ...crmScopeFields(scope),
    }).select("id,deal_name").single();
    if (dealError || !deal) throw new Error(dealError?.message || "Unable to create deal");

    const deliverables = Array.isArray(analysis.deliverables)
      ? analysis.deliverables
          .map((item: any) => {
            const name = String(item?.name || "").trim();
            const rateCents = Number(item?.rate_cents ?? item?.unit_price_cents);
            const capCents = Number(item?.maximum_compensation_cents ?? item?.cap_cents);
            const unitPriceCents = Number.isFinite(capCents) && capCents > 0 ? capCents : rateCents;
            if (!name || !Number.isFinite(unitPriceCents)) return null;
            const rawBillingType = String(item?.billing_type || "one_off").toLowerCase();
            const billingType = rawBillingType === "recurring" || rawBillingType === "time_based" ? rawBillingType : "one_off";
            return {
              deal_id: deal.id,
              name: name.slice(0, 180),
              description: item?.description ? String(item.description).trim() : null,
              quantity: Math.max(1, Math.round(Number(item?.quantity) || 1)),
              unit_price_cents: Math.max(0, Math.round(unitPriceCents)),
              currency: typeof item?.currency === "string" && item.currency.trim() ? item.currency.trim().toUpperCase().slice(0, 3) : "USD",
              billing_type: billingType,
              billing_interval: billingType === "recurring" && item?.billing_interval ? String(item.billing_interval).trim() : null,
              recurrence_count: billingType === "recurring" && Number.isFinite(Number(item?.recurrence_count)) ? Math.max(1, Math.round(Number(item.recurrence_count))) : null,
              net_payout: null,
              details: {
                ...(Number.isFinite(rateCents) && rateCents > 0 ? { rate_cents: Math.round(rateCents) } : {}),
                ...(item?.rate_basis ? { rate_basis: String(item.rate_basis).trim() } : {}),
                ...(Number.isFinite(capCents) && capCents > 0 ? { maximum_compensation_cents: Math.round(capCents) } : {}),
                ...(Number.isFinite(Number(item?.evaluation_period_days)) ? { evaluation_period_days: Math.max(1, Math.round(Number(item.evaluation_period_days))) } : {}),
                ...(item?.pricing_model ? { pricing_model: String(item.pricing_model).trim() } : {}),
              },
            };
          })
          .filter(Boolean)
      : [];
    if (deliverables.length) {
      const { error: deliverablesError } = await supabase.from("deal_deliverables").insert(deliverables);
      if (deliverablesError) throw new Error(`Unable to add deal deliverables: ${deliverablesError.message}`);
    }

    const normalizeName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    const talentRows = Array.isArray(analysis.talent) ? analysis.talent : [];
    const matchedTalent = talentRows
      .map((candidate: any) => {
        const wanted = normalizeName(String(candidate?.name || ""));
        if (!wanted) return null;
        return talentCandidates.find((t: any) => {
          const actual = normalizeName(t.name);
          return actual === wanted || actual.includes(wanted) || wanted.includes(actual);
        });
      })
      .filter(Boolean)
      .filter((talent: any, index: number, all: any[]) => all.findIndex((t: any) => t.id === talent.id) === index);
    if (matchedTalent.length) {
      const { error: talentError } = await supabase.from("deal_talent").insert(matchedTalent.map((talent: any) => {
        const candidate = talentRows.find((row: any) => normalizeName(String(row?.name || "")) === normalizeName(talent.name));
        return { deal_id: deal.id, talent_id: talent.id, role: candidate?.role || "featured talent" };
      }));
      if (talentError) throw new Error(`Unable to attach talent to deal: ${talentError.message}`);
    }

    const junctions = await Promise.all(createdCompanies.map((c: any, index: number) => {
      const extractedRole = String(companies[index]?.role || "").toLowerCase();
      const role = extractedRole === "client" || extractedRole === "brand" ? extractedRole : extractedRole === "agency" ? "agency" : index === 0 ? "client" : "agency";
      return supabase.from("deal_companies").insert({ deal_id: deal.id, company_id: c.id, role }).select("id,company_id,role").single();
    }));
    const junctionError = junctions.find((result: any) => result.error)?.error;
    if (junctionError) throw new Error(`Unable to attach companies to deal: ${junctionError.message}`);
    const firstJunction = junctions[0]?.data;
    const contactSpecs = Array.isArray(analysis.contacts)
      ? analysis.contacts.map((contact: any) => ({
          email: String(contact?.email || "").toLowerCase().trim(),
          name: String(contact?.name || contact?.full_name || "").trim(),
        })).filter((contact: { email: string; name: string }) => contact.email || contact.name)
      : [];
    const matchedTalentNames = matchedTalent.map((talent: any) => normalizeName(talent.name));
    const matchedTalentFirstNames = new Set(matchedTalent.map((talent: any) => normalizeName(String(talent.name).split(/\s+/)[0])));
    const isTalentContactSpec = (contact: { name: string }) => {
      const normalizedContactName = normalizeName(contact.name);
      if (!normalizedContactName) return false;
      if (matchedTalentNames.includes(normalizedContactName)) return true;
      const parts = normalizedContactName.split(" ");
      return parts.length === 1 && matchedTalentFirstNames.has(parts[0]);
    };
    const eligibleContactSpecs = contactSpecs.filter((contact: { email: string; name: string }) =>
      !isInternalEmail(contact.email) && !isTalentContactSpec(contact),
    );
    if (eligibleContactSpecs.length && firstJunction) {
      const contactEmails = eligibleContactSpecs.map((contact: { email: string }) => contact.email).filter(Boolean);
      const { data: accountUsers } = await supabase.from("account_users").select("user_id").eq("account_id", scope.accountId);
      const internalUserIds = new Set((accountUsers ?? []).map((row: any) => row.user_id).filter(Boolean));
      const externalContactEmails = contactEmails.filter((email: string) => !isInternalEmail(email));
      let contactsByEmail = externalContactEmails.length
        ? await supabase.from("people").select("id,email,first_name,last_name,user_id").in("email", externalContactEmails).eq("account_id", scope.accountId)
        : { data: [] as any[] };
      const matchedEmails = new Set((contactsByEmail.data ?? []).map((person: any) => String(person.email || "").toLowerCase()));
      const missingEmails = externalContactEmails.filter((email: string) => !matchedEmails.has(email));
      if (missingEmails.length) {
        await Promise.all(missingEmails.map((email: string) => enrichPersonFromEmail(email, cookieHeader, baseUrl)));
        contactsByEmail = await supabase.from("people").select("id,email,first_name,last_name,user_id").in("email", externalContactEmails).eq("account_id", scope.accountId);
      }
      const nameContactResults = await Promise.all(eligibleContactSpecs.filter((contact: { name: string; email: string }) => contact.name && contact.email).map(async (contact: { name: string }) => {
        const parts = contact.name.split(/\s+/).filter(Boolean);
        if (parts.length < 2) return { data: [] as any[] };
        let query = supabase.from("people").select("id,email,first_name,last_name,user_id").eq("account_id", scope.accountId);
        if (parts.length >= 2) query = query.ilike("first_name", parts[0]).ilike("last_name", parts.slice(1).join(" "));
        else query = query.ilike("first_name", parts[0]);
        return query.limit(5);
      }));
      const contacts = [...(contactsByEmail.data ?? []), ...nameContactResults.flatMap((result: any) => result.data ?? [])]
        .filter((person: any, index: number, all: any[]) => all.findIndex((candidate: any) => candidate.id === person.id) === index);
      const talentEmails = new Set(talentCandidates.map((talent: any) => String(talent.walls_email || "").toLowerCase()).filter(Boolean));
      const normalizedTalentNames = new Set(talentCandidates.map((talent: any) => normalizeName(talent.name)));
      const externalContacts = contacts.filter((person: any) => {
        const personEmail = String(person.email || "").toLowerCase();
        const personName = normalizeName([person.first_name, person.last_name].filter(Boolean).join(" "));
        return !isInternalEmail(personEmail) && !internalUserIds.has(person.user_id) && !talentEmails.has(personEmail) && !talentCandidates.some((talent: any) => talent.user_id && talent.user_id === person.user_id) && !normalizedTalentNames.has(personName);
      });
      if (externalContacts.length) {
        const { error: contactsError } = await supabase.from("deal_contacts").insert(externalContacts.map((p: any) => ({ deal_id: deal.id, deal_company_id: firstJunction.id, person_id: p.id })));
        if (contactsError) throw new Error(`Unable to attach contacts to deal: ${contactsError.message}`);
      }
    }
    await supabase.from("email_threads").update({ deal_id: deal.id }).eq("id", thread.id).eq("user_id", scope.userId);
    return NextResponse.json({ dealId: deal.id, dealName: deal.deal_name, companies: createdCompanies, analysis });
  } catch (error) {
    console.error("[create-from-email]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create deal" }, { status: 500 });
  }
}
