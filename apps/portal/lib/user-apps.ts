import { getSupabaseClient, resolveAppHref } from "@walls/auth";

export type PortalLauncherApp = {
  app_id: string;
  name: string;
  slug: string;
  icon: string;
  href: string;
  subdomain?: string | null;
};

function pushApp(
  appList: PortalLauncherApp[],
  seen: Set<string>,
  appId: string,
  apps: unknown,
) {
  if (seen.has(appId)) return;
  if (!apps || typeof apps !== "object") return;

  const a = Array.isArray(apps) ? apps[0] : apps;
  if (
    !a ||
    typeof a !== "object" ||
    !("slug" in a) ||
    !("name" in a) ||
    a.slug == null ||
    a.name == null
  ) {
    return;
  }

  const slug = String(a.slug);
  const name = String(a.name);
  const urlRedirect =
    "url_redirect" in a && a.url_redirect != null
      ? String(a.url_redirect)
      : null;
  const subdomain =
    "subdomain" in a && a.subdomain != null ? String(a.subdomain) : null;
  const iconUrl =
    "icon_url" in a && a.icon_url
      ? String(a.icon_url)
      : `https://assets.wallsentertainment.com/walls-app-icons/${slug}.svg`;

  seen.add(appId);
  appList.push({
    app_id: appId,
    name,
    slug,
    icon: iconUrl,
    subdomain,
    href: resolveAppHref({
      slug,
      subdomain,
      urlRedirect,
      // Portal launcher should not fall back to /agents/* paths.
      platformBase: "",
    }),
  });
}

/** Load personal + account app grants for the portal launcher. */
export async function fetchUserLauncherApps(
  userId: string,
): Promise<PortalLauncherApp[]> {
  const supabase = getSupabaseClient();

  const [accessResult, membershipResult] = await Promise.all([
    supabase
      .from("user_app_access")
      .select(
        "app_id, order_index, apps(id, slug, name, icon_url, url_redirect, subdomain)",
      )
      .eq("user_id", userId)
      .order("order_index", { ascending: true }),
    supabase.from("account_users").select("account_id").eq("user_id", userId),
  ]);

  const accessRows = accessResult.data ?? [];
  const accountIds = (membershipResult.data ?? [])
    .map((row) => row.account_id)
    .filter((id): id is string => !!id);

  let accountAccessRows: { app_id: string; apps: unknown }[] = [];

  if (accountIds.length > 0) {
    const { data } = await supabase
      .from("account_app_access")
      .select(
        "app_id, apps(id, slug, name, icon_url, url_redirect, subdomain)",
      )
      .in("account_id", accountIds);
    accountAccessRows = data ?? [];
  }

  const appList: PortalLauncherApp[] = [];
  const seenAppIds = new Set<string>();

  accessRows.forEach((row: { app_id: string; apps: unknown }) => {
    pushApp(appList, seenAppIds, row.app_id, row.apps);
  });
  accountAccessRows.forEach((row) => {
    pushApp(appList, seenAppIds, row.app_id, row.apps);
  });

  return appList;
}
