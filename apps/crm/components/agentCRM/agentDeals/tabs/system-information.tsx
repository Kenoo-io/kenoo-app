"use client";

import { format } from "date-fns";
import { FloatingLabelValue } from "@/components/ui/floating-label-input";

interface SystemInformationProps {
  formData: any;
  setFormData: (arg: any) => void;
  dealId: string;
}

export default function SystemInformation({ formData, setFormData, dealId }: SystemInformationProps) {
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
            <FloatingLabelValue label="Deal ID" value={dealId || "—"} />
            <FloatingLabelValue label="Next Step" value={formData.nextStep || "—"} />
            <FloatingLabelValue
              label="Probable Rev"
              value={formData.expectedRevenue || "—"}
            />
            <FloatingLabelValue
              label="Probability"
              value={formData.probability ? `${formData.probability}%` : "0%"}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <FloatingLabelValue label="Commission" value={formData.split || "—"} />
            <FloatingLabelValue
              label="Expected NET"
              value={formData.expectedNet || "—"}
            />
            <FloatingLabelValue
              label="Payment Due"
              value={
                formData.payoutDate
                  ? format(new Date(formData.payoutDate), "MMM d, yyyy")
                  : "—"
              }
            />
          </div>
        </div>
      </div>
    </div>
  );
}
