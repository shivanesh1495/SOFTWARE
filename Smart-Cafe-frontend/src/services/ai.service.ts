import api from "./api.config";
import type { MenuItem } from "./menu.service";

export interface AIRecommendation {
  item: MenuItem;
  reason: string;
}

export const getAIRecommendations = async (): Promise<AIRecommendation[]> => {
  const response = await api.get("/ai/recommendations");
  return response.data.data;
};

export interface DietRecommendation {
  id: string;
  name: string;
  reason: string;
  calories_est: number;
}

export interface DietCheckResponse {
  recommendations: DietRecommendation[];
  summary: string;
  fallback?: boolean;
}

export const getDietRecommendations = async (
  dietType: string,
): Promise<DietCheckResponse> => {
  const response = await api.post("/ai/diet-check", { dietType });
  if (response.status === 429) {
    throw {
      status: 429,
      message: response.data.message,
      retryAfterSeconds: response.data.data?.retryAfterSeconds,
    };
  }
  return response.data.data;
};

export const sendChatMessage = async (
  messages: { role: string; content: string }[],
) => {
  const response = await api.post("/ai/chat", { messages });

  // Handle rate limit (429) responses
  if (response.status === 429) {
    throw {
      status: 429,
      message: response.data.message,
      retryAfterSeconds: response.data.data?.retryAfterSeconds,
    };
  }

  // Handle errors marked in response but with 200 status
  if (response.data && !response.data.success) {
    throw {
      status: response.status,
      message: response.data.message,
      data: response.data.data,
    };
  }

  return response.data.data;
};

// DISABLED - Removed to conserve API credits
// export interface AIInventoryInsight { ... }
// export const getInventoryInsights = async (): Promise<AIInventoryInsight[]> { ... }

// DISABLED - Removed to conserve API credits
// export interface AIQueuePrediction { ... }
// export const predictQueueWaitTime = async (...) { ... }
