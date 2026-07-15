import { Input as BorderlessInput } from "@/components/ui/borderless-input";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { BARE_DOMAIN_ERROR, isBareDomainInput } from "../lib/domain-utils";

const fieldRowClass = "border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2 transition-colors";
const fieldLabelClass = "w-32 text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500";
const inputInnerClass =
  "border-0 bg-transparent px-0 text-[15px] font-light text-neutral-900 placeholder:text-neutral-300 focus-visible:ring-0 focus:ring-0";

function resizeDescriptionTextarea(el: HTMLTextAreaElement | null) {
  if (!el) return;
  const oneLineHeight = 36; // match h-9 / borderless input exactly
  if (!el.value.trim()) {
    el.style.height = `${oneLineHeight}px`;
    return;
  }
  el.style.height = "auto";
  el.style.height = `${Math.max(oneLineHeight, el.scrollHeight)}px`;
}

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
  const descriptionRef = useRef<HTMLTextAreaElement | null>(null);
  const [domainError, setDomainError] = useState("");

  useEffect(() => {
    resizeDescriptionTextarea(descriptionRef.current);
  }, [formData.shortDescription]);

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
      <div className="bg-gray-50 rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">DISPLAY INFORMATION</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Name</span>
                  <BorderlessInput
                    value={formData.organization_name || ''}
                    onChange={handleInputChange("organization_name")}
                    className={inputInnerClass}
                    placeholder="Organization Name"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Country HQ</span>
                  <BorderlessInput
                    value={formData.country || ''}
                    onChange={handleInputChange("country")}
                    className={inputInnerClass}
                    placeholder="Country HQ"
                  />
                </div>
              </div>
            </div>

            {!savedDomain && (
              <div>
                <div className={fieldRowClass}>
                  <div className="flex items-center gap-2">
                    <span className={fieldLabelClass}>Domain</span>
                    <BorderlessInput
                      value={formData.domain || ''}
                      onChange={handleDomainChange}
                      className={inputInnerClass}
                      placeholder="wallsentertainment.com"
                    />
                  </div>
                </div>
                {domainError && (
                  <p className="px-4 pt-1 text-xs text-red-500">{domainError}</p>
                )}
              </div>
            )}

            <div>
              <div className={fieldRowClass}>
                <div className="flex items-start gap-2">
                  <span className={cn(fieldLabelClass, "pt-2")}>Company Overview</span>
                  <textarea
                    ref={descriptionRef}
                    value={formData.shortDescription ?? ""}
                    onChange={(e) => {
                      handleInputChange("shortDescription")(e);
                      resizeDescriptionTextarea(descriptionRef.current);
                    }}
                    onFocus={(e) => resizeDescriptionTextarea(e.currentTarget)}
                    placeholder="Company description"
                    className="border-0 bg-transparent px-0 text-[15px] font-light text-neutral-900 placeholder:text-neutral-300 focus-visible:ring-0 focus:ring-0 focus:outline-none flex-1 w-full min-w-0 resize-none overflow-hidden h-9 min-h-9 max-h-[none] leading-tight"
                    style={{ paddingTop: "0.375rem", paddingBottom: "0.375rem" }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Est. date</span>
                  <BorderlessInput
                    type="number"
                    value={formData.foundingYear || ''}
                    onChange={handleInputChange("foundingYear")}
                    className={cn(inputInnerClass, "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none")}
                    placeholder="Est. date"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Phone</span>
                  <BorderlessInput
                    value={formData.phone || ""}
                    onChange={handleInputChange("phone")}
                    className={inputInnerClass}
                    placeholder="Phone"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Industry</span>
                  <BorderlessInput
                    value={formData.industry || ''}
                    onChange={handleInputChange("industry")}
                    className={inputInnerClass}
                    placeholder="Industry"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 