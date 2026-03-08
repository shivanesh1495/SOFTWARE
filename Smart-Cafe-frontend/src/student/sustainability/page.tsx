import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  Leaf,
  Recycle,
  Loader2,
  TrendingUp,
  TrendingDown,
  Heart,
  Lightbulb,
  BarChart3,
  Calendar,
  ChevronRight,
  CheckCircle2,
  Globe,
  RefreshCw,
  ChevronDown,
  Utensils,
  AlertCircle,
  AlertTriangle,
  Package,
} from "lucide-react";
import Button from "../../components/common/Button";
import * as sustainabilityService from "../../services/sustainability.service";
import * as canteenService from "../../services/canteen.service";
import { getPublicSettings } from "../../services/system.service";
import type {
  SustainabilityMetrics,
  WasteReport,
  Donation,
} from "../../services/sustainability.service";
import type { Canteen } from "../../services/canteen.service";
import toast from "react-hot-toast";

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

const getEcoGrade = (
  score: number,
): { grade: string; color: string; bg: string; label: string } => {
  if (score >= 85)
    return {
      grade: "A",
      color: "text-emerald-700",
      bg: "bg-emerald-100",
      label: "Excellent",
    };
  if (score >= 70)
    return {
      grade: "B",
      color: "text-green-700",
      bg: "bg-green-100",
      label: "Good",
    };
  if (score >= 50)
    return {
      grade: "C",
      color: "text-yellow-700",
      bg: "bg-yellow-100",
      label: "Average",
    };
  if (score >= 30)
    return {
      grade: "D",
      color: "text-orange-700",
      bg: "bg-orange-100",
      label: "Below Avg",
    };
  return {
    grade: "E",
    color: "text-red-700",
    bg: "bg-red-100",
    label: "Needs Work",
  };
};

const ECO_GRADE_COLOR: Record<string, string> = {
  A: "text-emerald-600 bg-emerald-50",
  B: "text-green-600 bg-green-50",
  C: "text-yellow-600 bg-yellow-50",
  D: "text-orange-600 bg-orange-50",
  E: "text-red-600 bg-red-50",
};

const WASTE_REASONS = [
  "Too much food",
  "Did not like the taste",
  "Food was cold",
  "Not hungry",
  "Poor quality",
  "Other",
] as const;

