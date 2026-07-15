import { Input as BorderlessInput } from "@/components/ui/borderless-input";
import { LeadSourceSelect } from "@/components/ui/searches/leads-lead-source-search";
import { cn } from "@/lib/utils";

const fieldRowClass = "border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2 transition-colors";
const fieldLabelClass = "w-32 text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500";
const inputInnerClass =
  "border-0 bg-transparent px-0 text-[15px] font-light text-neutral-900 placeholder:text-neutral-300 focus-visible:ring-0 focus:ring-0";
const selectTriggerClass =
  "border-0 bg-transparent shadow-none min-h-9 h-full w-full flex items-center justify-between focus:ring-0 focus-visible:ring-0 hover:bg-transparent px-0 py-0 text-[15px] font-light text-neutral-900";

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
      <div className="bg-gray-50 rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">PERSONAL INFORMATION</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          <div className="space-y-4">
            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>First Name</span>
                  <BorderlessInput
                    placeholder="First Name"
                    value={formData.firstName || ""}
                    onChange={handleInputChange("firstName")}
                    className={cn(inputInnerClass, duplicateEmail ? "text-red-500" : "")}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Last Name</span>
                  <BorderlessInput
                    placeholder="Last Name"
                    value={formData.lastName || ""}
                    onChange={handleInputChange("lastName")}
                    className={inputInnerClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Email</span>
                  <BorderlessInput
                    placeholder="Email"
                    value={formData.email || ""}
                    onChange={handleInputChange("email")}
                    className={cn(inputInnerClass, duplicateEmail ? "text-red-500" : "")}
                  />
                </div>
              </div>
              {duplicateEmail && (
                <p className="text-sm text-red-500 mt-1 px-4">{duplicateEmail}</p>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Title</span>
                  <BorderlessInput
                    placeholder="Job title"
                    value={formData.title || ""}
                    onChange={handleInputChange("title")}
                    className={inputInnerClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Phone</span>
                  <BorderlessInput
                    placeholder="Phone"
                    value={formData.phone || ""}
                    onChange={handleInputChange("phone")}
                    className={inputInnerClass}
                  />
                </div>
              </div>
            </div>

            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Source</span>
                  <LeadSourceSelect
                    value={formData.source}
                    onValueChange={handleSelectChange("source")}
                    className={selectTriggerClass}
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
