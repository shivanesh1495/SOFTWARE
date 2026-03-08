import api from "./api.config";

// Types
export interface WasteReport {
  id: string;
  user: string;
  booking?: string;
  date: string;
  wasteAmount: "None" | "Little" | "Some" | "Most" | "All";
  reason?: string;
  notes?: string;
  mealType?: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
  createdAt: string;
}

export interface WasteStats {
  byWasteAmount: { _id: string; count: number }[];
  byReason: { _id: string; count: number }[];
  dailyTrend: { _id: string; totalReports: number; highWasteCount: number }[];
  averageEcoScore: number;
  totalReports: number;
}

export interface SustainabilityMetrics {
  currentEcoScore: number;
  globalEcoScore: number;
  previousEcoScore: number;
  improvement: number;
  totalReportsThisMonth: number;
}

// ========== USER ENDPOINTS ==========

/**
 * Submit waste report
 */
export const submitWasteReport = async (data: {
  bookingId?: string;
  wasteAmount: string;
  reason?: string;
  notes?: string;
  mealType?: string;
}): Promise<WasteReport> => {
  const response = await api.post("/sustainability/waste-report", data);
  return response.data.data;
};

/**
 * Get user's waste reports
 */
export const getMyWasteReports = async (params?: {
  page?: number;
  limit?: number;
}): Promise<{
  reports: WasteReport[];
  total: number;
  hasNextPage?: boolean;
  page?: number;
}> => {
  const response = await api.get("/sustainability/my-reports", { params });
  const data = response.data.data;
  // Handle both paginated shape { items, pagination } and legacy { reports, total }
  if (data?.items) {
    return {
      reports: data.items,
      total: data.pagination?.total ?? data.items.length,
      hasNextPage: data.pagination?.hasNextPage ?? false,
      page: data.pagination?.page ?? 1,
    };
  }
  return {
    reports: data?.reports || data?.data || [],
    total: data?.total ?? 0,
  };
};

// ========== MANAGEMENT ENDPOINTS ==========

/**
 * Get waste statistics (Management only)
 */
export const getWasteStats = async (params?: {
  startDate?: string;
  endDate?: string;
  mealType?: string;
}): Promise<WasteStats> => {
  const response = await api.get("/sustainability/stats", { params });
  return response.data.data;
};

/**
 * Get sustainability metrics (Management only)
 */
export const getSustainabilityMetrics =
  async (): Promise<SustainabilityMetrics> => {
    const response = await api.get("/sustainability/metrics");
    return response.data.data;
  };

// ========== DONATION ENDPOINTS ==========

export interface Donation {
  _id: string;
  items: {
    name?: string;
    itemName?: string;
    quantity: number;
    unit?: string;
  }[];
  totalQuantity: number;
  donatedTo: string;
  mealType?: string;
  notes?: string;
  status: "pending" | "donated" | "expired";
  date: string;
  loggedBy?: { fullName: string };
}

export const logDonation = async (data: {
  items: { itemName: string; quantity: number }[];
  totalQuantity: number;
  donatedTo?: string;
  mealType?: string;
  notes?: string;
  canteenId?: string;
}): Promise<Donation> => {
  const response = await api.post("/sustainability/donations", data);
  return response.data.data;
};

export const getDonationHistory = async (params?: {
  status?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<Donation[]> => {
  const response = await api.get("/sustainability/donations", { params });
  return response.data.data;
};