const StudentSustainability: React.FC = () => {
  const [wasteMealType, setWasteMealType] = useState("LUNCH");
  const [wasteAmount, setWasteAmount] = useState<string>("None");
  const [wasteReason, setWasteReason] = useState("");
  const [wasteNotes, setWasteNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [metrics, setMetrics] = useState<SustainabilityMetrics | null>(null);
  const [recentReports, setRecentReports] = useState<WasteReport[]>([]);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [portionSize, setPortionSize] = useState<"Standard" | "Small">(
    "Standard",
  );
  const [surplusDonationEnabled, setSurplusDonationEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "report" | "history" | "donations"
  >("report");

  // Pagination states
  const [reportPage, setReportPage] = useState(1);
  const [reportTotal, setReportTotal] = useState(0);
  const [hasMoreReports, setHasMoreReports] = useState(false);
  const [loadingMoreReports, setLoadingMoreReports] = useState(false);
  const [donationPage, setDonationPage] = useState(1);
  const [loadingMoreDonations, setLoadingMoreDonations] = useState(false);
  const [hasMoreDonations, setHasMoreDonations] = useState(false);

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [
        metricsData,
        reportsData,
        donationData,
        canteenData,
        publicSettings,
      ] = await Promise.all([
        sustainabilityService.getSustainabilityMetrics().catch(() => null),
        sustainabilityService
          .getMyWasteReports({ limit: 10, page: 1 })
          .catch(() => ({ reports: [], total: 0 })),
        sustainabilityService.getDonationHistory({ limit: 10 }).catch(() => []),
        canteenService.getCanteens({ isActive: true }).catch(() => []),
        getPublicSettings().catch(() => null),
      ]);
      setMetrics(metricsData);
      setRecentReports(reportsData.reports || []);
      setReportTotal(reportsData.total || 0);
      setReportPage(1);
      setHasMoreReports(
        reportsData.hasNextPage ?? reportsData.reports?.length === 10,
      );
      const dArr = Array.isArray(donationData) ? donationData : [];
      setDonations(dArr);
      setDonationPage(1);
      setHasMoreDonations(dArr.length >= 10);
      setCanteens(Array.isArray(canteenData) ? canteenData : []);
      if (publicSettings) {
        setPortionSize(publicSettings.portionSize || "Standard");
        setSurplusDonationEnabled(
          publicSettings.surplusDonationEnabled ?? false,
        );
      }
    } catch (error) {
      console.error("Failed to load sustainability data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh on window focus
  useEffect(() => {
    const handleFocus = () => loadData(true);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [loadData]);

  const loadMoreReports = async () => {
    setLoadingMoreReports(true);
    try {
      const nextPage = reportPage + 1;
      const data = await sustainabilityService.getMyWasteReports({
        limit: 10,
        page: nextPage,
      });
      setRecentReports((prev) => [...prev, ...(data.reports || [])]);
      setReportPage(nextPage);
      setHasMoreReports(data.hasNextPage ?? data.reports?.length === 10);
    } catch {
      toast.error("Failed to load more reports");
    } finally {
      setLoadingMoreReports(false);
    }
  };

  const loadMoreDonations = async () => {
    setLoadingMoreDonations(true);
    try {
      const nextLimit = (donationPage + 1) * 10;
      const data = await sustainabilityService.getDonationHistory({
        limit: nextLimit,
      });
      const dArr = Array.isArray(data) ? data : [];
      setDonations(dArr);
      setDonationPage((p) => p + 1);
      setHasMoreDonations(dArr.length >= nextLimit);
    } catch {
      toast.error("Failed to load more donations");
    } finally {
      setLoadingMoreDonations(false);
    }
  };

  const handleWasteReport = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await sustainabilityService.submitWasteReport({
        wasteAmount,
        ...(wasteReason ? { reason: wasteReason } : {}),
        ...(wasteNotes.trim() ? { notes: wasteNotes.trim() } : {}),
        mealType: wasteMealType,
      });
      toast.success("Waste report submitted! Thank you for your honesty.");
      setWasteReason("");
      setWasteNotes("");
      setWasteAmount("None");
      loadData(true);
    } catch (error: any) {
      console.error("Failed to submit waste report:", error);
      toast.error(
        error?.response?.data?.message ||
          "Failed to submit report. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const ecoScore = metrics?.currentEcoScore ?? 0;
  const globalScore = metrics?.globalEcoScore ?? 0;
  const improvement = metrics?.improvement ?? 0;
  const totalReports = metrics?.totalReportsThisMonth ?? 0;
  const gradeInfo = getEcoGrade(ecoScore);
  const globalGradeInfo = getEcoGrade(globalScore);

  // Dynamic tip based on user's waste patterns
  const dynamicTip = useMemo(() => {
    if (recentReports.length === 0)
      return "Start by reporting your food waste after each meal to build your sustainability profile.";

    const wasteDistribution: Record<string, number> = {};
    recentReports.forEach((r) => {
      wasteDistribution[r.wasteAmount] =
        (wasteDistribution[r.wasteAmount] || 0) + 1;
    });

    const total = recentReports.length;
    const highWaste =
      (wasteDistribution["Most"] || 0) + (wasteDistribution["All"] || 0);
    const noWaste = wasteDistribution["None"] || 0;

    if (noWaste / total > 0.7)
      return "Amazing! You eat most of your food. You're a sustainability champion! Keep it up.";
    if (highWaste / total > 0.4)
      return "You seem to waste quite a bit. Try ordering smaller portions or sharing with friends.";
    if (ecoScore >= 85)
      return "Your eco-score is excellent! Keep maintaining your sustainable habits.";
    if (ecoScore >= 70)
      return "You're doing well! Try to reduce waste further — maybe skip desserts if you're often full.";
    if (ecoScore < 50)
      return "Your eco-score needs improvement. Focus on finishing meals or ordering less next time.";
    return "Give honest feedback on portion sizes to help the cafeteria improve for everyone.";
  }, [recentReports, ecoScore]);

  // Waste distribution for mini chart
  const wasteBreakdown = useMemo(() => {
    const counts: Record<string, number> = {
      None: 0,
      Little: 0,
      Some: 0,
      Most: 0,
      All: 0,
    };
    recentReports.forEach((r) => {
      if (counts[r.wasteAmount] !== undefined) counts[r.wasteAmount]++;
    });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts).map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / max) * 100),
    }));
  }, [recentReports]);

  // Food waste risk computation (same algorithm as manager dashboard)
  const wasteRisk = useMemo(() => {
    if (recentReports.length === 0)
      return { label: "N/A", color: "gray", pct: 0 };
    const highWaste = recentReports.filter((r) =>
      ["Most", "All"].includes(r.wasteAmount),
    ).length;
    const total = recentReports.length;
    const pct = (highWaste / total) * 100;
    if (pct < 10) return { label: "Low", color: "green", pct };
    if (pct < 30) return { label: "Medium", color: "amber", pct };
    return { label: "High", color: "red", pct };
  }, [recentReports]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <Loader2 size={32} className="animate-spin mb-3" />
        <p className="text-sm">Loading sustainability data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Leaf className="text-green-600" size={28} />
            Sustainability
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track your food waste, view your eco-score, and help reduce campus
            waste.
          </p>
        </div>
        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
          title="Refresh data"
        >
          <RefreshCw size={20} className={refreshing ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Eco Score Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Personal Grade Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl ${gradeInfo.bg} flex items-center justify-center`}
          >
            <span className={`text-2xl font-extrabold ${gradeInfo.color}`}>
              {gradeInfo.grade}
            </span>
          </div>
          <div>
            <p className="text-xs text-gray-500">Your Eco Grade</p>
            <p className={`text-lg font-bold ${gradeInfo.color}`}>
              {gradeInfo.label}
            </p>
            <p className="text-xs text-gray-400">{ecoScore} / 100 pts</p>
          </div>
        </div>

        {/* Global Eco Score */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl ${globalGradeInfo.bg} flex items-center justify-center`}
          >
            <Globe className={globalGradeInfo.color} size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Campus Average</p>
            <p className={`text-lg font-bold ${globalGradeInfo.color}`}>
              {globalScore} pts
            </p>
            <p className="text-xs text-gray-400">
              {ecoScore > globalScore
                ? `You're ${ecoScore - globalScore} pts above avg`
                : ecoScore < globalScore
                  ? `${globalScore - ecoScore} pts below avg`
                  : "Right at the average"}
            </p>
          </div>
        </div>

        {/* Improvement Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div
            className={`w-14 h-14 rounded-2xl flex items-center justify-center ${improvement >= 0 ? "bg-green-50" : "bg-red-50"}`}
          >
            {improvement >= 0 ? (
              <TrendingUp className="text-green-600" size={24} />
            ) : (
              <TrendingDown className="text-red-500" size={24} />
            )}
          </div>
          <div>
            <p className="text-xs text-gray-500">Monthly Trend</p>
            <p
              className={`text-lg font-bold ${improvement >= 0 ? "text-green-700" : "text-red-600"}`}
            >
              {improvement >= 0 ? "+" : ""}
              {improvement.toFixed(1)}%
            </p>
            <p className="text-xs text-gray-400">vs last month</p>
          </div>
        </div>

        {/* Reports Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
            <BarChart3 className="text-blue-600" size={24} />
          </div>
          <div>
            <p className="text-xs text-gray-500">Reports This Month</p>
            <p className="text-lg font-bold text-gray-900">{totalReports}</p>
            <p className="text-xs text-gray-400">
              {reportTotal} total all-time
            </p>
          </div>
        </div>
      </div>

      {/* Eco Score Progress + Waste Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Progress Bar */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">
              Your Eco-Score
            </span>
            <span className="text-sm font-bold text-gray-900">
              {ecoScore} / 100
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 relative">
            <div
              className={`h-3 rounded-full transition-all duration-700 ${
                ecoScore >= 85
                  ? "bg-emerald-500"
                  : ecoScore >= 70
                    ? "bg-green-500"
                    : ecoScore >= 50
                      ? "bg-yellow-500"
                      : ecoScore >= 30
                        ? "bg-orange-500"
                        : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, ecoScore)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>0</span>
            <span>30</span>
            <span>50</span>
            <span>70</span>
            <span>85</span>
            <span>100</span>
          </div>

          {/* Global comparison bar */}
          {globalScore > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs text-gray-500 flex items-center gap-1">
                  <Globe size={12} /> Campus Average
                </span>
                <span className="text-xs font-medium text-gray-600">
                  {globalScore}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="h-2 rounded-full bg-blue-400 transition-all duration-700"
                  style={{ width: `${Math.min(100, globalScore)}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Waste Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Your Waste Distribution
          </h3>
          {recentReports.length === 0 ? (
            <p className="text-sm text-gray-400 py-6 text-center">
              Submit reports to see your waste breakdown.
            </p>
          ) : (
            <div className="space-y-2.5">
              {wasteBreakdown.map((item) => {
                const colors = WASTE_COLORS[item.label] || WASTE_COLORS.Some;
                return (
                  <div key={item.label} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-12 text-right shrink-0">
                      {item.label}
                    </span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                      <div
                        className={`h-3 rounded-full ${colors.bar} transition-all duration-500`}
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-6 text-right">
                      {item.count}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Canteen Eco Scores */}
      {canteens.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
            <Utensils size={15} className="text-gray-400" />
            Canteen Eco Scores
          </h3>
          <div className="flex flex-wrap gap-3">
            {canteens.map((c) => {
              const grade = c.ecoScore || "C";
              const gc = ECO_GRADE_COLOR[grade] || ECO_GRADE_COLOR.C;
              return (
                <div
                  key={c.id || c._id}
                  className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2"
                >
                  <span
                    className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${gc}`}
                  >
                    {grade}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-800">
                      {c.name}
                    </p>
                    <p className="text-xs text-gray-400">{c.status}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dynamic Tip Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <Lightbulb className="text-green-600 mt-0.5 shrink-0" size={20} />
        <div>
          <p className="text-sm font-medium text-green-800">Personalized Tip</p>
          <p className="text-sm text-green-700 mt-0.5">{dynamicTip}</p>
        </div>
      </div>

      {/* Food Waste Risk Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-gray-500 text-sm font-medium">
              Food Waste Risk
            </h3>
            <div className="flex items-baseline gap-2 mt-2">
              <h2
                className={`text-3xl font-bold ${
                  wasteRisk.color === "green"
                    ? "text-green-600"
                    : wasteRisk.color === "amber"
                      ? "text-amber-600"
                      : wasteRisk.color === "red"
                        ? "text-red-600"
                        : "text-gray-400"
                }`}
              >
                {wasteRisk.label}
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
            <span className="font-medium">~{wasteRisk.pct.toFixed(1)}%</span> (
            {recentReports.length} total)
          </span>
        </div>

        <div className="space-y-4">
          {/* Portion Size Display */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 block">
              Portion Sizes
            </label>
            <div className="flex bg-white rounded-md border border-gray-200 p-1">
              <div
                className={`flex-1 text-xs py-1.5 rounded font-medium text-center transition ${
                  portionSize === "Standard"
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-gray-400"
                }`}
              >
                Standard
              </div>
              <div
                className={`flex-1 text-xs py-1.5 rounded font-medium text-center transition ${
                  portionSize === "Small"
                    ? "bg-green-600 text-white shadow-sm"
                    : "text-gray-400"
                }`}
              >
                Small (-10%)
              </div>
            </div>
          </div>

          {/* Surplus Donation Status */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Surplus Food Donation
              </span>
              <div
                className={`w-10 h-5 rounded-full flex items-center px-0.5 transition ${
                  surplusDonationEnabled
                    ? "bg-green-500 justify-end"
                    : "bg-gray-300 justify-start"
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </div>
            </div>

            {surplusDonationEnabled ? (
              <div className="bg-green-50 text-green-800 text-xs p-3 rounded-lg border border-green-100 flex items-start gap-2">
                <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium opacity-90">Marked for Donation</p>
                  <p className="mt-1 opacity-75">
                    Surplus food has been marked available for donation pickup.
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 text-gray-500 text-xs p-3 rounded-lg border border-gray-100 flex items-start gap-2">
                <Package size={14} className="mt-0.5 shrink-0" />
                <p>
                  No surplus flagged yet. Toggle when leftover food is confirmed
                  available.
                </p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={() => setActiveTab("history")}
          className="w-full mt-4 text-center text-xs text-gray-500 hover:text-green-700 border-t border-gray-100 pt-3 transition-colors"
        >
          View detailed Waste Reports
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          {[
            { key: "report" as const, icon: Recycle, label: "Report Waste" },
            {
              key: "history" as const,
              icon: Calendar,
              label: `My Reports (${reportTotal})`,
            },
            {
              key: "donations" as const,
              icon: Heart,
              label: `Donations (${donations.length})`,
            },
          ].map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === key
                  ? "text-green-700 border-b-2 border-green-600 bg-green-50/50"
                  : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <Icon size={16} />
                {label}
              </div>
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* Report Waste Tab */}
          {activeTab === "report" && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-amber-100 p-3 rounded-full text-amber-600">
                  <Recycle size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Report Food Waste
                  </h3>
                  <p className="text-sm text-gray-500">
                    Honest reporting helps us adjust portion sizes and reduce
                    waste.
                  </p>
                </div>
              </div>

              <form onSubmit={handleWasteReport} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Meal Type
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {["BREAKFAST", "LUNCH", "DINNER", "SNACKS"].map((meal) => (
                      <button
                        key={meal}
                        type="button"
                        onClick={() => setWasteMealType(meal)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                          wasteMealType === meal
                            ? "bg-green-600 text-white border-green-600 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:bg-green-50"
                        }`}
                      >
                        {meal.charAt(0) + meal.slice(1).toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    How much did you waste?
                  </label>
                  <div className="grid grid-cols-5 gap-2">
                    {[
                      { value: "None", label: "None", emoji: "🎉" },
                      { value: "Little", label: "A Little", emoji: "👍" },
                      { value: "Some", label: "Some", emoji: "😐" },
                      { value: "Most", label: "Most", emoji: "😟" },
                      { value: "All", label: "All", emoji: "😢" },
                    ].map((option) => {
                      const colors =
                        WASTE_COLORS[option.value] || WASTE_COLORS.Some;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setWasteAmount(option.value)}
                          className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                            wasteAmount === option.value
                              ? `${colors.bg} ${colors.text} border-current ring-2 ${colors.ring} ring-opacity-30 shadow-sm`
                              : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                          }`}
                        >
                          <span className="text-lg">{option.emoji}</span>
                          <span className="text-xs">{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for waste{" "}
                    <span className="text-gray-400">(optional)</span>
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {WASTE_REASONS.map((reason) => (
                      <button
                        key={reason}
                        type="button"
                        onClick={() =>
                          setWasteReason((prev) =>
                            prev === reason ? "" : reason,
                          )
                        }
                        className={`px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                          wasteReason === reason
                            ? "bg-amber-100 text-amber-800 border-amber-400 shadow-sm"
                            : "bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:bg-amber-50"
                        }`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Additional notes{" "}
                    <span className="text-gray-400">(optional)</span>
                  </label>
                  <textarea
                    value={wasteNotes}
                    onChange={(e) => setWasteNotes(e.target.value)}
                    placeholder="Any extra details about your food waste..."
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none h-20 resize-none text-sm"
                    maxLength={500}
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700 focus:ring-green-500"
                  isLoading={isSubmitting}
                >
                  <CheckCircle2 size={18} className="mr-2" />
                  Submit Report
                </Button>
              </form>
            </div>
          )}

          {/* History Tab */}
          {activeTab === "history" && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-blue-100 p-3 rounded-full text-blue-600">
                  <Calendar size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Your Waste Reports
                  </h3>
                  <p className="text-sm text-gray-500">
                    {reportTotal > 0
                      ? `${reportTotal} total reports — showing ${recentReports.length}`
                      : "Your food waste history and trends"}
                  </p>
                </div>
              </div>

              {recentReports.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Recycle size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No reports yet</p>
                  <p className="text-sm mt-1">
                    Submit your first waste report to start tracking your
                    impact.
                  </p>
                  <button
                    onClick={() => setActiveTab("report")}
                    className="mt-4 text-green-600 text-sm font-medium hover:underline inline-flex items-center gap-1"
                  >
                    Submit a report <ChevronRight size={14} />
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentReports.map((report, idx) => {
                    const colors =
                      WASTE_COLORS[report.wasteAmount] || WASTE_COLORS.Some;
                    return (
                      <div
                        key={report.id || idx}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2.5 h-2.5 rounded-full ${colors.bar}`}
                          />
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {report.mealType
                                ? report.mealType.charAt(0) +
                                  report.mealType.slice(1).toLowerCase()
                                : "Meal"}
                            </p>
                            <p className="text-xs text-gray-400">
                              {new Date(
                                report.createdAt || report.date,
                              ).toLocaleDateString("en-US", {
                                weekday: "short",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {report.reason && (
                            <span className="text-xs text-gray-400 max-w-[150px] truncate hidden sm:block">
                              {report.reason}
                            </span>
                          )}
                          <span
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold ${colors.bg} ${colors.text}`}
                          >
                            {report.wasteAmount}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {hasMoreReports && (
                    <button
                      onClick={loadMoreReports}
                      disabled={loadingMoreReports}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-green-600 font-medium hover:bg-green-50 rounded-lg transition-colors"
                    >
                      {loadingMoreReports ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                      {loadingMoreReports ? "Loading..." : "Load more reports"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Donations Tab */}
          {activeTab === "donations" && (
            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="bg-pink-100 p-3 rounded-full text-pink-600">
                  <Heart size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">
                    Surplus Food Donations
                  </h3>
                  <p className="text-sm text-gray-500">
                    Leftover food donated to those in need
                  </p>
                </div>
              </div>

              {donations.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Heart size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No donations recorded yet</p>
                  <p className="text-sm mt-1">
                    Surplus food donations from the cafeteria will appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {donations.map((donation) => (
                    <div
                      key={donation._id}
                      className="p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                              donation.status === "donated"
                                ? "bg-green-100 text-green-700"
                                : donation.status === "pending"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {donation.status.charAt(0).toUpperCase() +
                              donation.status.slice(1)}
                          </span>
                          {donation.mealType && (
                            <span className="text-xs text-gray-400">
                              {donation.mealType.charAt(0) +
                                donation.mealType.slice(1).toLowerCase()}
                            </span>
                          )}
                          {donation.totalQuantity > 0 && (
                            <span className="text-xs text-gray-500 font-medium">
                              {donation.totalQuantity} portions
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(donation.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        {donation.items.map((item, idx) => (
                          <span
                            key={idx}
                            className="bg-white px-2 py-0.5 rounded text-xs text-gray-700 border border-gray-200"
                          >
                            {item.itemName || item.name} x{item.quantity}
                            {item.unit ? ` ${item.unit}` : ""}
                          </span>
                        ))}
                      </div>
                      {donation.donatedTo && (
                        <p className="text-xs text-gray-500 mt-1">
                          Donated to:{" "}
                          <span className="font-medium text-gray-700">
                            {donation.donatedTo}
                          </span>
                        </p>
                      )}
                      {donation.loggedBy?.fullName && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          Logged by {donation.loggedBy.fullName}
                        </p>
                      )}
                      {donation.notes && (
                        <p className="text-xs text-gray-400 mt-1 italic">
                          {donation.notes}
                        </p>
                      )}
                    </div>
                  ))}

                  {hasMoreDonations && (
                    <button
                      onClick={loadMoreDonations}
                      disabled={loadingMoreDonations}
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-sm text-green-600 font-medium hover:bg-green-50 rounded-lg transition-colors"
                    >
                      {loadingMoreDonations ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <ChevronDown size={16} />
                      )}
                      {loadingMoreDonations
                        ? "Loading..."
                        : "Load more donations"}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentSustainability;
