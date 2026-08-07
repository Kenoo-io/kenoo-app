import {
  FEATURED_PRODUCT_SLUGS,
  FEATURED_PRODUCTS,
  marketingPathForSlug,
} from "@/lib/featured-products";

export type PublicApp = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  /** Marketing product page on kenoo.io */
  href: string;
  /** Live product app URL */
  appHref: string;
};

const ADMIN_APP_SLUG = process.env.NEXT_PUBLIC_ADMIN_APP_SLUG ?? "admin";
const CONSOLE_APP_SLUG = process.env.NEXT_PUBLIC_CONSOLE_APP_SLUG ?? "console";
const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "kenoo.io";

const HIDDEN_SLUGS = new Set([ADMIN_APP_SLUG, CONSOLE_APP_SLUG]);
const FEATURED_SLUG_SET = new Set<string>(FEATURED_PRODUCT_SLUGS);

type AppsRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  kenoo_icon_urls: string | null;
  subdomain: string | null;
  url_redirect: string | null;
};

/** Prefer Kenoo marketing icons; fall back to legacy walls icon_url. */
function iconForApp(
  slug: string,
  kenooIconUrl: string | null,
  iconUrl: string | null,
): string {
  const kenoo = kenooIconUrl?.trim();
  if (kenoo) return kenoo;
  if (iconUrl) return iconUrl;
  return `https://assest.kenoo.io/app-icons/${slug}.png`;
}

function appHrefForApp(app: AppsRow): string {
  const subdomain = app.subdomain?.trim();
  if (subdomain) {
    return `https://${subdomain.replace(/^\.+|\.+$/g, "")}.${ROOT_DOMAIN}`;
  }

  const redirect = app.url_redirect?.trim();
  if (redirect && /^https?:\/\//i.test(redirect)) {
    return redirect.replace(/\/$/, "");
  }

  return process.env.NEXT_PUBLIC_WALLS_AGENCY_URL ?? "https://portal.kenoo.io";
}

/** Featured products for the marketing nav when Supabase is unavailable. */
export function featuredAppsFallback(): PublicApp[] {
  return FEATURED_PRODUCTS.map((product) => ({
    id: product.slug,
    slug: product.slug,
    name: product.name,
    description: product.description,
    icon: product.icon,
    href: marketingPathForSlug(product.slug),
    appHref: product.appHref,
  }));
}

export function mapAppsRows(rows: AppsRow[]): PublicApp[] {
  const featured = rows
    .filter(
      (row) =>
        !HIDDEN_SLUGS.has(row.slug) && FEATURED_SLUG_SET.has(row.slug),
    )
    .map((row) => ({
      id: row.id,
      slug: row.slug,
      name: row.name,
      description: row.description,
      icon: iconForApp(row.slug, row.kenoo_icon_urls, row.icon_url),
      href: marketingPathForSlug(row.slug),
      appHref: appHrefForApp(row),
    }));

  // Keep a stable marketing order: AdPilot, CRM, Health.
  const order = new Map<string, number>(
    FEATURED_PRODUCT_SLUGS.map((slug, index) => [slug, index]),
  );
  featured.sort(
    (a, b) => (order.get(a.slug) ?? 99) - (order.get(b.slug) ?? 99),
  );

  return featured.length > 0 ? featured : featuredAppsFallback();
}

export const PUBLIC_APPS_SELECT =
  "id, slug, name, description, icon_url, kenoo_icon_urls, subdomain, url_redirect";
