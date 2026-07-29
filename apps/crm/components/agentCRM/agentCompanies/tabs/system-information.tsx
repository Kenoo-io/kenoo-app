"use client";

import { format, formatDistanceToNow } from "date-fns";
import { UserDisplay } from "@/components/ui/user-display";
import { FloatingLabelValue } from "@/components/ui/floating-label-input";

function formatTimestamp(timestamp: any) {
  if (!timestamp) return null;
  if (timestamp.seconds) {
    return format(new Date(timestamp.seconds * 1000), "MMM d, yyyy");
  }
  if (timestamp instanceof Date) {
    return format(timestamp, "MMM d, yyyy");
  }
  if (typeof timestamp === "string") {
    try {
      return format(new Date(timestamp), "MMM d, yyyy");
    } catch {
      return timestamp || null;
    }
  }
  return null;
}

function formatRelativeTime(timestamp: any) {
  if (!timestamp) return null;
  let date: Date;
  if (timestamp.seconds) {
    date = new Date(timestamp.seconds * 1000);
  } else if (timestamp instanceof Date) {
    date = timestamp;
  } else if (typeof timestamp === "string") {
    try {
      let dateString = timestamp.trim();
      if (dateString.includes(" ") && !dateString.includes("T")) {
        dateString = dateString.replace(" ", "T");
      }
      date = new Date(dateString);
      if (isNaN(date.getTime())) return null;
    } catch {
      return null;
    }
  } else {
    return null;
  }
  if (isNaN(date.getTime())) return null;
  return formatDistanceToNow(date, { addSuffix: true }).replace(/^about /i, "");
}

interface SystemInformationProps {
  formData: any;
}

export default function SystemInformation({ formData }: SystemInformationProps) {
  return (
    <div className="space-y-6">
      <div className="bg-kenoo-white rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">SYSTEM INFORMATION</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Left Column */}
          <div className="space-y-4">
            <FloatingLabelValue label="WALLS ID" value={formData.id || "—"} />
            <FloatingLabelValue label="Domain" value={formData.domain || "—"} />
            <FloatingLabelValue
              label="Apollo Org Name"
              value={formData.apollo_organization_name || formData.apolloOrganizationName || "—"}
            />
            <FloatingLabelValue
              label="Apollo Org ID"
              value={formData.apolloOrganizationId || "—"}
            />
            <FloatingLabelValue
              label="Apollo Account ID"
              value={formData.apolloAccountId || "—"}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <FloatingLabelValue
              label="Created by"
              value={
                formData.createdBy ? (
                  <UserDisplay
                    userId={formData.createdBy}
                    className="opacity-75 [&>span]:font-light [&>div:first-child]:hidden"
                  />
                ) : (
                  "WALLS"
                )
              }
            />
            <FloatingLabelValue
              label="Created at"
              value={formatTimestamp(formData.createdAt) || "—"}
            />
            <FloatingLabelValue
              label="Updated at"
              value={formatTimestamp(formData.updated_at || formData.updatedAt) || "—"}
            />
            <FloatingLabelValue
              label="Last enriched"
              value={formatRelativeTime(formData.lastEnriched) || "—"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
