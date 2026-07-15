"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  PERSON_GENDER_OPTIONS,
  type PersonGender,
} from "@/types/person-gender.types";

interface PersonGenderSelectProps {
  value: PersonGender | "";
  onValueChange: (value: PersonGender | "") => void;
  className?: string;
}

export function PersonGenderSelect({
  value,
  onValueChange,
  className,
}: PersonGenderSelectProps) {
  return (
    <Select
      value={value || undefined}
      onValueChange={(next) => onValueChange(next as PersonGender)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Select gender" />
      </SelectTrigger>
      <SelectContent>
        {PERSON_GENDER_OPTIONS.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
