"use client";

import { format, formatDistanceToNow } from "date-fns";
import { UserDisplay } from "@/components/ui/user-display";

const fieldRowClass = "border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2 transition-colors";
const fieldLabelClass = "w-48 text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500";
const fieldValueClass = "text-[15px] font-light text-neutral-900 truncate";
const fieldEmptyValueClass = "text-[15px] font-light text-neutral-300";

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
      <div className="bg-gray-50 rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">SYSTEM INFORMATION</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Left Column */}
          <div className="space-y-4">
            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>WALLS ID</span>
                <span className={formData.id ? fieldValueClass : fieldEmptyValueClass}>{formData.id || "—"}</span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Domain</span>
                <span className={formData.domain ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.domain || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Apollo Org Name</span>
                <span className={(formData.apollo_organization_name || formData.apolloOrganizationName) ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.apollo_organization_name || formData.apolloOrganizationName || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Apollo Org ID</span>
                <span className={formData.apolloOrganizationId ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.apolloOrganizationId || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Apollo Account ID</span>
                <span className={formData.apolloAccountId ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.apolloAccountId || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Created by</span>
                {formData.createdBy ? (
                  <UserDisplay
                    userId={formData.createdBy}
                    className="opacity-75 [&>span]:font-light [&>div:first-child]:hidden"
                  />
                ) : (
                  <span className={fieldValueClass}>WALLS</span>
                )}
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Created at</span>
                <span className={formatTimestamp(formData.createdAt) ? fieldValueClass : fieldEmptyValueClass}>
                  {formatTimestamp(formData.createdAt) || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Updated at</span>
                <span className={formatTimestamp(formData.updated_at || formData.updatedAt) ? fieldValueClass : fieldEmptyValueClass}>
                  {formatTimestamp(formData.updated_at || formData.updatedAt) || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Last enriched</span>
                <span className={formatRelativeTime(formData.lastEnriched) ? fieldValueClass : fieldEmptyValueClass}>
                  {formatRelativeTime(formData.lastEnriched) || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
