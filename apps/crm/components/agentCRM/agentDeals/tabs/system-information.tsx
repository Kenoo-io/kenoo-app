"use client";

import { format } from "date-fns";

const fieldRowClass = "border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2 transition-colors";
const fieldLabelClass = "w-32 text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500";
const fieldValueClass = "text-[15px] font-light text-neutral-900 truncate";
const fieldEmptyValueClass = "text-[15px] font-light text-neutral-300";

interface SystemInformationProps {
  formData: any;
  setFormData: (arg: any) => void;
  dealId: string;
}

export default function SystemInformation({ formData, setFormData, dealId }: SystemInformationProps) {
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
                <span className={fieldLabelClass}>Deal ID</span>
                <span className={dealId ? fieldValueClass : fieldEmptyValueClass}>{dealId || "—"}</span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Next Step</span>
                <span className={formData.nextStep ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.nextStep || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Probable Rev</span>
                <span className={formData.expectedRevenue ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.expectedRevenue || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Probability</span>
                <span className={fieldValueClass}>
                  {formData.probability ? `${formData.probability}%` : "0%"}
                </span>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Commission</span>
                <span className={formData.split ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.split || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Expected NET</span>
                <span className={formData.expectedNet ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.expectedNet || "—"}
                </span>
              </div>
            </div>

            <div className={fieldRowClass}>
              <div className="flex items-center gap-2">
                <span className={fieldLabelClass}>Payment Due</span>
                <span className={formData.payoutDate ? fieldValueClass : fieldEmptyValueClass}>
                  {formData.payoutDate ? format(new Date(formData.payoutDate), "MMM d, yyyy") : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
