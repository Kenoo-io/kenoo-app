"use client";

import * as React from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@walls/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@walls/ui/card";

import { FloatingLabelInput } from "@/components/ui/floating-label-input";
import { FloatingLabelSelect } from "@/components/ui/floating-label-select";
import type { MealWithItems } from "@/lib/meals-server";
import { formatCalories, mealTypeLabel } from "@/lib/format-health";
import type { MealType } from "@/lib/meals-server";

const MEAL_TYPES: MealType[] = [
  "breakfast",
  "lunch",
  "dinner",
  "snack",
  "other",
];

export function MealsPage() {
  const [meals, setMeals] = React.useState<MealWithItems[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [mealType, setMealType] = React.useState<MealType>("lunch");
  const [itemName, setItemName] = React.useState("");
  const [calories, setCalories] = React.useState("");
  const [protein, setProtein] = React.useState("");
  const [carbs, setCarbs] = React.useState("");
  const [fat, setFat] = React.useState("");

  const loadMeals = React.useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/meals");
      if (!response.ok) return;
      const payload = (await response.json()) as { meals?: MealWithItems[] };
      setMeals(payload.meals ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadMeals();
  }, [loadMeals]);

  const handleLogMeal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!itemName.trim() || !calories) return;

    setSaving(true);
    try {
      const response = await fetch("/api/meals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_type: mealType,
          items: [
            {
              name: itemName.trim(),
              calories: Number(calories),
              protein_g: protein ? Number(protein) : 0,
              carbs_g: carbs ? Number(carbs) : 0,
              fat_g: fat ? Number(fat) : 0,
            },
          ],
        }),
      });

      if (!response.ok) return;

      setItemName("");
      setCalories("");
      setProtein("");
      setCarbs("");
      setFat("");
      await loadMeals();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (mealId: string) => {
    await fetch(`/api/meals?id=${mealId}`, { method: "DELETE" });
    await loadMeals();
  };

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center px-6 py-16">
        <Loader2 className="h-4 w-4 animate-spin text-neutral-500" />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-kenoo-white px-6 py-8 md:px-10">
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-neutral-900">
            Meals
          </h1>
          <p className="mt-1 text-sm font-light text-neutral-500">
            Log what you ate today. Wallie can do this for you in chat soon.
          </p>
        </div>

        <Card className="rounded-xl border-neutral-200 shadow-none">
          <CardHeader>
            <CardTitle className="text-base font-medium">Quick log</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogMeal} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FloatingLabelSelect
                  label="Meal"
                  value={mealType}
                  onChange={(value) => setMealType(value as MealType)}
                  options={MEAL_TYPES.map((type) => ({
                    value: type,
                    label: mealTypeLabel(type),
                  }))}
                />
                <FloatingLabelInput
                  label="Food / meal"
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
                <FloatingLabelInput
                  type="number"
                  label="Calories"
                  value={calories}
                  onChange={(e) => setCalories(e.target.value)}
                />
                <FloatingLabelInput
                  type="number"
                  label="Protein (g)"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                />
                <FloatingLabelInput
                  type="number"
                  label="Carbs (g)"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                />
                <FloatingLabelInput
                  type="number"
                  label="Fat (g)"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                />
              </div>

              <Button
                type="submit"
                disabled={saving || !itemName.trim() || !calories}
                className="rounded-full bg-kenoo-yellow text-black hover:bg-kenoo-yellow"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                {saving ? "Saving…" : "Log meal"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h2 className="text-xs font-medium uppercase tracking-widest text-neutral-500">
            Today
          </h2>
          {meals.length === 0 ? (
            <p className="text-sm font-light text-neutral-400">
              No meals logged yet today.
            </p>
          ) : (
            meals.map((meal) => (
              <Card
                key={meal.id}
                className="rounded-xl border-neutral-200 shadow-none"
              >
                <CardContent className="flex items-start justify-between gap-4 pt-6">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-neutral-900">
                      {meal.name ?? mealTypeLabel(meal.meal_type)}
                    </p>
                    <p className="mt-0.5 text-xs font-light text-neutral-500">
                      {mealTypeLabel(meal.meal_type)} ·{" "}
                      {formatCalories(meal.calories)} cal
                    </p>
                    <ul className="mt-3 space-y-1">
                      {meal.items.map((item) => (
                        <li
                          key={item.id}
                          className="text-xs font-light text-neutral-600"
                        >
                          {item.name} — {formatCalories(item.calories)} cal
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-neutral-400 hover:text-red-600"
                    onClick={() => void handleDelete(meal.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
