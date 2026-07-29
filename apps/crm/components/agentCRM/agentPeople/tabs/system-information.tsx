"use client";

import { format, formatDistanceToNow } from "date-fns";
import { UserDisplay } from "@/components/ui/user-display";
import { SequenceSwitch } from "@/components/agentCRM/agentSequences/ui/sequence-switch";
import { ContactOwnerSelect } from "../ui/contact-owner-select";
import { AgentOption } from "../index/types";
import {
  FloatingLabelField,
  FloatingLabelValue,
  floatingSelectTriggerClass,
} from "@/components/ui/floating-label-input";

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
      <div className="bg-kenoo-white rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">SYSTEM INFORMATION</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Left Column */}
          <div className="space-y-4">
            {/* A switch has no resting state to reveal, so its label stays floated. */}
            <FloatingLabelField label="Verified" hasValue>
              <div className="flex h-12 items-center">
                <SequenceSwitch
                  checked={!!isVerified}
                  onCheckedChange={(checked) => onToggleVerified?.(checked)}
                />
              </div>
            </FloatingLabelField>

            {/* The trigger always renders "Unassigned", so never rest the label over it. */}
            <FloatingLabelField label="Contact owner" hasValue>
              <ContactOwnerSelect
                value={contactOwner}
                agents={agents}
                onValueChange={(ownerId) => onContactOwnerChange?.(ownerId)}
                className={floatingSelectTriggerClass}
              />
            </FloatingLabelField>

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
              label="Last enriched"
              value={formatRelativeTime(formData.lastEnriched) || "—"}
            />

            <FloatingLabelValue label="WALLS ID" value={personId || "—"} />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <FloatingLabelValue label="Timezone" value={formData.timeZone || "—"} />

            <FloatingLabelValue
              label="Last Contacted"
              value={formatTimestamp(formData.lastContacted) || "—"}
            />

            <FloatingLabelValue
              label="Apollo Contact ID"
              value={formData.apollo_contact_id || "—"}
            />

            <FloatingLabelValue
              label="Apollo Person ID"
              value={formData.apollo_person_id || "—"}
            />

            <FloatingLabelValue
              label="Updated at"
              value={formatTimestamp(formData.updated_at) || "—"}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
