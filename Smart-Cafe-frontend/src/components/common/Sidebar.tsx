import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../../store/auth.store";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Clock,
  Leaf,
  Bell,
  QrCode,
  UserPlus,
  Megaphone,
  TrendingUp,
  Activity,
  Settings,
  Database,
  Store,
  Package,
  DollarSign,
  Loader2,
} from "lucide-react";
import { cn } from "../../utils/cn";
import staffService from "../../services/staff.service";
import toast from "react-hot-toast";

const Sidebar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [cashAmount, setCashAmount] = useState<string>("");
  const [loggingCash, setLoggingCash] = useState(false);

  if (!user) return null;

  const handleLogCash = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cashAmount || Number(cashAmount) <= 0) return;
    try {
      setLoggingCash(true);
      await staffService.logManualCash(Number(cashAmount));
      toast.success("Cash logged successfully");
      setCashAmount("");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Failed to log cash");
    } finally {
      setLoggingCash(false);
    }
  };

  const getLinks = () => {
    switch (user.role) {
      case "user":
        return [
          { to: "/user/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/user/booking", label: "Book Slot", icon: Calendar },
          { to: "/user/tokens", label: "My Tokens", icon: QrCode },
          { to: "/user/queue", label: "Queue Status", icon: Clock },
          { to: "/user/notifications", label: "Notifications", icon: Bell },
          { to: "/user/sustainability", label: "Sustainability", icon: Leaf },
        ];
      case "canteen_staff":
        return [
          {
            to: "/canteen-staff/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
          },
          {
            to: "/canteen-staff/scan-token",
            label: "Scan Token",
            icon: QrCode,
          },
          {
            to: "/canteen-staff/scans",
            label: "Scan History",
            icon: Clock,
          },
          {
            to: "/canteen-staff/walkin",
            label: "Walk-in Token",
            icon: UserPlus,
          },
          {
            to: "/canteen-staff/announcements",
            label: "Announcements",
            icon: Megaphone,
          },
          {
            to: "/canteen-staff/menu-quantity",
            label: "Food Quantity",
            icon: Package,
          },
        ];
      case "manager":
        return [
          {
            to: "/manager/dashboard",
            label: "Dashboard",
            icon: LayoutDashboard,
          },
          { to: "/manager/forecasts", label: "Forecasts", icon: TrendingUp },
          { to: "/manager/simulator", label: "Simulator", icon: Activity },
        ];
      case "admin":
        return [
          { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { to: "/admin/canteens", label: "Canteens", icon: Store },
          { to: "/admin/menu", label: "Food Menu", icon: Leaf },
          { to: "/admin/bookings", label: "Slot Operations", icon: Clock },
          { to: "/admin/roles", label: "User Roles", icon: Users },
          { to: "/admin/timings", label: "Timings & Holidays", icon: Calendar },
          {
            to: "/admin/capacity",
            label: "Policies & Capacity",
            icon: Settings,
          },
          { to: "/admin/system", label: "System Maintenance", icon: Database },
        ];
      default:
        console.warn("Unknown role:", user.role);
        return [];
    }
  };

  const links = getLinks();

  return (
    <aside className="w-64 bg-slate-900 fixed top-16 left-0 h-[calc(100vh-4rem)] flex-shrink-0 text-white overflow-y-auto z-40">
      <div className="p-4 space-y-1">
        {links.map((link) => {
          const isActive = location.pathname.startsWith(link.to);
          return (
            <button
              key={link.to}
              onClick={() => navigate(link.to)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-black text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-slate-100",
              )}
            >
              <link.icon size={20} />
              {link.label}
            </button>
          );
        })}
      </div>

      {user.role === "canteen_staff" && (
        <div className="absolute bottom-6 left-4 right-4">
          <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
            <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Quick Cash Entry
            </h4>
            <form onSubmit={handleLogCash} className="space-y-2">
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                  ₹
                </span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  placeholder="Amount"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  disabled={loggingCash}
                  className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:opacity-50"
                />
              </div>
              <button
                type="submit"
                disabled={!cashAmount || Number(cashAmount) <= 0 || loggingCash}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-700 disabled:text-slate-400 text-white py-2 rounded-lg text-sm font-medium transition-colors"
              >
                {loggingCash ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <DollarSign size={16} />
                )}
                Add Cash
              </button>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;
