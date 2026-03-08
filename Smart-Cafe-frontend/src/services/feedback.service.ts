import api from "./api.config";

export interface Feedback {
  id: string;
  user: {
    _id: string;
    id: string;
    name: string;
    email: string;
  };
  booking?: {
    _id: string;
    id: string;
    tokenNumber: string;
  };
  rating: number;
  comment: string;
  aiSentimentScore: number;
  aiSentimentTag: "Positive" | "Neutral" | "Negative";
  aiTopics: string[];
  createdAt: string;
}

export interface FeedbackStats {
  total: number;
  positiveCount: number;
  negativeCount: number;
  neutralCount: number;
}

export interface GetFeedbackResponse {
  success: boolean;
  stats: FeedbackStats;
  data: Feedback[];
}

export const submitFeedback = async (
  bookingId: string | undefined,
  rating: number,
  comment: string
): Promise<Feedback> => {
  const response = await api.post("/feedback", { bookingId, rating, comment });
  return response.data.data;
};

export const getFeedback = async (filters?: {
  sentimentTag?: string;
  rating?: number;
}): Promise<GetFeedbackResponse> => {
  const params = new URLSearchParams();
  if (filters?.sentimentTag) params.append("sentimentTag", filters.sentimentTag);
  if (filters?.rating) params.append("rating", filters.rating.toString());

  const response = await api.get(`/feedback?${params.toString()}`);
  return response.data;
};
