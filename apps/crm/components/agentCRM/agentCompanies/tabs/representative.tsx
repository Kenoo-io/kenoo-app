"use client";

import { SequenceSwitch } from "@/components/agentCRM/agentSequences/ui/sequence-switch";

interface RepresentativeProps {
  formData: any;
  onToggleChange: (value: boolean) => void;
}

export default function Representative({ formData, onToggleChange }: RepresentativeProps) {
  return (
    <div className="bg-gray-50 rounded-[30px] p-6">
      <div className="flex items-center">
        <h2 className="text-black font-black text-4xl">REPRESENTATIVE</h2>
        <div className="flex-1 border-t border-black h-[1px] mx-4" />
        <SequenceSwitch
          checked={formData.is_representative || false}
          onCheckedChange={onToggleChange}
          className="h-8 w-16 [&>span]:h-7 [&>span]:w-7 [&>span]:data-[state=checked]:translate-x-[2rem]"
        />
      </div>
    </div>
  );
}
