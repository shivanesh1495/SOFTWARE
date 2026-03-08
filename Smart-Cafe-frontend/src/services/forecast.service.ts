import api from "./api.config";

// Types
export interface DailyForecast {
  date: string;
  forecasts: MealForecast[];
}

export interface MealForecast {
  id: string;
  date: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
  predictedCount: number;
  actualCount?: number;
  accuracy?: number;
  weatherCondition: string;
  isSpecialPeriod: boolean;
  specialPeriodType: string;
}

export interface AccuracyMetrics {
  byMealType: {
    _id: string;
    averageAccuracy: number;
    mae: number;
    rmse: number;
    count: number;
  }[];
  overall: {
    overallAccuracy: number;
    totalForecasts: number;
    mae: number;
    rmse: number;
    mape: number;
  };
  trend?: {
    date: string;
    mealType: string;
    predicted: number;
    actual: number;
    accuracy: number;
  }[];
}

export interface HourlyForecast {
  hour: number;
  label: string;
  mealType: string;
  predicted: number;
  actual?: number | null;
  dataSource?: "learned" | "default";
}

export interface CategoryForecast {
  mealType: string;
  totalPredicted: number;
  items: {
    itemId: string;
    itemName: string;
    dietaryType: string;
    predicted: number;
  }[];
}

export interface TrendData {
  weekStart?: string;
  weekEnd?: string;
  month?: string;
  year?: number;
  totalPredicted: number;
  totalActual: number;
  avgAccuracy: number | null;
  forecastCount: number;
}

export interface WeatherImpact {
  weatherDrivers: { factor: string; importance: number }[];
  metrics: Record<string, number>;
  chartData: any[];
  totalRecords?: number;
  averageDemand?: number;
}

export interface ForecastConfigType {
  _id: string;
  name: string;
  version: string;
  parameters: Record<string, any>;
  isActive: boolean;
  accuracy?: Record<string, number>;
  createdAt: string;
}

// Legacy types for backward compatibility
export interface ForecastInput {
  Day_of_Week: string;
  Meal_Type: string;
  Is_Veg: boolean;
  Event_Context: string;
  Weather: string;
}

export interface ForecastResponse {
  prediction: number;
  input: ForecastInput;
}

export interface AnalyticsResponse {
  total_records: number;
  average_demand: number;
  metrics: {
    mape: number;
    rmse: number;
  };
  top_drivers: { factor: string; importance: number }[];
  chart_data: { day: string; actual: number; predicted: number }[];
}

// ========== FORECAST ENDPOINTS ==========

export const getDailyForecast = async (
  date?: string,
  canteenId?: string,
): Promise<DailyForecast> => {
  const params: Record<string, string> = {};
  if (date) params.date = date;
  if (canteenId) params.canteenId = canteenId;
  const response = await api.get("/forecast/daily", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return response.data.data;
};

export const getWeeklyForecast = async (
  startDate?: string,
  canteenId?: string,
): Promise<DailyForecast[]> => {
  const params: Record<string, string> = {};
  if (startDate) params.startDate = startDate;
  if (canteenId) params.canteenId = canteenId;
  const response = await api.get("/forecast/weekly", {
    params: Object.keys(params).length > 0 ? params : undefined,
  });
  return response.data.data;
};

export const getHourlyForecast = async (
  date: string,
  canteenId?: string,
): Promise<HourlyForecast[]> => {
  const response = await api.get(`/forecast/hourly/${date}`, {
    params: canteenId ? { canteenId } : undefined,
  });
  return response.data.data;
};

export const getCategoryForecast = async (
  date: string,
  canteenId?: string,
): Promise<CategoryForecast[]> => {
  const response = await api.get(`/forecast/category/${date}`, {
    params: canteenId ? { canteenId } : undefined,
  });
  return response.data.data;
};

export const getAccuracyMetrics = async (params?: {
  startDate?: string;
  endDate?: string;
  mealType?: string;
}): Promise<AccuracyMetrics> => {
  const response = await api.get("/forecast/accuracy", { params });
  return response.data.data;
};

export const getWeeklyTrends = async (weeks?: number): Promise<TrendData[]> => {
  const response = await api.get("/forecast/trends/weekly", {
    params: weeks ? { weeks } : undefined,
  });
  return response.data.data;
};

export const getMonthlyTrends = async (
  months?: number,
): Promise<TrendData[]> => {
  const response = await api.get("/forecast/trends/monthly", {
    params: months ? { months } : undefined,
  });
  return response.data.data;
};

export const getWeatherImpact = async (): Promise<WeatherImpact> => {
  const response = await api.get("/forecast/weather-impact");
  return response.data.data;
};

export const recordActual = async (
  date: string,
  mealType: string,
  actualCount: number,
): Promise<MealForecast> => {
  const response = await api.post("/forecast/record-actual", {
    date,
    mealType,
    actualCount,
  });
  return response.data.data;
};

export const getForecastConfigs = async (): Promise<ForecastConfigType[]> => {
  const response = await api.get("/forecast/configs");
  return response.data.data;
};

export const createForecastConfig = async (data: {
  name: string;
  version: string;
  parameters: Record<string, any>;
}): Promise<ForecastConfigType> => {
  const response = await api.post("/forecast/configs", data);
  return response.data.data;
};

export const activateForecastConfig = async (
  id: string,
): Promise<ForecastConfigType> => {
  const response = await api.post(`/forecast/configs/${id}/activate`);
  return response.data.data;
};

// ========== LEGACY FUNCTIONS (for backward compatibility) ==========

export const getForecast = async (
  data: ForecastInput,
): Promise<ForecastResponse> => {
  const today = new Date().toISOString().split("T")[0];
  const dailyForecast = await getDailyForecast(today);

  const mealForecast = dailyForecast.forecasts.find(
    (f) => f.mealType === data.Meal_Type.toUpperCase(),
  );

  return {
    prediction: mealForecast?.predictedCount || 0,
    input: data,
  };
};

export const getAnalytics = async (): Promise<AnalyticsResponse> => {
  const metrics = await getAccuracyMetrics();
  const weekly = await getWeeklyForecast();

  return {
    total_records: metrics.overall.totalForecasts,
    average_demand: 0,
    metrics: {
      mape:
        metrics.overall.mape || 100 - (metrics.overall.overallAccuracy || 0),
      rmse: metrics.overall.rmse || 0,
    },
    top_drivers: [],
    chart_data: weekly.flatMap((day) =>
      day.forecasts.map((f) => ({
        day: day.date,
        actual: f.actualCount || 0,
        predicted: f.predictedCount,
      })),
    ),
  };
};
