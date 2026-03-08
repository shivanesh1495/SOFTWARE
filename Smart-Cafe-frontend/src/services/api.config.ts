// API Configuration - Unified Backend
export const API_CONFIG = {
  // Main Backend (Node.js) - All API calls go here
  BASE_URL: "http://localhost:3000/api",

  // Alias for backward compatibility
  MAIN_BACKEND_URL: "http://localhost:3000/api",

  // Python Forecasting API (ML predictions)
  FORECAST_API_URL: "http://localhost:5001",
};

// Create axios instance with default config
import axios from "axios";

export const api = axios.create({
  baseURL: API_CONFIG.BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    // Allow 429 (Too Many Requests) to pass through with data
    // The AI service will return a proper error message in the response
    if (error.response?.status === 429) {
      return Promise.resolve(error.response);
    }
    return Promise.reject(error);
  },
);

export default api;
