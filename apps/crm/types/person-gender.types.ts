export type PersonGender = "male" | "female" | "non_binary" | "other";

export const PERSON_GENDER_OPTIONS: { value: PersonGender; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
];

export function formatPersonGenderLabel(
  gender: string | null | undefined
): string {
  if (!gender) return "—";
  const match = PERSON_GENDER_OPTIONS.find((option) => option.value === gender);
  return match?.label ?? gender;
}
