import { Input as BorderlessInput } from "@/components/ui/borderless-input";
import { DealsStageSelect } from "@/components/ui/searches/deals-stage-search";
import { DealsLeadSourceSelect } from "@/components/ui/searches/deals-lead-source-search";
import { DealsTypeSelect } from "@/components/ui/searches/deals-type-search";
import { SequenceOwnerSelect } from "@/components/agentCRM/ui/sequence-owner-select";
import { calculateExpectedNet, calculateExpectedRevenue } from "./utils";

const fieldRowClass = "border-0 rounded-full bg-transparent hover:bg-gray-100 px-4 py-2 transition-colors";
const fieldLabelClass = "w-32 text-[11px] font-normal uppercase tracking-[0.16em] text-neutral-500";
const inputInnerClass =
  "border-0 bg-transparent px-0 text-[15px] font-light text-neutral-900 placeholder:text-neutral-300 focus-visible:ring-0 focus:ring-0";
const selectTriggerClass =
  "border-0 bg-transparent shadow-none min-h-9 h-full w-full flex items-center justify-between focus:ring-0 focus-visible:ring-0 hover:bg-transparent px-0 py-0 [&>*]:border-0 [&>*]:bg-transparent [&_*]:font-light [&_*]:text-neutral-900 [&_[data-placeholder]]:text-neutral-300";

interface BasicInformationProps {
  formData: any;
  setFormData: (data: any) => void;
  dealId: string;
}

export default function BasicInformation({ formData, setFormData, dealId }: BasicInformationProps) {
  return (
    <div className="space-y-6">
      {/* Deal Information Container */}
      <div className="bg-gray-50 rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">BASIC INFORMATION</h2>
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
                    value={formData.dealName || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, dealName: e.target.value }))}
                    className={inputInnerClass}
                    placeholder="Enter deal name"
                  />
                </div>
              </div>
            </div>
            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Stage</span>
                  <DealsStageSelect
                    value={formData.stage}
                    onValueChange={(value, probability, nextStep, stageId) => {
                      setFormData(prev => ({
                        ...prev,
                        stage: value,
                        probability: probability !== undefined ? probability.toString() : "0",
                        expectedNet: calculateExpectedNet(prev.amount, prev.split, probability !== undefined ? probability.toString() : "0"),
                        expectedRevenue: calculateExpectedRevenue(prev.amount, probability !== undefined ? probability.toString() : "0"),
                        nextStep: nextStep || "",
                        _dealStageId: stageId ?? (prev as any)._dealStageId,
                        _stageId: stageId,
                        _partnershipStageId: stageId
                      }));
                    }}
                    className={selectTriggerClass}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Deal Owner</span>
                  <SequenceOwnerSelect
                    value={formData.dealOwner ?? ""}
                    onValueChange={(value) => setFormData((prev: any) => ({ ...prev, dealOwner: value || "" }))}
                    className={selectTriggerClass}
                    hideEmail
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
                  <span className={fieldLabelClass}>Deal Source</span>
                  <DealsLeadSourceSelect
                    value={formData.leadSource}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, leadSource: value }))}
                    className={selectTriggerClass}
                  />
                </div>
              </div>
            </div>
            <div>
              <div className={fieldRowClass}>
                <div className="flex items-center gap-2">
                  <span className={fieldLabelClass}>Pipeline</span>
                  <DealsTypeSelect
                    value={formData.pipeline}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, pipeline: value }))}
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
