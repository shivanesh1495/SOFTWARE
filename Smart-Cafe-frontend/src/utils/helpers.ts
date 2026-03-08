/**
 * Maps a user role to the corresponding dashboard path.
 * Centralizes role→path routing used in login, signup, ProtectedRoute, etc.
 */
export function getRoleDashboardPath(role: string): string {
  const normalized = role?.toLowerCase().replace(/_/g, "") as string;
  switch (normalized) {
    case "user":
      return "/user/dashboard";
    case "canteenstaff":
    case "canteen_staff":
    case "kitchenstaff":
    case "kitchen_staff":
    case "counterstaff":
    case "counter_staff":
      return "/canteen-staff/dashboard";
    case "manager":
      return "/manager/dashboard";
    case "admin":
      return "/admin/dashboard";
    default:
      return "/auth/login";
  }
}

/**
 * Extracts a user-friendly error message from an unknown error.
 * Use instead of `(error as any).message`.
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && error !== null && "message" in error) {
    return String((error as { message: string }).message);
  }
  if (typeof error === "string") return error;
  return "An unexpected error occurred";
}

/**
 * Get display-friendly time for a slot. Handles various data shapes from the API.
 */
export function getSlotTimeDisplay(slot: Record<string, unknown>): string {
  return String(slot?.startTime || slot?.time || slot?.start_time || "N/A");
}

/**
 * Get display-friendly user name from a booking.
 */
export function getBookingUserName(booking: Record<string, unknown>): string {
  const user = booking?.user as Record<string, unknown> | undefined;
  return String(
    user?.name || user?.fullName || booking?.guestName || "Student",
  );
}

/**
 * Normalize an API object's `_id` field to `id`.
 * Handles MongoDB `_id` → frontend `id` conversion at the service layer.
 */
export function normalizeId<T extends Record<string, unknown>>(
  obj: T,
): T & { id: string } {
  return {
    ...obj,
    id: String(obj.id || obj._id || ""),
  };
}

/**
 * Normalize an array of API objects.
 */
export function normalizeIds<T extends Record<string, unknown>>(
  arr: T[],
): (T & { id: string })[] {
  return arr.map(normalizeId);
}

/**
 * Format a date string for display.
 */
export function formatDate(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format a time string for display.
 */
export function formatTime(dateStr: string | Date): string {
  const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Format currency in INR.
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
