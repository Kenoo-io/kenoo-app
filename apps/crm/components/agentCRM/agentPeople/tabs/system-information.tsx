"use client";

import { format, formatDistanceToNow } from "date-fns";
import { UserDisplay } from "@/components/ui/user-display";
import { SequenceSwitch } from "@/components/agentCRM/agentSequences/ui/sequence-switch";
import { ContactOwnerSelect } from "../ui/contact-owner-select";
import { AgentOption } from "../index/types";

const fieldRowClass = "border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2 transition-colors";
const fieldLabelClass = "w-40 text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500";
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
  personId?: string;
  isVerified?: boolean;
  onToggleVerified?: (checked: boolean) => void;
  contactOwner?: string | null;
  onContactOwnerChange?: (ownerId: string | null) => void;
  agents?: AgentOption[];
}

export default function SystemInformation({
  formData,
  personId,
  isVerified,
  onToggleVerified,
  contactOwner,
  onContactOwnerChange,
  agents,
}: SystemInformationProps) {
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
                <span className={fieldLabelClass}>Verified</span>
                <SequenceSwitch
                  checked={!!isVerified}
                  onCheckedChange={(checked) => onToggleVerified?.(checked)}
                />
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2 min-w-0">
                <span className={fieldLabelClass}>Contact owner</span>
                <ContactOwnerSelect
                  value={contactOwner}
                  agents={agents}
                  onValueChange={(ownerId) => onContactOwnerChange?.(ownerId)}
                  className="border-0 bg-transparent w-full [&>*]:border-0 [&>*]:bg-transparent [&_*]:font-light [&_*]:text-neutral-900 focus:ring-0 h-8 min-w-0 flex-1"
                />
              </div>
            </div>

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
                <span className={fieldLabelClass}>Last enriched</span>
                <span className={formatRelativeTime(formData.lastEnriched) ? fieldValueClass : fieldEmptyValueClass}>
                  {formatRelativeTime(formData.lastEnriched) || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>WALLS ID</span>
                <span className={personId ? fieldValueClass : fieldEmptyValueClass}>{personId || "—"}</span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Timezone</span>
                <span className={formData.timeZone ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.timeZone || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Last Contacted</span>
                <span className={formatTimestamp(formData.lastContacted) ? fieldValueClass : fieldEmptyValueClass}>
                  {formatTimestamp(formData.lastContacted) || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Apollo Contact ID</span>
                <span className={formData.apollo_contact_id ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.apollo_contact_id || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Apollo Person ID</span>
                <span className={formData.apollo_person_id ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.apollo_person_id || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Updated at</span>
                <span className={formatTimestamp(formData.updated_at) ? fieldValueClass : fieldEmptyValueClass}>
                  {formatTimestamp(formData.updated_at) || "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
