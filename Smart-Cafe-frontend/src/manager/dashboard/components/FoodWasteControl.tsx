import React, { useState, useEffect, useCallback } from "react";
import {
  AlertTriangle,
  Leaf,
  CheckCircle,
  Package,
  Loader2,
  X,
  Calendar,
  User,
  MessageSquare
} from "lucide-react";
import {
  getWasteStats,
  getAllWasteReports,
  type WasteStats,
  type WasteReport
} from "../../../services/sustainability.service";
import {
  updateSettingValue,
  getSetting,
} from "../../../services/system.service";
import { useRealtimeRefresh } from "../../../hooks/useRealtimeRefresh";
import toast from "react-hot-toast";

interface Props {
  canteenId?: string;
}

const WASTE_COLORS: Record<
  string,
  { bg: string; text: string; ring: string; bar: string }
> = {
  None: {
    bg: "bg-green-100",
    text: "text-green-700",
    ring: "ring-green-400",
    bar: "bg-green-500",
  },
  Little: {
    bg: "bg-lime-100",
    text: "text-lime-700",
    ring: "ring-lime-400",
    bar: "bg-lime-500",
  },
  Some: {
    bg: "bg-yellow-100",
    text: "text-yellow-700",
    ring: "ring-yellow-400",
    bar: "bg-yellow-500",
  },
  Most: {
    bg: "bg-orange-100",
    text: "text-orange-700",
    ring: "ring-orange-400",
    bar: "bg-orange-500",
  },
  All: {
    bg: "bg-red-100",
    text: "text-red-700",
    ring: "ring-red-400",
    bar: "bg-red-500",
  },
};

const DetailedWasteModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const [reports, setReports] = useState<WasteReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadReports = async (pageNum: number) => {
    try {
      if (pageNum === 1) setLoading(true);
      const res = await getAllWasteReports({ limit: 10, page: pageNum });
      if (pageNum === 1) {
        setReports(res.reports);
      } else {
        setReports((prev) => [...prev, ...res.reports]);
      }
      setHasMore(res.hasNextPage || res.reports.length === 10);
      setPage(pageNum);
    } catch {
      toast.error("Failed to load detailed waste reports");
    } finally {
      if (pageNum === 1) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadReports(1);
    } else {
      setReports([]);
      setPage(1);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Leaf className="text-green-600" size={24} />
              Detailed Waste Reports
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Review student feedback and portion sizing reports
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-gray-400" size={32} />
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Package className="mx-auto mb-3 opacity-20" size={48} />
              <p>No waste reports available.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => {
                const colors = WASTE_COLORS[report.wasteAmount] || WASTE_COLORS.Some;
                const user = report.user as any;
                
                return (
                  <div key={report.id || (report as any)._id} className="bg-white border text-left border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${colors.bg} ${colors.text}`}>
                          Wasted: {report.wasteAmount}
                        </span>
                        <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          {report.mealType || "LUNCH"}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <User size={14} />
                          {user?.fullName || user?.name || "Student"}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Calendar size={14} />
                          {new Date(report.date || report.createdAt).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            hour: "numeric",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>

                    {(report.reason || report.notes) && (
                      <div className="ml-1 sm:ml-4 border-l-2 border-gray-100 pl-4 space-y-2">
                        {report.reason && (
                          <div className="text-sm font-medium text-gray-800 flex items-start gap-2">
                            <AlertTriangle size={16} className="text-amber-500 mt-0.5" />
                            Reason: {report.reason}
                          </div>
                        )}
                        {report.notes && (
                          <div className="text-sm text-gray-600 flex items-start gap-2">
                            <MessageSquare size={16} className="text-gray-400 mt-0.5" />
                            Note: "{report.notes}"
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              
              {hasMore && (
                <button
                  onClick={() => loadReports(page + 1)}
                  className="w-full py-3 text-sm font-medium text-green-700 bg-green-50 rounded-lg hover:bg-green-100 transition"
                >
                  Load More Reports
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const FoodWasteControl: React.FC<Props> = () => {
  const [portionSize, setPortionSize] = useState<"Standard" | "Small">(
    "Standard",
  );
  const [surplusAvailable, setSurplusAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WasteStats | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [wasteStats, portionSetting, surplusSetting] = await Promise.all([
        getWasteStats().catch(() => null),
        getSetting("portion_size").catch(() => null),
        getSetting("surplus_donation_enabled").catch(() => null),
      ]);
      if (wasteStats) setStats(wasteStats);
      if (portionSetting?.settingValue === "Small") setPortionSize("Small");
      else setPortionSize("Standard");
      if (surplusSetting?.settingValue === "true") setSurplusAvailable(true);
      else setSurplusAvailable(false);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Real-time: refresh waste stats when students submit waste reports
  const handleSustainabilityUpdate = useCallback(() => {
    getWasteStats()
      .then((wasteStats) => setStats(wasteStats))
      .catch(() => {});
  }, []);
  useRealtimeRefresh(["sustainability:updated"], handleSustainabilityUpdate);

  const handlePortionChange = async (size: "Standard" | "Small") => {
    setPortionSize(size);
    try {
      await updateSettingValue("portion_size", size);
    } catch {
      toast.error("Failed to update portion size");
    }
  };

  const handleSurplusToggle = async () => {
    const next = !surplusAvailable;
    setSurplusAvailable(next);
    try {
      await updateSettingValue("surplus_donation_enabled", String(next));
      toast.success(
        next ? "Surplus marked for donation" : "Surplus donation disabled",
      );
    } catch {
      toast.error("Failed to update surplus setting");
    }
  };

  // Compute risk level from waste stats
  const getWasteRisk = () => {
    if (!stats) return { label: "N/A", color: "gray", variance: 0 };
    const highWaste = stats.byWasteAmount
      .filter((w) => ["Most", "All"].includes(w._id))
      .reduce((s, w) => s + w.count, 0);
    const total = stats.totalReports || 1;
    const pct = (highWaste / total) * 100;
    if (pct < 10) return { label: "Low", color: "green", variance: pct };
    if (pct < 30) return { label: "Medium", color: "amber", variance: pct };
    return { label: "High", color: "red", variance: pct };
  };

  const risk = getWasteRisk();

  if (loading) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex items-center justify-center min-h-[250px]">
        <Loader2 className="animate-spin text-gray-400" size={28} />
      </div>
    );
  }

  return (
    <>
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 h-full flex flex-col">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-gray-500 text-sm font-medium">Food Waste Risk</h3>
            <div className="flex items-baseline gap-2 mt-2">
              <h2 className={`text-3xl font-bold text-${risk.color}-600`}>
                {risk.label}
              </h2>
            </div>
          </div>
          <div className="p-2 bg-green-50 text-green-600 rounded-full">
            <Leaf size={20} />
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 text-sm text-gray-600">
          <AlertTriangle size={16} className="text-amber-500" />
          <span>
            High-waste reports:{" "}
            <span className="font-medium">~{risk.variance.toFixed(1)}%</span> (
            {stats?.totalReports || 0} total)
          </span>
        </div>

        <div className="space-y-4 flex-1">
          {/* Portion Control */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Portion Sizes
            </label>
            <div className="flex bg-white rounded-md border border-gray-200 p-1">
              <button
                onClick={() => handlePortionChange("Standard")}
                className={`flex-1 text-xs py-1.5 rounded font-medium transition ${portionSize === "Standard" ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
              >
                Standard
              </button>
              <button
                onClick={() => handlePortionChange("Small")}
                className={`flex-1 text-xs py-1.5 rounded font-medium transition ${portionSize === "Small" ? "bg-green-600 text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
              >
                Small (-10%)
              </button>
            </div>
          </div>

          {/* Surplus Management */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Surplus Food Donation
              </span>
              <div className="relative inline-block w-10 mr-2 align-middle select-none transition duration-200 ease-in">
                <input
                  type="checkbox"
                  name="toggle"
                  id="surplus-toggle"
                  checked={surplusAvailable}
                  onChange={handleSurplusToggle}
                  className="toggle-checkbox absolute block w-5 h-5 rounded-full bg-white border-4 appearance-none cursor-pointer peer checked:right-0 checked:border-green-500"
                  style={{
                    right: surplusAvailable ? "0" : "auto",
                    left: surplusAvailable ? "auto" : "0",
                  }}
                />
                <label
                  htmlFor="surplus-toggle"
                  className={`toggle-label block overflow-hidden h-5 rounded-full cursor-pointer ${surplusAvailable ? "bg-green-500" : "bg-gray-300"}`}
                ></label>
              </div>
            </div>

            {surplusAvailable ? (
              <div className="bg-green-50 text-green-800 text-xs p-3 rounded-lg border border-green-100 flex items-start gap-2">
                <CheckCircle size={14} className="mt-0.5" />
                <div>
                  <p className="font-medium opacity-90">Marked for Donation</p>
                  <p className="mt-1 opacity-75">
                    Surplus food has been marked available for donation pickup.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 text-gray-500 text-xs p-3 rounded-lg border border-gray-100 flex items-start gap-2">
                <Package size={14} className="mt-0.5" />
                <p>
                  No surplus flagged yet. Toggle when leftover food is confirmed
                  available.
                </p>
              </div>
            )}
          </div>
        </div>

        <button 
          onClick={() => setIsModalOpen(true)}
          className="w-full mt-4 text-center text-xs text-gray-500 hover:text-green-700 border-t border-gray-100 pt-3 transition-colors"
        >
          View detailed Waste Reports
        </button>
      </div>

      <DetailedWasteModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
};

export default FoodWasteControl;
