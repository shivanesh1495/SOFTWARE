import api from "./api.config";

// Types
export interface Slot {
  id: string;
  date: string;
  mealType: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
  startTime: string;
  endTime: string;
  canteenId?: string;
  capacity: number;
  booked: number;
  available: number;
  status: "AVAILABLE" | "FULL" | "CANCELLED";
  isSystemSlot?: boolean;
  isDisabled?: boolean;
}

export interface BookingItem {
  menuItem: string;
  quantity: number;
  price: number;
  portionSize?: "Regular" | "Small";
}

export interface Booking {
  id: string;
  user: string;
  slot: Slot;
  tokenNumber: string;
  items: BookingItem[];
  totalAmount: number;
  status: "pending" | "confirmed" | "completed" | "cancelled" | "no_show";
  isWalkin?: boolean;
  guestName?: string;
  allocationReason?: string;
  createdAt: string;
  completedAt?: string;
  cancelledAt?: string;
}

const parseSlotTimeRange = (
  time?: string,
): { startTime: string; endTime: string } => {
  const to12Hour = (value: string): string => {
    const text = String(value || "").trim();
    if (!text) return "";

    const ampmMatch = text.match(/^(\d{1,2}):(\d{2})\s*([AP]M)$/i);
    if (ampmMatch) {
      const hours = Number(ampmMatch[1]);
      const minutes = ampmMatch[2];
      const period = ampmMatch[3].toUpperCase();
      if (hours >= 1 && hours <= 12) {
        return `${String(hours).padStart(2, "0")}:${minutes} ${period}`;
      }
      return text;
    }

    const hhmmMatch = text.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!hhmmMatch) return text;

    const hours24 = Number(hhmmMatch[1]);
    const minutes = hhmmMatch[2];
    const period = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12;
    return `${String(hours12).padStart(2, "0")}:${minutes} ${period}`;
  };

  if (!time) {
    return { startTime: "", endTime: "" };
  }
  const delimiter = time.includes("-")
    ? "-"
    : time.includes("–")
      ? "–"
      : time.includes("—")
        ? "—"
        : "";
  if (!delimiter) {
    return { startTime: to12Hour(time), endTime: "" };
  }
  const parts = time
    .split(delimiter)
    .map((part) => part.trim())
    .filter(Boolean);
  return {
    startTime: to12Hour(parts[0] || time),
    endTime: to12Hour(parts[1] || ""),
  };
};

const normalizeSlot = (slot: any): Slot => {
  if (!slot) return slot;
  const { startTime, endTime } = parseSlotTimeRange(slot.time);

  const normalizePart = (value?: string) => {
    const text = String(value || "").trim();
    if (!text) return "";
    const hhmm = text.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
    if (!hhmm) return text;
    const h24 = Number(hhmm[1]);
    const mm = hhmm[2];
    const period = h24 >= 12 ? "PM" : "AM";
    const h12 = h24 % 12 || 12;
    return `${String(h12).padStart(2, "0")}:${mm} ${period}`;
  };

  return {
    ...slot,
    startTime: normalizePart(slot.startTime) || startTime,
    endTime: normalizePart(slot.endTime) || endTime,
  } as Slot;
};

const normalizeBooking = (booking: any): Booking => {
  if (!booking) return booking;
  return {
    ...booking,
    slot: booking.slot ? normalizeSlot(booking.slot) : booking.slot,
  } as Booking;
};

// ========== SLOT ENDPOINTS ==========

/**
 * Get today's available slots
 */
export const getTodaySlots = async (): Promise<Slot[]> => {
  const response = await api.get("/slots/today");
  const slots =
    response.data.data?.slots ||
    response.data.data?.items ||
    response.data.data ||
    [];
  return Array.isArray(slots) ? slots.map(normalizeSlot) : [];
};

export const getTodaySlotsByCanteen = async (
  canteenId?: string,
): Promise<Slot[]> => {
  const response = await api.get("/slots/today", {
    params: canteenId ? { canteenId } : undefined,
  });
  const slots =
    response.data.data?.slots ||
    response.data.data?.items ||
    response.data.data ||
    [];
  return Array.isArray(slots) ? slots.map(normalizeSlot) : [];
};

/**
 * Get slots with filters
 */
