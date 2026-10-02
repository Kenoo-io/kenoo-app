import assert from "node:assert/strict";
import test from "node:test";

import { HEALTH_LOG_MEAL_INPUT_SCHEMA } from "./server.js";

test("accepts the canonical meal payload", () => {
  const result = HEALTH_LOG_MEAL_INPUT_SCHEMA.safeParse({
    mealType: "breakfast",
    name: "Quaker Dino Eggs oatmeal",
    items: [{
      name: "Quaker Dino Eggs oatmeal",
      quantity: 4,
      servingUnit: "packs",
      calories: 600,
      proteinG: 12,
      carbsG: 112,
      fatG: 12,
    }],
  });

  assert.equal(result.success, true);
});

test("normalizes action-style aliases and numeric strings", () => {
  const result = HEALTH_LOG_MEAL_INPUT_SCHEMA.parse({
    meal_type: "Breakfast",
    meal_date: "2026-10-02",
    items: {
      name: "Quaker Dino Eggs oatmeal",
      quantity: "4",
      serving_unit: "packs",
      calories: "600",
      protein_g: "12",
      carbs_g: "112",
      fat_g: "12",
    },
  });

  assert.equal(result.mealType, "breakfast");
  assert.equal(result.mealDate, "2026-10-02");
  assert.deepEqual(result.items[0], {
    name: "Quaker Dino Eggs oatmeal",
    quantity: 4,
    servingUnit: "packs",
    calories: 600,
    proteinG: 12,
    carbsG: 112,
    fatG: 12,
    fiberG: 0,
    sugarG: 0,
    sodiumMg: 0,
  });
});

test("normalizes a flat one-item meal", () => {
  const result = HEALTH_LOG_MEAL_INPUT_SCHEMA.parse({
    mealType: "breakfast",
    name: "Quaker Dino Eggs oatmeal",
    quantity: 4,
    servingUnit: "packs",
    calories: 600,
    proteinG: 12,
    carbsG: 112,
    fatG: 12,
  });

  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].calories, 600);
});

test("continues to reject unsafe nutrition values", () => {
  const result = HEALTH_LOG_MEAL_INPUT_SCHEMA.safeParse({
    mealType: "breakfast",
    items: [{ name: "Invalid meal", calories: -1 }],
  });

  assert.equal(result.success, false);
});
