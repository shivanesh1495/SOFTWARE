import React, { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Clock,
  ChevronRight,
  Coffee,
  ShoppingBag,
  Loader2,
} from "lucide-react";
import { useAuth } from "../../store/auth.store";
import * as canteenService from "../../services/canteen.service";
import type { Canteen } from "../../services/canteen.service";
import * as notificationService from "../../services/notification.service";
import type { Notification } from "../../services/notification.service";
import * as bookingService from "../../services/booking.service";
import type { Booking, Slot } from "../../services/booking.service";
import { getMenuItems } from "../../services/menu.service";
import type { MenuItem } from "../../services/menu.service";

interface Recommendation {
  item: MenuItem;
  reason: string;
}
import { useRealtimeRefresh } from "../../hooks/useRealtimeRefresh";
const getTimeString = () => {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Get user name from logged-in user
  const studentName = user?.name || user?.fullName || "Student";

  // Active booking state (from API)
  const [, setActiveBooking] = useState<Booking | null>(null);
  const [bookingLoading, setBookingLoading] = useState(true);

  const [todaySlots, setTodaySlots] = useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(true);

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(true);

  // Canteens state
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [canteensLoading, setCanteensLoading] = useState(true);

  // Menu Recommendations
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [recommendationsLoading, setRecommendationsLoading] = useState(true);

  // AI Queue Predictions
  const [waitTimes, setWaitTimes] = useState<Record<string, number>>({});

  useEffect(() => {
    loadCanteens();
    loadNotifications();
    loadActiveBooking();
    loadTodaySlots();
    loadRecommendations();

    // Poll for notifications every 30 seconds
    const interval = setInterval(() => {
      loadNotifications();
    }, 30000);

    // Keep today's slots fresh in case of admin deletions
    const slotsInterval = setInterval(() => {
      loadTodaySlots();
    }, 30000);

    const handleFocus = () => {
      loadTodaySlots();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      clearInterval(slotsInterval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // Real-time refresh: instantly reload data when another user changes bookings/menu/notifications
  const handleRealtimeEvent = useCallback(() => {
    loadActiveBooking();
    loadTodaySlots();
    loadNotifications();
  }, []);
  useRealtimeRefresh(
    ["booking:updated", "menu:updated", "notification:broadcast"],
    handleRealtimeEvent,
  );

  const loadActiveBooking = async () => {
    try {
      setBookingLoading(true);
      const bookings = await bookingService.getMyBookings();
      // Find the most recent confirmed/pending booking for today
      const today = new Date().toISOString().split("T")[0];
      const active = bookings.find(
        (b) =>
          (b.status === "confirmed" || b.status === "pending") &&
          (b.slot?.date?.startsWith(today) || b.createdAt?.startsWith(today)),
      );
      setActiveBooking(active || null);
    } catch (error) {
      console.error("Failed to load bookings:", error);
    } finally {
      setBookingLoading(false);
    }
  };

  const loadTodaySlots = async () => {
    try {
      setSlotsLoading(true);
      const slots = await bookingService.getTodaySlots();
      setTodaySlots(slots);
    } catch (error) {
      console.error("Failed to load slots:", error);
    } finally {
      setSlotsLoading(false);
    }
  };

  const loadNotifications = async () => {
    try {
      // Fetch latest 5 notifications
      const data = await notificationService.getNotifications({ limit: 5 });
      setNotifications(data);
    } catch (error) {
      console.error("Failed to load notifications:", error);
    } finally {
      setNotificationsLoading(false);
    }
  };

  const loadCanteens = async () => {
    try {
      setCanteensLoading(true);
      const data = await canteenService.getCanteens({ isActive: true });
      setCanteens(data);
      // DISABLED: AI queue prediction removed to conserve API credits
      // loadWaitTimes(data);
    } catch (error) {
      console.error("Failed to load canteens:", error);
    } finally {
      setCanteensLoading(false);
    }
  };

  // DISABLED: This function was removed to conserve API credits
  // const loadWaitTimes = async (canteenList: Canteen[]) => { ... }

  const loadRecommendations = async () => {
    try {
      setRecommendationsLoading(true);
      // Fetch available menu items
      const menuItems = await getMenuItems({ isAvailable: true });

      // Randomly select 3-5 items
      const shuffled = [...menuItems].sort(() => Math.random() - 0.5);
      const selected = shuffled.slice(0, Math.min(5, menuItems.length));

      // Generic recommendation reasons
      const reasons = [
        "Popular choice among students",
        "Highly rated by our community",
        "Fresh and delicious today",
        "Chef's special recommendation",
        "Try something new!",
        "Best seller this week",
        "Perfect for your meal time",
        "Nutritious and tasty",
        "Customer favorite",
        "Great value for money",
      ];

      // Map to recommendations with random reasons
      const recommendations: Recommendation[] = selected.map((item, index) => ({
        item,
        reason: reasons[index % reasons.length],
      }));

      setRecommendations(recommendations);
    } catch (error) {
      console.error("Failed to load recommendations:", error);
    } finally {
      setRecommendationsLoading(false);
    }
  };

  // Get color styles based on canteen index or imageColor
  const getCanteenColors = (index: number) => {
    const colors = [
      {
        bg: "bg-orange-100",
        text: "text-orange-600",
        accent: "bg-orange-50",
        hover: "group-hover:bg-orange-100",
        hoverChevron: "group-hover:text-orange-500",
      },
      {
        bg: "bg-green-100",
        text: "text-green-600",
        accent: "bg-green-50",
        hover: "group-hover:bg-green-100",
        hoverChevron: "group-hover:text-green-500",
      },
      {
        bg: "bg-blue-100",
        text: "text-blue-600",
        accent: "bg-blue-50",
        hover: "group-hover:bg-blue-100",
        hoverChevron: "group-hover:text-blue-500",
      },
      {
        bg: "bg-purple-100",
        text: "text-purple-600",
        accent: "bg-purple-50",
        hover: "group-hover:bg-purple-100",
        hoverChevron: "group-hover:text-purple-500",
      },
      {
        bg: "bg-red-100",
        text: "text-red-600",
        accent: "bg-red-50",
        hover: "group-hover:bg-red-100",
        hoverChevron: "group-hover:text-red-500",
      },
    ];
    return colors[index % colors.length];
  };

  // Get crowd status color
  const getCrowdColor = (status: string, crowd: string) => {
    if (status === "Closed") return "text-gray-500";
    if (status === "Closing Soon") return "text-red-500";
    if (crowd === "High") return "text-orange-600 bg-orange-100";
    if (crowd === "Medium") return "text-yellow-700 bg-yellow-100";
    return "text-green-700 bg-green-100";
  };

  return (
    <div className="space-y-8 pb-24 relative">
      {/* Decorative ambient background */}
      <div className="fixed top-0 left-0 w-full h-96 bg-gradient-to-b from-brand/5 via-purple-500/5 to-transparent -z-10 pointer-events-none"></div>

      {/* 1. Header & Welcome */}
      <header className="flex justify-between items-start pt-4 px-1 relative z-50">
        <div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-brand to-indigo-600 tracking-tight drop-shadow-sm">
            Hi, {studentName} 👋
          </h1>
          <div className="flex items-center gap-2 mt-2 text-gray-500 bg-white/70 w-fit px-3 py-1.5 rounded-full text-sm font-semibold backdrop-blur-md border border-white/50 shadow-sm">
            <Clock size={16} className="text-brand" />
            <span>{getTimeString()}</span>
          </div>
        </div>

        {/* Top Right Icons */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/user/cart")}
            className="relative flex items-center justify-center p-3 bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-white/50 hover:shadow-md hover:scale-[1.05] active:scale-95 transition-all duration-300 cursor-pointer"
          >
            <ShoppingBag size={20} className="text-gray-700" />
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full animate-ping pointer-events-none"></div>
            <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full pointer-events-none"></div>
          </button>
        </div>
      </header>

      {/* 1.5. AI Recommendations */}
      <section>
        <div className="flex justify-between items-end mb-4 px-1">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-2">
            <span className="text-2xl animate-pulse drop-shadow-sm">✨</span>{" "}
            Top Picks For You
          </h2>
        </div>

        {recommendationsLoading ? (
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-[24px] border border-white/50 shadow-sm flex items-center justify-center py-10 text-brand font-medium">
            <Loader2 className="animate-spin mr-3" size={24} />
            <span>Loading top picks...</span>
          </div>
        ) : recommendations.length === 0 ? (
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-[24px] border border-white/50 shadow-sm text-center text-gray-500 font-medium">
            No recommendations right now.
          </div>
        ) : (
          <div className="flex overflow-x-auto pb-6 -mx-4 px-4 gap-5 snap-x hide-scrollbar">
            {recommendations.map((rec, i) => {
              if (!rec.item) return null;
              const itemId = rec.item.id || rec.item._id;
              // Generate a dynamic gradient based on index
              const gradients = [
                "from-orange-100 to-amber-50 text-orange-950 border-orange-200/50 shadow-orange-900/5",
                "from-blue-100 to-sky-50 text-blue-950 border-blue-200/50 shadow-blue-900/5",
                "from-purple-100 to-fuchsia-50 text-purple-950 border-purple-200/50 shadow-purple-900/5",
              ];
              const style = gradients[i % gradients.length];

              return (
                <Link
                  key={itemId}
                  to={`/user/item/${itemId}`}
                  className={`min-w-[260px] max-w-[280px] snap-center shrink-0 bg-gradient-to-br ${style} p-5 rounded-[24px] border shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group`}
                >
                  <div className="mb-4">
                    <h3 className="font-extrabold text-xl mb-1.5 line-clamp-1 group-hover:underline decoration-2 underline-offset-4">
                      {rec.item.itemName}
                    </h3>
                    <p className="text-sm font-medium opacity-80 leading-relaxed line-clamp-2">
                      {rec.reason}
                    </p>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-black text-2xl tracking-tight">
                      ₹{rec.item.price}
                    </span>
                    <div className="w-10 h-10 rounded-full bg-white/60 backdrop-blur-md flex items-center justify-center text-gray-900 group-hover:scale-110 group-hover:bg-white transition-all shadow-sm">
                      <ChevronRight
                        size={20}
                        className="group-hover:translate-x-0.5 transition-transform"
                      />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* 2. Today's Booking Status */}
      <section className="px-1">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Your Token
          </h2>
        </div>

        {bookingLoading ? (
          <div className="bg-white/60 backdrop-blur-md p-6 rounded-[24px] border border-white/50 shadow-sm flex items-center justify-center py-10 text-brand font-medium">
            <Loader2 className="animate-spin mr-3" size={24} />
            <span>Loading active tokens...</span>
          </div>
        ) : (
          <div className="bg-gradient-to-br from-brand to-indigo-600 p-6 rounded-[24px] shadow-xl shadow-brand/20 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-xl font-extrabold mb-2 tracking-tight">
                Manage Active Tokens
              </h3>
              <p className="text-brand-50 mb-6 font-medium text-sm leading-relaxed opacity-90 max-w-[85%]">
                View your live QR codes, track order status, or check your past
                food tokens instantly.
              </p>
              <Link to="/user/tokens" className="block">
                <button className="w-full bg-white text-brand font-bold py-3.5 px-4 rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all shadow-md group-hover:shadow-lg flex items-center justify-center gap-2">
                  Open My Tokens{" "}
                  <ChevronRight size={18} className="text-brand/50" />
                </button>
              </Link>
            </div>
            {/* Decorative background shapes */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-110 transition-transform duration-700"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full -ml-12 -mb-12 blur-xl group-hover:scale-110 transition-transform duration-700"></div>
          </div>
        )}
        <section className="mt-8 px-1">
          <div className="flex justify-between items-end mb-4">
            <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
              Today's Slots
            </h2>
            <Link
              to="/user/slots"
              className="text-sm text-brand font-bold hover:text-brand-hover hover:underline underline-offset-4 transition-all"
            >
              View All
            </Link>
          </div>
          {slotsLoading ? (
            <div className="bg-white/60 backdrop-blur-md p-6 rounded-[24px] border border-white/50 shadow-sm flex items-center justify-center py-10 text-brand font-medium">
              <Loader2 className="animate-spin mr-3" size={24} />
              <span>Loading slots...</span>
            </div>
          ) : todaySlots.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md p-8 rounded-[24px] border border-white/50 shadow-sm text-center text-gray-500 font-medium">
              No slots available today. Take a break!
            </div>
          ) : (
            <div className="space-y-6">
              {canteens.map((canteen) => {
                const canteenId = canteen.id || canteen._id || "";
                const canteenSlots = todaySlots.filter(
                  (slot) =>
                    ((slot as any).canteenId || slot.canteenId || "default") ===
                    canteenId,
                );

                if (canteenSlots.length === 0) return null;

                return (
                  <div key={canteenId} className="space-y-3">
                    <div className="flex items-center justify-between ml-1">
                      <h3 className="text-md font-extrabold tracking-tight text-gray-800">
                        {canteen.name}
                      </h3>
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-wider bg-gray-100 px-2 py-1 rounded-md">
                        {canteenSlots.length} slots
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {canteenSlots.slice(0, 4).map((slot) => {
                        const start =
                          slot.startTime || (slot as any).time || "";
                        const end = slot.endTime ? ` - ${slot.endTime}` : "";
                        const fillRatio = Math.min(
                          100,
                          ((slot.booked || 0) / slot.capacity) * 100,
                        );
                        const isFillingFast = fillRatio > 80;

                        return (
                          <div
                            key={slot.id || (slot as any)._id}
                            className={`bg-white/80 backdrop-blur-md p-4 rounded-[20px] border shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group ${isFillingFast ? "border-orange-200" : "border-gray-100 hover:border-gray-200"}`}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div className="text-sm font-extrabold text-gray-900 tracking-tight">
                                {start}
                                {end}
                              </div>
                              <span className="bg-gray-100/80 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded-md backdrop-blur-sm">
                                {slot.mealType || "Meal"}
                              </span>
                            </div>

                            <div>
                              <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-1.5 uppercase tracking-wide">
                                <span>
                                  {isFillingFast ? (
                                    <span className="text-orange-600 flex items-center gap-1">
                                      <span className="animate-pulse">🔥</span>{" "}
                                      Filling
                                    </span>
                                  ) : (
                                    "Capacity"
                                  )}
                                </span>
                                <span className="text-gray-900">
                                  {slot.booked || 0} / {slot.capacity}
                                </span>
                              </div>
                              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-1000 ${isFillingFast ? "bg-orange-500" : "bg-brand"}`}
                                  style={{
                                    width: `${Math.max(5, fillRatio)}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </section>
      {/* 3. Canteen Selection - Now Dynamic */}
      <section className="px-1">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Select Canteen
          </h2>
          <Link
            to="/user/queue"
            className="text-sm font-bold text-brand hover:text-brand-hover hover:underline underline-offset-4 transition-all"
          >
            Live Queues
          </Link>
        </div>

        <div className="space-y-4">
          {canteensLoading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="animate-spin mr-2" size={20} />
              <span>Loading canteens...</span>
            </div>
          ) : canteens.length > 0 ? (
            canteens.map((canteen, index) => {
              const colors = getCanteenColors(index);
              const crowdColor = getCrowdColor(canteen.status, canteen.crowd);

              return (
                <Link
                  key={canteen.id || canteen._id}
                  to={`/user/booking?canteenId=${canteen.id || canteen._id}`}
                  className="block bg-white/80 backdrop-blur-md p-5 rounded-[24px] border border-white shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden"
                >
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${colors.accent} to-transparent opacity-0 group-hover:opacity-40 transition-opacity duration-300 pointer-events-none`}
                  ></div>
                  <div className="relative flex justify-between items-center z-10">
                    <div className="flex items-center gap-4">
                      <div
                        className={`w-14 h-14 rounded-[20px] ${colors.bg} ${colors.text} flex items-center justify-center font-black text-2xl shadow-inner group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300`}
                      >
                        {canteen.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-lg tracking-tight text-gray-900 flex items-center gap-2 group-hover:text-brand transition-colors">
                          {canteen.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-md shadow-sm border border-white/50 backdrop-blur-sm ${crowdColor}`}
                          >
                            <span className="opacity-80 font-semibold">
                              {canteen.status} •
                            </span>{" "}
                            {canteen.crowd}
                          </span>

                          {waitTimes[(canteen.id || canteen._id) as string] !==
                            undefined &&
                            canteen.status !== "Closed" && (
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md border border-indigo-100 shadow-sm animate-fade-in">
                                <span className="text-[12px] animate-pulse">
                                  ✨
                                </span>
                                {
                                  waitTimes[
                                    (canteen.id || canteen._id) as string
                                  ]
                                }{" "}
                                min wait
                              </span>
                            )}
                        </div>
                      </div>
                    </div>
                    <div className="bg-gray-50 w-10 h-10 rounded-full flex items-center justify-center group-hover:bg-brand group-hover:scale-110 transition-all shadow-sm">
                      <ChevronRight
                        size={20}
                        className={`text-gray-400 group-hover:text-white group-hover:translate-x-0.5 transition-all`}
                      />
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <div className="bg-white/60 backdrop-blur-md p-8 rounded-[24px] border border-white/50 text-center text-gray-500 shadow-sm font-medium">
              <Coffee size={40} className="mx-auto mb-3 opacity-30" />
              <p>No canteens available</p>
            </div>
          )}
        </div>
      </section>
      {/* 4. Notification Preview */}
      <section className="px-1">
        <div className="flex justify-between items-end mb-4">
          <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
            Recent Updates
          </h2>
          <Link
            to="/user/notifications"
            className="text-sm font-bold text-brand hover:text-brand-hover hover:underline underline-offset-4 transition-all"
          >
            All Updates
          </Link>
        </div>
        <div className="space-y-3">
          {notificationsLoading ? (
            <div className="flex items-center justify-center py-6 text-gray-400 font-medium">
              <Loader2 className="animate-spin mr-3" size={18} />
              <span className="text-sm">Loading updates...</span>
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 rounded-[20px] border flex gap-4 ${notif.isUrgent ? "bg-red-50/80 backdrop-blur-md border-red-100 shadow-sm shadow-red-500/5 group hover:border-red-200 transition-all" : "bg-white/80 backdrop-blur-md border-gray-100 hover:border-gray-200 transition-all shadow-sm group"}`}
              >
                <div
                  className={`mt-1.5 w-2 h-2 rounded-full ${notif.isUrgent ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-brand"}`}
                ></div>
                <div className="flex-1">
                  <p
                    className={`text-sm font-bold ${notif.isUrgent ? "text-red-950" : "text-gray-900"} leading-snug tracking-tight`}
                  >
                    {notif.message}
                  </p>
                  <p className="text-[11px] font-semibold text-gray-400 mt-1.5 uppercase tracking-wide">
                    {new Date(notif.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <ChevronRight
                  size={18}
                  className="text-gray-300 self-center group-hover:text-gray-500 group-hover:translate-x-0.5 transition-all"
                />
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400 font-medium text-sm bg-white/40 backdrop-blur-md rounded-[20px] border border-white/50 shadow-sm">
              <p>No new updates</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default StudentDashboard;