export const getSlots = async (params?: {
  date?: string;
  mealType?: string;
  status?: string;
  canteenId?: string;
  limit?: number;
}): Promise<Slot[]> => {
  const response = await api.get("/slots", { params });
  const slots =
    response.data.data?.slots ||
    response.data.data?.items ||
    response.data.data ||
    [];
  return Array.isArray(slots) ? slots.map(normalizeSlot) : [];
};

/**
 * Get slot by ID
 */
export const getSlotById = async (slotId: string): Promise<Slot> => {
  const response = await api.get(`/slots/${slotId}`);
  return normalizeSlot(response.data.data);
};

/**
 * Create a new slot (Management only)
 */
export const createSlot = async (data: {
  date: string;
  time: string;
  capacity: number;
  mealType?: "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS";
  canteenId?: string;
}): Promise<Slot> => {
  const response = await api.post("/slots", data);
  return normalizeSlot(response.data.data);
};

/**
 * Update a slot (Management only)
 */
export const updateSlot = async (
  slotId: string,
  data: Partial<{
    date: string;
    time: string;
    capacity: number;
    status: string;
    mealType: string;
  }>,
): Promise<Slot> => {
  const response = await api.patch(`/slots/${slotId}`, data);
  return normalizeSlot(response.data.data);
};

/**
 * Update slot capacity (Management only)
 */
export const updateSlotCapacity = async (
  slotId: string,
  capacity: number,
): Promise<Slot> => {
  const response = await api.patch(`/slots/${slotId}/capacity`, { capacity });
  return normalizeSlot(response.data.data);
};

/**
 * Cancel a slot (Management only)
 */
export const cancelSlotById = async (slotId: string): Promise<Slot> => {
  const response = await api.post(`/slots/${slotId}/cancel`);
  return normalizeSlot(response.data.data);
};

/**
 * Delete a slot (Management only)
 */
export const deleteSlot = async (slotId: string): Promise<void> => {
  await api.delete(`/slots/${slotId}`);
};

/**
 * Disable a system slot (Management only)
 */
export const disableSlot = async (slotId: string): Promise<Slot> => {
  const response = await api.post(`/slots/${slotId}/disable`);
  return normalizeSlot(response.data.data);
};

/**
 * Enable a system slot (Management only)
 */
export const enableSlot = async (slotId: string): Promise<Slot> => {
  const response = await api.post(`/slots/${slotId}/enable`);
  return normalizeSlot(response.data.data);
};

// ========== BOOKING ENDPOINTS ==========

/**
 * Get current user's bookings
 */
export const getMyBookings = async (): Promise<Booking[]> => {
  const response = await api.get("/bookings/my");
  const bookings =
    response.data.data?.bookings ||
    response.data.data?.items ||
    response.data.data ||
    [];
  return Array.isArray(bookings) ? bookings.map(normalizeBooking) : [];
};

/**
 * Get all bookings (Management only)
 */
export const getAllBookings = async (params?: {
  date?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<{ bookings: Booking[]; total: number; page: number }> => {
  const response = await api.get("/bookings", { params });
  const data = response.data.data || {};
  const bookings = data.bookings || data.items || [];
  return {
    bookings: Array.isArray(bookings) ? bookings.map(normalizeBooking) : [],
    total: data.pagination?.total || 0,
    page: data.pagination?.page || 1,
  };
};

/**
 * Get scan history (Staff only)
 */
export const getScanHistory = async (params?: {
  date?: string;
  canteenId?: string;
  page?: number;
  limit?: number;
}): Promise<{ bookings: Booking[]; total: number; page: number }> => {
  const response = await api.get("/bookings/scans", { params });
  const data = response.data.data || {};
  const bookings = data.bookings || data.items || [];
  return {
    bookings: Array.isArray(bookings) ? bookings.map(normalizeBooking) : [],
    total: data.pagination?.total || 0,
    page: data.pagination?.page || 1,
  };
};

/**
 * Create a new booking
 */
export const createBooking = async (data: {
  slotId: string;
  items: { menuItemId: string; quantity: number; portionSize?: string }[];
  notes?: string;
}): Promise<Booking> => {
  const response = await api.post("/bookings", data);
  return normalizeBooking(response.data.data);
};

/**
 * Cancel a booking
 */
export const cancelBooking = async (
  bookingId: string,
  reason?: string,
): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/cancel`, { reason });
  return normalizeBooking(response.data.data);
};

/**
 * Complete a booking (Staff only)
 */
export const completeBooking = async (bookingId: string): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/complete`);
  return normalizeBooking(response.data.data);
};

