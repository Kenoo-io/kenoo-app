"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Layers, Megaphone, Shapes, type LucideIcon } from "lucide-react";

import type { CampaignEntityType } from "@/lib/campaigns-server";
import { MID_LEVEL_LIST_TAB_LABEL } from "@/lib/entity-labels";
import { SegmentToggle } from "@/components/ui/segment-toggle";
import { cn } from "@walls/utils";

export const ENTITY_TABS: Array<{
  value: CampaignEntityType;
  label: string;
  icon: LucideIcon;
}> = [
  { value: "campaign", label: "Campaigns", icon: Megaphone },
  { value: "ad_group", label: MID_LEVEL_LIST_TAB_LABEL, icon: Layers },
  { value: "ad", label: "Ads", icon: Shapes },
];

export function CampaignsHeaderToggle() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  if (pathname !== "/campaigns") return null;

  const initialEntityType = searchParams.get("type");
  const entityType: CampaignEntityType =
    initialEntityType === "ad_group" || initialEntityType === "ad_sets"
      ? "ad_group"
      : initialEntityType === "ad"
        ? "ad"
        : "campaign";

  const handleEntityTypeChange = (nextEntityType: CampaignEntityType) => {
    const params = new URLSearchParams(searchParams.toString());

    if (nextEntityType === "campaign") {
      params.delete("type");
    } else if (nextEntityType === "ad_group") {
      params.set("type", "ad_sets");
    } else {
      params.set("type", nextEntityType);
    }

    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <SegmentToggle
      aria-label="Campaign entity type"
      value={entityType}
      onChange={handleEntityTypeChange}
      equalWidth
      equalWidthClassName="w-[22.5rem] grid-cols-3"
      className="border-0 bg-neutral-200/65 shadow-none"
      activeClassName="text-neutral-500"
      options={ENTITY_TABS.map((tab) => {
        const Icon = tab.icon;
        return {
          value: tab.value,
          label: tab.label,
          icon: (
            <Icon
              className={cn(
                "h-3.5 w-3.5 shrink-0",
                entityType === tab.value
                  ? "text-[var(--kenoo-sky)]/60"
                  : "text-neutral-400",
              )}
              strokeWidth={1.5}
            />
          ),
        };
      })}
    />
  );
}
