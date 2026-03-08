export type Role =
  | "user"
  | "canteen_staff"
  | "kitchen_staff"
  | "counter_staff"
  | "manager"
  | "admin";

export interface User {
  id: string;
  name: string;
  fullName?: string;
  email: string;
  role: Role;
  avatar?: string;
  status?: "active" | "suspended";
  isOnline?: boolean;
  canteenId?: string;
  segment?: "student" | "faculty" | "guest" | "vip";
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}
