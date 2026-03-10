import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Filter,
  BarChart2,
  Loader2,
  TrendingUp,
  RefreshCw,
  Cloud,
  Sun,
  CloudRain,
  CloudLightning,
  Thermometer,
  Droplets,
  Clock,
  Layers,
  Star,
  Building2,
} from "lucide-react";
import {
  getWeeklyForecast,
  getDailyForecast,
  getAccuracyMetrics,
  getHourlyForecast,
  getWeeklyTrends,
  getMonthlyTrends,
  recordActual,
  type DailyForecast,
  type MealForecast,
  type AccuracyMetrics,
  type HourlyForecast as HourlyForecastType,
  type TrendData,
} from "../../services/forecast.service";
import { getCanteens, type Canteen } from "../../services/canteen.service";
import toast from "react-hot-toast";

type TabKey = "overview" | "hourly" | "trends";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <BarChart2 size={16} /> },
  { key: "hourly", label: "Hourly", icon: <Clock size={16} /> },
];

const ManagerForecasts: React.FC = () => {
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const initialTab: TabKey = tabParam === "hourly" ? "hourly" : "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [mealFilter, setMealFilter] = useState("All");
  const [loading, setLoading] = useState(true);

  // Canteen selection state
  const STORAGE_KEY = "manager_selected_canteen";
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [selectedCanteenId, setSelectedCanteenId] = useState<string>(
    localStorage.getItem(STORAGE_KEY) || "",
  );
  const [loadingCanteens, setLoadingCanteens] = useState(true);

  // Load canteens on mount
  useEffect(() => {
    const loadCanteens = async () => {
      try {
        const data = await getCanteens({ isActive: true });
        setCanteens(data);
        if (!selectedCanteenId && data.length > 0) {
          const firstId = data[0].id || data[0]._id || "";
          setSelectedCanteenId(firstId);
          localStorage.setItem(STORAGE_KEY, firstId);
        }
      } catch (err) {
        console.error("Failed to load canteens:", err);
      } finally {
        setLoadingCanteens(false);
      }
    };
    loadCanteens();
  }, [selectedCanteenId]);

  const handleCanteenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newId = e.target.value;
    setSelectedCanteenId(newId);
    localStorage.setItem(STORAGE_KEY, newId);
  };

  // Overview data
  const [chartData, setChartData] = useState<number[]>([]);
  const [chartActuals, setChartActuals] = useState<number[]>([]);
  const [chartLabels, setChartLabels] = useState<string[]>([]);
  const [chartDates, setChartDates] = useState<string[]>([]);
  const [predictions, setPredictions] = useState<MealForecast[]>([]);
  const [accuracy, setAccuracy] = useState<AccuracyMetrics | null>(null);
  const [liveWeather, setLiveWeather] = useState<{
    condition: string;
    temperature: number;
    humidity: number;
    live: boolean;
  } | null>(null);

  // Build today's date string in local timezone (YYYY-MM-DD)
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  // Normalize a date string to YYYY-MM-DD for comparison
  const toDateKey = (d: string) => {
    const dt = new Date(d);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };

  // Hourly data
  const [hourlyData, setHourlyData] = useState<HourlyForecastType[]>([]);

  // Trends data
  const [weeklyTrends, setWeeklyTrends] = useState<TrendData[]>([]);
  const [monthlyTrends, setMonthlyTrends] = useState<TrendData[]>([]);
  const [trendView, setTrendView] = useState<"weekly" | "monthly">("weekly");
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);
  const [trendLastUpdated, setTrendLastUpdated] = useState<Date | null>(null);
  const [trendsLoading, setTrendsLoading] = useState(false);
  const trendRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [trendAnimKey, setTrendAnimKey] = useState(0);

  // Recording actual count
  const [recordingMeal, setRecordingMeal] = useState<string | null>(null);
  const [actualInput, setActualInput] = useState<number>(0);

  // ========== DATA LOADING ==========

  const loadOverview = async () => {
    setLoading(true);
    try {
      // Start weekly chart from yesterday so we can see past actuals alongside today
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const weekStartStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, "0")}-${String(yesterday.getDate()).padStart(2, "0")}`;

      const [weekly, daily, acc] = await Promise.all([
        getWeeklyForecast(weekStartStr, selectedCanteenId).catch(() => []),
        getDailyForecast(todayStr, selectedCanteenId).catch(() => null),
        getAccuracyMetrics().catch(() => null),
      ]);

      const weeklyArr = Array.isArray(weekly) ? weekly : [];
      const labels: string[] = [];
      const predicted: number[] = [];
      const actuals: number[] = [];
      const dates: string[] = [];

      weeklyArr.forEach((day: DailyForecast) => {
        const d = new Date(day.date);
        labels.push(
          d.toLocaleDateString("en-IN", { weekday: "short", day: "numeric" }),
        );
        dates.push(day.date);
        let dayPredicted = 0;
        let dayActual = 0;
        (day.forecasts || []).forEach((f: MealForecast) => {
          dayPredicted += f.predictedCount || 0;
          dayActual += f.actualCount || 0;
        });
        predicted.push(dayPredicted);
        actuals.push(dayActual);
      });

      setChartLabels(labels);
      setChartData(predicted);
      setChartActuals(actuals);
      setChartDates(dates);

      // Fetch live weather for header indicator
      if (daily?.forecasts?.[0]?.weatherCondition) {
        setLiveWeather({
          condition: daily.forecasts[0].weatherCondition,
          temperature: (daily.forecasts[0] as any).temperature || 0,
          humidity: (daily.forecasts[0] as any).humidity || 0,
          live: true,
        });
      }

      if (daily?.forecasts) {
        let filtered = daily.forecasts;
        if (mealFilter !== "All") {
          filtered = filtered.filter(
            (f) => f.mealType === mealFilter.toUpperCase(),
          );
        }
        setPredictions(filtered);
      }
      if (acc) setAccuracy(acc);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  const loadHourly = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      const data = await getHourlyForecast(today, selectedCanteenId);
      setHourlyData(data || []);
    } catch {
      setHourlyData([]);
    }
  };

  const loadTrends = useCallback(async (silent = false) => {
    if (!silent) setTrendsLoading(true);
    try {
      const [wt, mt] = await Promise.all([
        getWeeklyTrends(8).catch(() => []),
        getMonthlyTrends(6).catch(() => []),
      ]);
      setWeeklyTrends(wt || []);
      setMonthlyTrends(mt || []);
      setTrendLastUpdated(new Date());
      setTrendAnimKey((k) => k + 1);
    } catch {
      /* ignore */
    } finally {
      if (!silent) setTrendsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!loadingCanteens) loadOverview();
  }, [mealFilter, selectedCanteenId, loadingCanteens]);
  useEffect(() => {
    if (activeTab === "hourly" && !loadingCanteens) loadHourly();
    if (activeTab === "trends") {
      loadTrends();
      trendRefreshRef.current = setInterval(() => loadTrends(true), 30000);
    }
    return () => {
      if (trendRefreshRef.current) {
        clearInterval(trendRefreshRef.current);
        trendRefreshRef.current = null;
      }
    };
  }, [activeTab, loadTrends]);

  // ========== HANDLERS ==========

  const handleRecordActual = async (forecast: MealForecast) => {
    if (recordingMeal === forecast.mealType) {
      try {
        // Always record actual for today's date
        await recordActual(
          todayStr,
          forecast.mealType,
          actualInput,
          selectedCanteenId,
        );
        toast.success(`Recorded ${actualInput} for ${forecast.mealType}`);
        setRecordingMeal(null);
        setActualInput(0);
        loadOverview();
      } catch {
        toast.error("Failed to record");
      }
    } else {
      setRecordingMeal(forecast.mealType);
      setActualInput(forecast.predictedCount);
    }
  };

  // ========== HELPERS ==========

  const getWeatherIcon = (c: string, size = 14) => {
    const l = c?.toLowerCase() || "";
    if (l.includes("storm"))
      return <CloudLightning size={size} className="text-purple-600" />;
    if (l.includes("rain"))
      return <CloudRain size={size} className="text-blue-600" />;
    if (l.includes("cloud"))
      return <Cloud size={size} className="text-gray-500" />;
    return <Sun size={size} className="text-amber-500" />;
  };

  const getWeatherBg = (c: string) => {
    const l = c?.toLowerCase() || "";
    if (l.includes("storm")) return "bg-purple-50 text-purple-700";
    if (l.includes("rain")) return "bg-blue-50 text-blue-700";
    if (l.includes("cloud")) return "bg-gray-100 text-gray-700";
    return "bg-amber-50 text-amber-700";
  };

  const maxVal =
    chartData.length > 0 ? Math.max(...chartData, ...chartActuals) : 1;

  // ========== RENDER ==========

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Forecast Analytics
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-driven demand prediction and planning.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {/* Canteen Selector */}
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm text-sm text-gray-700">
            <Building2 size={16} className="text-orange-500" />
            {loadingCanteens ? (
              <span className="text-gray-400">Loading...</span>
            ) : (
              <select
                value={selectedCanteenId}
                onChange={handleCanteenChange}
                className="bg-transparent border-none p-0 focus:ring-0 text-gray-800 font-medium cursor-pointer min-w-[120px]"
              >
                {canteens.map((canteen) => (
                  <option
                    key={canteen.id || canteen._id}
                    value={canteen.id || canteen._id}
                  >
                    {canteen.name}
                  </option>
                ))}
                {canteens.length === 0 && (
                  <option value="">No canteens available</option>
                )}
              </select>
            )}
          </div>

          {/* Live Weather Badge */}
          {liveWeather && (
            <div
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border shadow-sm ${getWeatherBg(liveWeather.condition)}`}
            >
              {getWeatherIcon(liveWeather.condition, 18)}
              <div>
                <span className="text-sm font-bold">
                  {liveWeather.condition}
                </span>
                {liveWeather.temperature > 0 && (
                  <span className="text-xs ml-1 opacity-75">
                    <Thermometer size={10} className="inline" />{" "}
                    {liveWeather.temperature}°C
                    <Droplets size={10} className="inline ml-1" />{" "}
                    {liveWeather.humidity}%
                  </span>
                )}
              </div>
              {liveWeather.live && (
                <span
                  className="w-2 h-2 bg-green-500 rounded-full animate-pulse"
                  title="Live"
                />
              )}
            </div>
          )}
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 px-3 border-r border-gray-200">
              <Filter size={16} className="text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Meal:</span>
            </div>
            <select
              value={mealFilter}
              onChange={(e) => setMealFilter(e.target.value)}
              className="text-sm border-none focus:ring-0 text-gray-600 font-medium cursor-pointer"
            >
              <option value="All">All Types</option>
              <option value="BREAKFAST">Breakfast</option>
              <option value="LUNCH">Lunch</option>
              <option value="DINNER">Dinner</option>
              <option value="SNACKS">Snacks</option>
            </select>
          </div>
        </div>
      </div>

      {/* Accuracy Summary Cards */}
      {accuracy && accuracy.overall.totalForecasts > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">
              Overall Accuracy
            </p>
            <p className="text-2xl font-bold text-green-600">
              {accuracy.overall.overallAccuracy}%
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">Total Forecasts</p>
            <p className="text-2xl font-bold text-gray-900">
              {accuracy.overall.totalForecasts}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">MAE</p>
            <p className="text-2xl font-bold text-orange-600">
              {accuracy.overall.mae}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">RMSE</p>
            <p className="text-2xl font-bold text-red-600">
              {accuracy.overall.rmse}
            </p>
          </div>
          <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-xs text-gray-500 font-medium">MAPE</p>
            <p className="text-2xl font-bold text-indigo-600">
              {accuracy.overall.mape}%
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ========== TAB: OVERVIEW ========== */}
      {activeTab === "overview" && (
        <>
          {/* Predicted vs Actual Bar Chart */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <BarChart2 size={18} className="text-blue-600" />
                Predicted vs Actual (7 Days)
              </h3>
              <div className="flex gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-2 bg-blue-500 rounded inline-block" />{" "}
                  Predicted
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-2 bg-emerald-500 rounded inline-block" />{" "}
                  Actual
                </span>
              </div>
            </div>

            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Loader2 className="animate-spin text-gray-300" size={32} />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                No forecast data available
              </div>
            ) : (
              <div className="h-64 flex">
                <div className="flex flex-col justify-between h-48 pr-2 text-right self-start mt-1">
                  {[1, 0.75, 0.5, 0.25, 0].map((f) => (
                    <span key={f} className="text-[10px] text-gray-400">
                      {Math.round(maxVal * f)}
                    </span>
                  ))}
                </div>
                <div className="flex-1 flex items-end justify-between gap-2">
                  {chartData.map((predicted, i) => {
                    const actual = chartActuals[i] || 0;
                    const pPct = Math.max(
                      (predicted / maxVal) * 100,
                      predicted > 0 ? 6 : 0,
                    );
                    const aPct = Math.max(
                      (actual / maxVal) * 100,
                      actual > 0 ? 6 : 0,
                    );
                    const isToday = toDateKey(chartDates[i]) === todayStr;
                    return (
                      <div
                        key={i}
                        className={`flex flex-col items-center gap-1 flex-1 group relative ${
                          isToday ? "" : ""
                        }`}
                      >
                        {/* Today indicator */}
                        {isToday && (
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-bold z-10 whitespace-nowrap shadow-md">
                            <Star size={10} fill="white" /> TODAY
                          </div>
                        )}
                        <div
                          className={`flex gap-0.5 items-end h-48 w-full rounded-xl transition-all ${
                            isToday
                              ? "ring-2 ring-amber-400 ring-offset-2 bg-amber-50/30"
                              : ""
                          }`}
                        >
                          {/* Predicted bar */}
                          <div
                            className={`flex-1 bg-gray-50 rounded-lg overflow-hidden h-full flex items-end border ${
                              isToday ? "border-amber-300" : "border-gray-100"
                            }`}
                          >
                            <div
                              className="w-full rounded-t-sm transition-all duration-500"
                              style={{
                                height: `${pPct}%`,
                                background: isToday
                                  ? "linear-gradient(to top, #d97706, #fbbf24)"
                                  : "linear-gradient(to top, #2563eb, #60a5fa)",
                              }}
                            >
                              {pPct > 20 && (
                                <div className="text-[9px] text-white font-bold text-center mt-1">
                                  {predicted}
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Actual bar */}
                          <div
                            className={`flex-1 bg-gray-50 rounded-lg overflow-hidden h-full flex items-end border ${
                              isToday ? "border-amber-300" : "border-gray-100"
                            }`}
                          >
                            <div
                              className="w-full rounded-t-sm transition-all duration-500"
                              style={{
                                height: `${aPct}%`,
                                background:
                                  "linear-gradient(to top, #059669, #34d399)",
                              }}
                            >
                              {aPct > 20 && (
                                <div className="text-[9px] text-white font-bold text-center mt-1">
                                  {actual}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            isToday
                              ? "text-amber-700 font-bold"
                              : "text-gray-500"
                          }`}
                        >
                          {chartLabels[i]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Meal-wise Predictions Table */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-semibold mb-4 text-gray-900">
              Meal-wise Predictions
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-medium">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Meal Type</th>
                    <th className="px-4 py-3">Predicted</th>
                    <th className="px-4 py-3">Actual</th>
                    <th className="px-4 py-3">Weather</th>
                    <th className="px-4 py-3">Accuracy</th>
                    <th className="px-4 py-3 rounded-r-lg">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="text-center py-8">
                        <Loader2
                          className="animate-spin inline text-gray-300"
                          size={24}
                        />
                      </td>
                    </tr>
                  ) : predictions.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-8 text-gray-400"
                      >
                        No predictions
                      </td>
                    </tr>
                  ) : (
                    predictions.map((f) => {
                      const accPct =
                        f.accuracy ||
                        accuracy?.byMealType?.find((m) => m._id === f.mealType)
                          ?.averageAccuracy ||
                        0;
                      return (
                        <tr
                          key={f.id || f.mealType}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {f.mealType}
                          </td>
                          <td className="px-4 py-3">
                            <span className="font-bold text-blue-600">
                              {f.predictedCount}
                            </span>
                            <span className="text-gray-400 ml-1">meals</span>
                          </td>
                          <td className="px-4 py-3">
                            {recordingMeal === f.mealType ? (
                              <input
                                type="number"
                                value={actualInput}
                                onChange={(e) =>
                                  setActualInput(parseInt(e.target.value) || 0)
                                }
                                className="w-20 border rounded px-2 py-1 text-sm"
                                autoFocus
                              />
                            ) : f.actualCount != null ? (
                              <span className="font-bold text-emerald-600">
                                {f.actualCount}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${getWeatherBg(f.weatherCondition)}`}
                            >
                              {getWeatherIcon(f.weatherCondition)}
                              {f.weatherCondition || "Unknown"}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${accPct >= 80 ? "bg-green-500" : accPct >= 60 ? "bg-yellow-500" : accPct > 0 ? "bg-red-500" : "bg-gray-300"}`}
                                  style={{ width: `${accPct}%` }}
                                />
                              </div>
                              <span className="text-xs font-semibold text-gray-700">
                                {Math.round(accPct)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleRecordActual(f)}
                              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                                recordingMeal === f.mealType
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              {recordingMeal === f.mealType
                                ? "Save"
                                : f.actualCount != null
                                  ? "Update"
                                  : "Record Actual"}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ========== TAB: HOURLY ========== */}
      {activeTab === "hourly" && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock size={18} className="text-blue-600" />
            Hourly Demand Distribution (Today)
            {hourlyData.some((h) => (h as any).dataSource === "learned") && (
              <span className="ml-auto text-[10px] bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">
                Pattern-learned from bookings
              </span>
            )}
          </h3>
          {hourlyData.length === 0 ? (
            <p className="text-gray-400 text-sm py-8 text-center">
              No hourly data
            </p>
          ) : (
            <div className="space-y-3">
              {hourlyData.map((h, i) => {
                const maxH = Math.max(
                  ...hourlyData.map((x) =>
                    Math.max(x.predicted, (x as any).actual || 0),
                  ),
                );
                const pctPredicted = maxH > 0 ? (h.predicted / maxH) * 100 : 0;
                const actual = (h as any).actual as number | null;
                const pctActual =
                  actual && maxH > 0 ? (actual / maxH) * 100 : 0;
                const mealColors: Record<string, string> = {
                  BREAKFAST: "bg-amber-500",
                  LUNCH: "bg-blue-500",
                  DINNER: "bg-indigo-500",
                  SNACKS: "bg-pink-500",
                };
                const mealBorderColors: Record<string, string> = {
                  BREAKFAST: "border-amber-500",
                  LUNCH: "border-blue-500",
                  DINNER: "border-indigo-500",
                  SNACKS: "border-pink-500",
                };
                return (
                  <div key={i} className="flex items-center gap-4">
                    <span className="w-20 text-xs text-gray-500 font-medium text-right">
                      {h.label}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full text-white font-medium ${mealColors[h.mealType] || "bg-gray-500"}`}
                    >
                      {h.mealType}
                    </span>
                    <div className="flex-1 space-y-1">
                      {/* Predicted bar */}
                      <div className="h-5 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 relative">
                        <div
                          className={`h-full rounded-lg transition-all duration-700 flex items-center px-2 ${mealColors[h.mealType] || "bg-gray-400"}`}
                          style={{
                            width: `${Math.max(pctPredicted, 8)}%`,
                            opacity: 0.85,
                          }}
                        >
                          <span className="text-[10px] text-white font-bold">
                            {h.predicted}
                          </span>
                        </div>
                      </div>
                      {/* Actual bar (only if there are actual bookings) */}
                      {actual != null && actual > 0 && (
                        <div className="h-3 bg-gray-50 rounded-lg overflow-hidden border border-gray-100 relative">
                          <div
                            className={`h-full rounded-lg border-2 ${mealBorderColors[h.mealType] || "border-gray-400"} bg-white`}
                            style={{ width: `${Math.max(pctActual, 6)}%` }}
                          >
                            <span className="text-[9px] text-gray-600 font-semibold px-1">
                              {actual}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Legend */}
              <div className="flex items-center gap-4 mt-4 pt-3 border-t border-gray-100 text-[10px] text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-blue-500 opacity-85 inline-block"></span>{" "}
                  ML Predicted
                </span>
                {hourlyData.some((h) => (h as any).actual > 0) && (
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded border-2 border-blue-500 bg-white inline-block"></span>{" "}
                    Actual Booked
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== TAB: TRENDS & ACCURACY ========== */}
      {activeTab === "trends" && (
        <div className="space-y-6">
          {/* Worm Graph — Predicted vs Actual */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" />
                Predicted vs Actual Demand
              </h3>
              <div className="flex items-center gap-3">
                <div className="flex gap-1 bg-gray-100 p-0.5 rounded-lg">
                  <button
                    onClick={() => {
                      setTrendView("weekly");
                      setHoveredTrendIdx(null);
                      setTrendAnimKey((k) => k + 1);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendView === "weekly" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Weekly
                  </button>
                  <button
                    onClick={() => {
                      setTrendView("monthly");
                      setHoveredTrendIdx(null);
                      setTrendAnimKey((k) => k + 1);
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${trendView === "monthly" ? "bg-white shadow-sm text-gray-900" : "text-gray-500 hover:text-gray-700"}`}
                  >
                    Monthly
                  </button>
                </div>
                <button
                  onClick={() => loadTrends()}
                  disabled={trendsLoading}
                  className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors rounded-lg hover:bg-blue-50"
                  title="Refresh trends"
                >
                  <RefreshCw
                    size={14}
                    className={trendsLoading ? "animate-spin" : ""}
                  />
                </button>
              </div>
            </div>
            {/* Live status bar */}
            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] text-green-600 font-medium">
                  Live
                </span>
              </span>
              <span className="text-[10px] text-gray-400">
                Auto-refreshes every 30s
                {trendLastUpdated &&
                  ` · Last: ${trendLastUpdated.toLocaleTimeString()}`}
              </span>
              {trendsLoading && (
                <Loader2 size={12} className="animate-spin text-blue-500" />
              )}
            </div>
            {(() => {
              const data =
                trendView === "weekly" ? weeklyTrends : monthlyTrends;
              const activeData = data.filter((d) => d.forecastCount > 0);
              if (activeData.length === 0)
                return (
                  <p className="text-gray-400 text-sm py-16 text-center">
                    No trend data available yet
                  </p>
                );

              // SVG chart dimensions
              const W = 800;
              const H = 340;
              const pad = { top: 30, right: 30, bottom: 60, left: 65 };
              const cW = W - pad.left - pad.right;
              const cH = H - pad.top - pad.bottom;

              const maxVal = Math.max(
                ...activeData.map((d) =>
                  Math.max(d.totalPredicted, d.totalActual),
                ),
              );
              const minVal = Math.min(
                ...activeData.map((d) =>
                  Math.min(d.totalPredicted, d.totalActual),
                ),
              );
              const yMax =
                maxVal + (maxVal - minVal) * 0.1 || maxVal * 1.1 || 100;
              const yMin = Math.max(0, minVal - (maxVal - minVal) * 0.1);

              const xStep =
                activeData.length > 1 ? cW / (activeData.length - 1) : cW / 2;
              const getX = (i: number) =>
                pad.left + (activeData.length > 1 ? i * xStep : cW / 2);
              const getY = (v: number) =>
                pad.top + cH - ((v - yMin) / (yMax - yMin || 1)) * cH;

              // Catmull-Rom → cubic bezier smooth path
              const smoothPath = (points: { x: number; y: number }[]) => {
                if (points.length < 2) return "";
                if (points.length === 2)
                  return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`;
                let d = `M${points[0].x},${points[0].y}`;
                for (let i = 0; i < points.length - 1; i++) {
                  const p0 = points[Math.max(i - 1, 0)];
                  const p1 = points[i];
                  const p2 = points[i + 1];
                  const p3 = points[Math.min(i + 2, points.length - 1)];
                  const cp1x = p1.x + (p2.x - p0.x) / 6;
                  const cp1y = p1.y + (p2.y - p0.y) / 6;
                  const cp2x = p2.x - (p3.x - p1.x) / 6;
                  const cp2y = p2.y - (p3.y - p1.y) / 6;
                  d += `C${cp1x},${cp1y},${cp2x},${cp2y},${p2.x},${p2.y}`;
                }
                return d;
              };

              const predPts = activeData.map((d, i) => ({
                x: getX(i),
                y: getY(d.totalPredicted),
              }));
              const actPts = activeData.map((d, i) => ({
                x: getX(i),
                y: getY(d.totalActual),
              }));

              const predPath = smoothPath(predPts);
              const actPath = smoothPath(actPts);

              // Gradient fill paths
              const predFill =
                predPath +
                `L${predPts[predPts.length - 1].x},${pad.top + cH}L${predPts[0].x},${pad.top + cH}Z`;
              const actFill =
                actPath +
                `L${actPts[actPts.length - 1].x},${pad.top + cH}L${actPts[0].x},${pad.top + cH}Z`;

              // Y-axis ticks (5 lines)
              const yTicks = Array.from({ length: 5 }, (_, i) => {
                const val = yMin + ((yMax - yMin) * i) / 4;
                return { val: Math.round(val), y: getY(val) };
              });

              const labels = activeData.map((d) =>
                trendView === "weekly"
                  ? (d.weekStart || "").slice(5)
                  : `${d.month} ${d.year}`,
              );

              const hi = hoveredTrendIdx; // hovered index

              return (
                <div
                  className="relative"
                  onMouseLeave={() => setHoveredTrendIdx(null)}
                >
                  <svg
                    key={trendAnimKey}
                    ref={svgRef}
                    viewBox={`0 0 ${W} ${H}`}
                    className="w-full h-auto"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    <defs>
                      <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#3B82F6"
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="100%"
                          stopColor="#3B82F6"
                          stopOpacity="0.01"
                        />
                      </linearGradient>
                      <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="0%"
                          stopColor="#10B981"
                          stopOpacity="0.2"
                        />
                        <stop
                          offset="100%"
                          stopColor="#10B981"
                          stopOpacity="0.01"
                        />
                      </linearGradient>
                      <filter id="glow">
                        <feGaussianBlur
                          stdDeviation="1.5"
                          result="coloredBlur"
                        />
                        <feMerge>
                          <feMergeNode in="coloredBlur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Y-axis grid lines */}
                    {yTicks.map((tick, i) => (
                      <g key={i}>
                        <line
                          x1={pad.left}
                          y1={tick.y}
                          x2={pad.left + cW}
                          y2={tick.y}
                          stroke="#E5E7EB"
                          strokeDasharray={i === 0 ? "0" : "4,4"}
                          strokeWidth="1"
                        />
                        <text
                          x={pad.left - 10}
                          y={tick.y + 4}
                          textAnchor="end"
                          className="fill-gray-400"
                          fontSize="11"
                          fontFamily="system-ui"
                        >
                          {tick.val.toLocaleString()}
                        </text>
                      </g>
                    ))}

                    {/* Gradient fills under curves — animated opacity */}
                    {activeData.length > 1 && (
                      <>
                        <path
                          d={predFill}
                          fill="url(#predGrad)"
                          opacity={hi != null ? 0.3 : 1}
                          style={{ transition: "opacity 0.3s" }}
                        >
                          <animate
                            attributeName="opacity"
                            from="0"
                            to={hi != null ? "0.3" : "1"}
                            dur="0.8s"
                            fill="freeze"
                          />
                        </path>
                        <path
                          d={actFill}
                          fill="url(#actGrad)"
                          opacity={hi != null ? 0.3 : 1}
                          style={{ transition: "opacity 0.3s" }}
                        >
                          <animate
                            attributeName="opacity"
                            from="0"
                            to={hi != null ? "0.3" : "1"}
                            dur="0.8s"
                            fill="freeze"
                          />
                        </path>
                      </>
                    )}

                    {/* Predicted line — animated stroke */}
                    <path
                      d={predPath}
                      fill="none"
                      stroke="#3B82F6"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                      strokeDasharray="2000"
                      strokeDashoffset="2000"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="2000"
                        to="0"
                        dur="1.2s"
                        fill="freeze"
                        calcMode="spline"
                        keySplines="0.4 0 0.2 1"
                        keyTimes="0;1"
                      />
                    </path>
                    {/* Actual line — animated stroke */}
                    <path
                      d={actPath}
                      fill="none"
                      stroke="#10B981"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      filter="url(#glow)"
                      strokeDasharray="2000"
                      strokeDashoffset="2000"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="2000"
                        to="0"
                        dur="1.2s"
                        begin="0.2s"
                        fill="freeze"
                        calcMode="spline"
                        keySplines="0.4 0 0.2 1"
                        keyTimes="0;1"
                      />
                    </path>

                    {/* Invisible hover zones — one per data point */}
                    {activeData.map((_d, i) => (
                      <rect
                        key={`hover-${i}`}
                        x={getX(i) - xStep / 2}
                        y={pad.top}
                        width={xStep}
                        height={cH}
                        fill="transparent"
                        className="cursor-crosshair"
                        onMouseEnter={() => setHoveredTrendIdx(i)}
                      />
                    ))}

                    {/* Hovered vertical guide line */}
                    {hi != null && (
                      <line
                        x1={getX(hi)}
                        y1={pad.top}
                        x2={getX(hi)}
                        y2={pad.top + cH}
                        stroke="#94A3B8"
                        strokeWidth="1"
                        strokeDasharray="4,3"
                        style={{ transition: "x1 0.15s, x2 0.15s" }}
                      />
                    )}

                    {/* Data points */}
                    {activeData.map((d, i) => {
                      const isHovered = hi === i;
                      const dimmed = hi != null && !isHovered;
                      return (
                        <g
                          key={i}
                          style={{ transition: "opacity 0.2s" }}
                          opacity={dimmed ? 0.35 : 1}
                        >
                          {/* Predicted dot */}
                          <circle
                            cx={getX(i)}
                            cy={getY(d.totalPredicted)}
                            r={isHovered ? 7 : 5}
                            fill={isHovered ? "#3B82F6" : "white"}
                            stroke="#3B82F6"
                            strokeWidth="2.5"
                            style={{ transition: "r 0.2s, fill 0.2s" }}
                          >
                            <animate
                              attributeName="r"
                              from="0"
                              to={isHovered ? "7" : "5"}
                              dur="0.4s"
                              begin={`${0.8 + i * 0.1}s`}
                              fill="freeze"
                            />
                          </circle>
                          {/* Actual dot */}
                          <circle
                            cx={getX(i)}
                            cy={getY(d.totalActual)}
                            r={isHovered ? 7 : 5}
                            fill={isHovered ? "#10B981" : "white"}
                            stroke="#10B981"
                            strokeWidth="2.5"
                            style={{ transition: "r 0.2s, fill 0.2s" }}
                          >
                            <animate
                              attributeName="r"
                              from="0"
                              to={isHovered ? "7" : "5"}
                              dur="0.4s"
                              begin={`${1.0 + i * 0.1}s`}
                              fill="freeze"
                            />
                          </circle>

                          {/* X-axis label */}
                          <text
                            x={getX(i)}
                            y={pad.top + cH + 20}
                            textAnchor="middle"
                            fontSize="11"
                            className="fill-gray-500"
                            fontFamily="system-ui"
                            fontWeight={isHovered ? "600" : "400"}
                          >
                            {labels[i]}
                          </text>
                          {/* Accuracy badge */}
                          {d.avgAccuracy != null && (
                            <text
                              x={getX(i)}
                              y={pad.top + cH + 35}
                              textAnchor="middle"
                              fontSize="10"
                              fill={
                                d.avgAccuracy >= 85
                                  ? "#16A34A"
                                  : d.avgAccuracy >= 70
                                    ? "#CA8A04"
                                    : "#DC2626"
                              }
                              fontWeight="600"
                              fontFamily="system-ui"
                            >
                              {d.avgAccuracy}%
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </svg>

                  {/* Floating Tooltip — rendered as HTML div for better styling */}
                  {hi != null &&
                    activeData[hi] &&
                    (() => {
                      const d = activeData[hi];
                      const diff =
                        d.totalPredicted > 0
                          ? Math.round(
                              ((d.totalActual - d.totalPredicted) /
                                d.totalPredicted) *
                                100,
                            )
                          : 0;
                      const accColor =
                        d.avgAccuracy != null
                          ? d.avgAccuracy >= 85
                            ? "text-green-600"
                            : d.avgAccuracy >= 70
                              ? "text-yellow-600"
                              : "text-red-600"
                          : "text-gray-400";
                      // Position tooltip relative to chart container
                      const xPct = ((getX(hi) - pad.left) / cW) * 100;
                      const isRight = xPct > 65;
                      return (
                        <div
                          className="absolute pointer-events-none z-20 bg-white/95 backdrop-blur-sm border border-gray-200 rounded-xl shadow-lg px-4 py-3 min-w-[180px]"
                          style={{
                            top: "20px",
                            left: isRight
                              ? undefined
                              : `calc(${(getX(hi) / W) * 100}% + 16px)`,
                            right: isRight
                              ? `calc(${((W - getX(hi)) / W) * 100}% + 16px)`
                              : undefined,
                            transition: "all 0.15s ease-out",
                          }}
                        >
                          <p className="text-xs font-semibold text-gray-800 mb-2 border-b border-gray-100 pb-1.5">
                            {labels[hi]}
                            <span className="ml-2 text-[10px] text-gray-400 font-normal">
                              {d.forecastCount} forecasts
                            </span>
                          </p>
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-blue-600 font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block"></span>
                                Predicted
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                {d.totalPredicted.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                                Actual
                              </span>
                              <span className="text-sm font-bold text-gray-900">
                                {d.totalActual.toLocaleString()}
                              </span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-100">
                            <span className={`text-xs font-bold ${accColor}`}>
                              {d.avgAccuracy != null
                                ? `${d.avgAccuracy}% accuracy`
                                : "No accuracy data"}
                            </span>
                            {diff !== 0 && (
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full ${diff > 0 ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}
                              >
                                {diff > 0 ? `+${diff}%` : `${diff}%`}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })()}

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <span
                        className="w-4 rounded bg-blue-500 inline-block"
                        style={{ height: "3px" }}
                      ></span>
                      <span className="w-2.5 h-2.5 rounded-full border-2 border-blue-500 bg-white inline-block"></span>
                      ML Predicted
                    </span>
                    <span className="flex items-center gap-2 text-sm text-gray-600">
                      <span
                        className="w-4 rounded bg-emerald-500 inline-block"
                        style={{ height: "3px" }}
                      ></span>
                      <span className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 bg-white inline-block"></span>
                      Actual
                    </span>
                  </div>

                  {/* Summary stats row */}
                  <div className="grid grid-cols-4 gap-4 mt-5 pt-5 border-t border-gray-100">
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Avg Accuracy</p>
                      <p className="text-xl font-bold text-gray-900">
                        {(() => {
                          const withAcc = activeData.filter(
                            (d) => d.avgAccuracy != null,
                          );
                          if (withAcc.length === 0) return "—";
                          return (
                            Math.round(
                              withAcc.reduce(
                                (s, d) => s + (d.avgAccuracy || 0),
                                0,
                              ) / withAcc.length,
                            ) + "%"
                          );
                        })()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">
                        Total Predicted
                      </p>
                      <p className="text-xl font-bold text-blue-600">
                        {activeData
                          .reduce((s, d) => s + d.totalPredicted, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Total Actual</p>
                      <p className="text-xl font-bold text-emerald-600">
                        {activeData
                          .reduce((s, d) => s + d.totalActual, 0)
                          .toLocaleString()}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400 mb-1">Variance</p>
                      <p
                        className={`text-xl font-bold ${(() => {
                          const tp = activeData.reduce(
                            (s, d) => s + d.totalPredicted,
                            0,
                          );
                          const ta = activeData.reduce(
                            (s, d) => s + d.totalActual,
                            0,
                          );
                          const pct = tp > 0 ? ((ta - tp) / tp) * 100 : 0;
                          return pct >= 0 ? "text-amber-600" : "text-blue-600";
                        })()}`}
                      >
                        {(() => {
                          const tp = activeData.reduce(
                            (s, d) => s + d.totalPredicted,
                            0,
                          );
                          const ta = activeData.reduce(
                            (s, d) => s + d.totalActual,
                            0,
                          );
                          const pct =
                            tp > 0 ? Math.round(((ta - tp) / tp) * 100) : 0;
                          return `${pct >= 0 ? "+" : ""}${pct}%`;
                        })()}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Accuracy by Meal Type */}
          {accuracy && accuracy.byMealType.length > 0 && (
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Layers size={18} className="text-blue-600" /> Accuracy by Meal
                Type
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {accuracy.byMealType.map((m) => {
                  const accColor =
                    m.averageAccuracy >= 80
                      ? "text-green-600"
                      : m.averageAccuracy >= 60
                        ? "text-yellow-600"
                        : "text-red-600";
                  const barColor =
                    m.averageAccuracy >= 80
                      ? "bg-green-500"
                      : m.averageAccuracy >= 60
                        ? "bg-yellow-500"
                        : "bg-red-500";
                  return (
                    <div
                      key={m._id}
                      className="border border-gray-100 rounded-xl p-4 text-center hover:border-blue-200 transition-colors"
                    >
                      <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                        {m._id}
                      </p>
                      <p className={`text-2xl font-bold mt-1 ${accColor}`}>
                        {m.averageAccuracy}%
                      </p>
                      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
                        <div
                          className={`h-full rounded-full ${barColor} transition-all duration-700`}
                          style={{ width: `${m.averageAccuracy}%` }}
                        />
                      </div>
                      <div className="flex justify-center gap-3 text-[10px] text-gray-400 mt-2">
                        <span>MAE {m.mae}</span>
                        <span>RMSE {m.rmse}</span>
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1">
                        {m.count} forecasts
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ManagerForecasts;
