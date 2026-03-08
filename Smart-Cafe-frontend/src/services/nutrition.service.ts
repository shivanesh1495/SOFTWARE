import api from "./api.config";

export interface NutrientEstimate {
  itemName: string;
  calories: number;
  proteinGrams: number;
  carbsGrams: number;
  fatGrams: number;
  fiberGrams: number;
  sugarGrams: number;
}

export interface BestNutritionItem {
  itemName: string;
  reason: string;
}

export interface NutritionResponse {
  items: NutrientEstimate[];
  bestItem?: BestNutritionItem | null;
  model?: string;
  fallback?: boolean;
  note?: string;
}

export const getNutritionForItems = async (
  itemNames: string[],
): Promise<NutritionResponse> => {
  const response = await api.post("/ai/nutrients", { itemNames });
  return response.data.data;
};
