"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canadianProvinceCodeMapping } from "@/types/canadian-province.types";

interface CanadianProvinceSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

const PROVINCES = Object.entries(canadianProvinceCodeMapping)
  .map(([name, code]) => ({ name, code }))
  .sort((a, b) => a.name.localeCompare(b.name));

const CODE_TO_NAME: Record<string, string> = {};
PROVINCES.forEach((province) => {
  CODE_TO_NAME[province.code] = province.name;
});

export function CanadianProvinceSelect({
  value,
  onValueChange,
  className,
}: CanadianProvinceSelectProps) {
  const displayName = CODE_TO_NAME[value] || value;

  return (
    <Select value={value} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select a province">
          {value ? <span>{displayName}</span> : null}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {PROVINCES.map((province) => (
          <SelectItem key={province.code} value={province.code}>
            {province.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
