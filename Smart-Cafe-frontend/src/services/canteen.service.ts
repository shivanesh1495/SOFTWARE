import api from "./api.config";

// Types
export interface Canteen {
  id: string;
  _id?: string;
  name: string;
  location?: string;
  status: string;
  crowd: string;
  capacity: number;
  occupancy: number;
  isActive: boolean;
  imageUrl?: string | null;
  imageColor?: string;
  operatingHours?: {
    open: string;
    close: string;
  };
  ecoScore: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CanteenFieldConfig {
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "select" | "color-select" | "time";
  required?: boolean;
  maxLength?: number;
  min?: number;
  options?: string[];
  default?: string | number;
  autoComputed?: boolean;
}

export interface CanteenTableColumn {
  key: string;
  label: string;
  type:
    | "avatar-text"
    | "icon-text"
    | "badge"
    | "crowd-badge"
    | "occupancy"
    | "eco-score"
    | "toggle";
  icon?: string;
}

export interface CanteenColorOption {
  value: string;
  label: string;
}

export interface CanteenConfig {
  statuses: string[];
  crowdLevels: string[];
  ecoScores: string[];
  colorOptions: CanteenColorOption[];
  fields: CanteenFieldConfig[];
  tableColumns: CanteenTableColumn[];
}

// ========== CONFIG ENDPOINT ==========

/**
 * Get canteen configuration (enum values, field definitions, table columns)
 */
export const getCanteenConfig = async (): Promise<CanteenConfig> => {
  const response = await api.get("/canteens/config");
  return response.data.data;
};

// ========== PUBLIC ENDPOINTS ==========

/**
 * Get all canteens
 */
export const getCanteens = async (params?: {
  status?: string;
  isActive?: boolean;
  search?: string;
}): Promise<Canteen[]> => {
  const response = await api.get("/canteens", { params });
  return response.data.data?.canteens || response.data.data || [];
};

/**
 * Get canteen by ID
 */
export const getCanteenById = async (canteenId: string): Promise<Canteen> => {
  const response = await api.get(`/canteens/${canteenId}`);
  return response.data.data;
};

// ========== ADMIN ENDPOINTS ==========

/**
 * Create a new canteen (Admin only)
 */
export const createCanteen = async (
  data: Partial<Canteen>,
): Promise<Canteen> => {
  const response = await api.post("/canteens", data);
  return response.data.data;
};

/**
 * Update canteen (Admin only)
 */
export const updateCanteen = async (
  canteenId: string,
  data: Partial<Canteen>,
): Promise<Canteen> => {
  const response = await api.patch(`/canteens/${canteenId}`, data);
  return response.data.data;
};

/**
 * Delete canteen (Admin only)
 */
export const deleteCanteen = async (canteenId: string): Promise<void> => {
  await api.delete(`/canteens/${canteenId}`);
};

/**
 * Toggle canteen active status (Admin only)
 */
export const toggleCanteenStatus = async (
  canteenId: string,
): Promise<Canteen> => {
  const response = await api.patch(`/canteens/${canteenId}/toggle`);
  return response.data.data;
};

/**
 * Update canteen occupancy (Admin only)
 */
export const updateOccupancy = async (
  canteenId: string,
  occupancy: number,
): Promise<Canteen> => {
  const response = await api.patch(`/canteens/${canteenId}/occupancy`, {
    occupancy,
  });
  return response.data.data;
};
