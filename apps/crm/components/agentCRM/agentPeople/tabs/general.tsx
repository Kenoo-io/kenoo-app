import {
  FloatingLabelField,
  FloatingLabelInput,
  floatingSelectTriggerClass,
} from "@/components/ui/floating-label-input";
import { LeadSourceSelect } from "@/components/ui/searches/leads-lead-source-search";

interface BasicInformationProps {
  formData: any;
  handleInputChange: (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => void;
  duplicateEmail: string | null;
  handleSelectChange: (field: string) => (value: string) => void;
  personId?: string;
}

export default function BasicInformation({
  formData,
  handleInputChange,
  duplicateEmail,
  handleSelectChange,
}: BasicInformationProps) {
  return (
    <div className="space-y-6">
      <div className="bg-kenoo-white rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">PERSONAL INFORMATION</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
            <FloatingLabelInput
              label="First Name"
              value={formData.firstName || ""}
              onChange={handleInputChange("firstName")}
              className={duplicateEmail ? "text-red-500" : undefined}
            />

            <FloatingLabelInput
              label="Last Name"
              value={formData.lastName || ""}
              onChange={handleInputChange("lastName")}
            />

            <FloatingLabelInput
              label="Email"
              value={formData.email || ""}
              onChange={handleInputChange("email")}
              className={duplicateEmail ? "text-red-500" : undefined}
              error={duplicateEmail}
            />
          </div>

          <div className="space-y-4">
            <FloatingLabelInput
              label="Title"
              value={formData.title || ""}
              onChange={handleInputChange("title")}
            />

            <FloatingLabelInput
              label="Phone"
              value={formData.phone || ""}
              onChange={handleInputChange("phone")}
            />

            <FloatingLabelField label="Source" hasValue={Boolean(formData.source)}>
              <LeadSourceSelect
                value={formData.source}
                onValueChange={handleSelectChange("source")}
                className={floatingSelectTriggerClass}
              />
            </FloatingLabelField>
          </div>
        </div>
      </div>
    </div>
  );
}
