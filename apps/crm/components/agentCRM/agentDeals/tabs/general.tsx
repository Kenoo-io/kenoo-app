import {
  FloatingLabelField,
  FloatingLabelInput,
  floatingSelectTriggerClass,
} from "@/components/ui/floating-label-input";
import { DealsStageSelect } from "@/components/ui/searches/deals-stage-search";
import { DealsLeadSourceSelect } from "@/components/ui/searches/deals-lead-source-search";
import { DealsTypeSelect } from "@/components/ui/searches/deals-type-search";
import { SequenceOwnerSelect } from "@/components/agentCRM/ui/sequence-owner-select";
import { calculateExpectedNet, calculateExpectedRevenue } from "./utils";

interface BasicInformationProps {
  formData: any;
  setFormData: (data: any) => void;
  dealId: string;
}

export default function BasicInformation({ formData, setFormData, dealId }: BasicInformationProps) {
  return (
    <div className="space-y-6">
      {/* Deal Information Container */}
      <div className="bg-kenoo-white rounded-[30px] p-6">
        <div className="flex items-center mb-6">
          <h2 className="text-black font-black text-4xl">BASIC INFORMATION</h2>
          <div className="flex-1 border-t border-black h-[1px] mx-4" />
        </div>
        <div className="grid grid-cols-2 gap-4 items-start">
          {/* Left Column */}
          <div className="space-y-4">
            <FloatingLabelInput
              label="Name"
              value={formData.dealName || ''}
              onChange={(e) => setFormData(prev => ({ ...prev, dealName: e.target.value }))}
            />
            <FloatingLabelField label="Stage" hasValue={Boolean(formData.stage)}>
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
                className={floatingSelectTriggerClass}
              />
            </FloatingLabelField>
            <FloatingLabelField label="Deal Owner" hasValue={Boolean(formData.dealOwner)}>
              <SequenceOwnerSelect
                value={formData.dealOwner ?? ""}
                onValueChange={(value) => setFormData((prev: any) => ({ ...prev, dealOwner: value || "" }))}
                className={floatingSelectTriggerClass}
                hideEmail
              />
            </FloatingLabelField>
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <FloatingLabelField label="Deal Source" hasValue={Boolean(formData.leadSource)}>
              <DealsLeadSourceSelect
                value={formData.leadSource}
                onValueChange={(value) => setFormData(prev => ({ ...prev, leadSource: value }))}
                className={floatingSelectTriggerClass}
              />
            </FloatingLabelField>
            <FloatingLabelField label="Pipeline" hasValue={Boolean(formData.pipeline)}>
              <DealsTypeSelect
                value={formData.pipeline}
                onValueChange={(value) => setFormData(prev => ({ ...prev, pipeline: value }))}
                className={floatingSelectTriggerClass}
              />
            </FloatingLabelField>
          </div>
        </div>
      </div>
    </div>
  );
}
