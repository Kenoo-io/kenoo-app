import {
  FloatingLabelInput,
  FloatingLabelTextarea,
} from "@/components/ui/floating-label-input";
import { useState } from "react";
import { BARE_DOMAIN_ERROR, isBareDomainInput } from "../lib/domain-utils";

interface BasicInformationProps {
  formData: any;
  handleInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleSelectChange: (field: string) => (value: string) => void;
  /** Persisted company domain — when set, domain is read-only in System Information only */
  savedDomain?: string | null;
}

export default function BasicInformation({ 
  formData, 
  handleInputChange,
  handleSelectChange,
  savedDomain,
}: BasicInformationProps) {
  const [domainError, setDomainError] = useState("");

  const handleDomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    handleInputChange("domain")(e);

    if (!value.trim()) {
      setDomainError("");
      return;
    }

    setDomainError(isBareDomainInput(value) ? "" : BARE_DOMAIN_ERROR);
  };

  return (
    <div className="space-y-6">
      {/* Display Information Container */}
      <div className="bg-kenoo-white rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">DISPLAY INFORMATION</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Left Column */}
          <div className="space-y-4">
            <FloatingLabelInput
              label="Name"
              value={formData.organization_name || ''}
              onChange={handleInputChange("organization_name")}
            />

            <FloatingLabelInput
              label="Country HQ"
              value={formData.country || ''}
              onChange={handleInputChange("country")}
            />

            {!savedDomain && (
              <FloatingLabelInput
                label="Domain"
                value={formData.domain || ''}
                onChange={handleDomainChange}
                error={domainError || null}
              />
            )}

            <FloatingLabelTextarea
              label="Company Overview"
              value={formData.shortDescription ?? ""}
              onChange={handleInputChange("shortDescription")}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <FloatingLabelInput
              label="Est. date"
              type="number"
              value={formData.foundingYear || ''}
              onChange={handleInputChange("foundingYear")}
            />

            <FloatingLabelInput
              label="Phone"
              value={formData.phone || ""}
              onChange={handleInputChange("phone")}
            />

            <FloatingLabelInput
              label="Industry"
              value={formData.industry || ''}
              onChange={handleInputChange("industry")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