/**
 * Get booking by token number (Staff only)
 */
export const getBookingByToken = async (
  tokenNumber: string,
): Promise<Booking> => {
  const response = await api.get(`/bookings/token/${tokenNumber}`);
  return normalizeBooking(response.data.data);
};

/**
 * Create walk-in booking (Staff only)
 */
export const createWalkinBooking = async (data: {
  slotId: string;
  guestName: string;
  items: { menuItem: string; quantity: number }[];
}): Promise<Booking> => {
  const response = await api.post("/bookings/walkin", data);
  return normalizeBooking(response.data.data);
};

/**
 * Mark booking as no-show (Staff only)
 */
export const markNoShow = async (bookingId: string): Promise<Booking> => {
  const response = await api.post(`/bookings/${bookingId}/no-show`);
  return normalizeBooking(response.data.data);
};

/**
 * Get booking statistics (Management only)
 */
export const getBookingStats = async (params?: {
  date?: string;
  canteenId?: string;
}): Promise<{
  total: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
  confirmed: number;
  expired: number;
}> => {
  const response = await api.get("/bookings/stats", { params });
  return response.data.data;
};

/**
 * Queue info response from backend
 */
export interface QueueInfo {
  slotId: string;
  totalInQueue: number;
  completed: number;
  position: number;
  peopleAhead: number;
  avgServiceTimeMins: number;
  estimatedWaitMins: number;
}

/**
 * Get real-time queue info for a slot
 */
export const getQueueInfo = async (slotId: string): Promise<QueueInfo> => {
  const response = await api.get(`/bookings/queue-info/${slotId}`);
  return response.data.data;
};

/**
 * Token status with user-friendly invalidation reasons
 */
export interface TokenStatus {
  tokenNumber: string;
  booking: Booking;
  status: string;
  message: string;
  icon: string;
  isExpired: boolean;
  allocationReason?: string;
}

/**
 * Get token status with reason
 */
export const getTokenStatus = async (
  tokenNumber: string,
): Promise<TokenStatus> => {
  const response = await api.get(`/bookings/token-status/${tokenNumber}`);
  return response.data.data;
};

/**
 * Reschedule a booking to a new slot
 */
export const rescheduleBooking = async (
  bookingId: string,
  newSlotId: string,
): Promise<Booking> => {
  const response = await api.put(`/bookings/${bookingId}/reschedule`, {
    newSlotId,
  });
  return normalizeBooking(response.data.data);
};

/**
 * Replace booking items (Staff)
 */
export const replaceBookingItems = async (
  bookingId: string,
  data: {
    items: { menuItemId: string; quantity: number; portionSize?: string }[];
    enforceSameTotal?: boolean;
  },
): Promise<Booking> => {
  const response = await api.patch(`/bookings/${bookingId}/items`, data);
  return normalizeBooking(response.data.data);
};

/**
 * Generate secure QR token for a booking
 */
export const generateQRToken = async (bookingId: string): Promise<string> => {
  const response = await api.get(`/bookings/${bookingId}/qr-token`);
  return response.data.data.qrToken;
};

/**
 * Verify QR token (Staff only)
 */
export interface QRVerification {
  decoded: {
    type: string;
    v: number;
    bookingId: string;
    tokenNumber: string;
    userId?: string;
    userName: string;
    userEmail?: string;
    slotTime: string;
    slotDate: string;
    slotStartTime?: string;
    slotEndTime?: string;
    totalAmount: number;
    items: Array<{
      name: string;
      quantity: number;
      price: number;
      portionSize?: string;
    }>;
    status: string;
    expiryAt?: string;
    canteenName?: string;
    createdAt: string;
    generatedAt: string;
  };
  validation: {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  };
  currentBooking: Booking | null;
}

export const verifyQRToken = async (
  qrToken: string,
): Promise<QRVerification> => {
  const response = await api.post("/bookings/verify-qr", { qrToken });
  return response.data.data;
};
