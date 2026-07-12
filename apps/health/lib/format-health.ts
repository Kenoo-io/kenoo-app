export function formatCalories(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

export function formatGrams(value: number): string {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value >= 100 ? 0 : 1,
  }).format(value)}g`;
}

export function formatWeightKg(kg: number, unitSystem: "metric" | "imperial"): string {
  if (unitSystem === "imperial") {
    const lbs = kg * 2.20462;
    return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(lbs)} lb`;
  }
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(kg)} kg`;
}

export function formatHeightCm(cm: number, unitSystem: "metric" | "imperial"): string {
  if (unitSystem === "imperial") {
    const totalInches = cm / 2.54;
    const feet = Math.floor(totalInches / 12);
    const inches = Math.round(totalInches % 12);
    return `${feet}'${inches}"`;
  }
  return `${Math.round(cm)} cm`;
}

export function mealTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    breakfast: "Breakfast",
    lunch: "Lunch",
    dinner: "Dinner",
    snack: "Snack",
    other: "Other",
  };
  return labels[type] ?? type;
}

export function activityTypeLabel(type: string): string {
  return type
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
