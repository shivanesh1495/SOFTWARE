import React, { useState, useEffect, useRef, useCallback } from "react";
import { TrendingUp, RefreshCw, AlertCircle, Loader2 } from "lucide-react";
import axios from "axios";
import toast from "react-hot-toast";
import { API_CONFIG } from "../../services/api.config";

interface MLAnalyticsData {
  total_records: number;
  average_demand: number;
  metrics: { mape: number; rmse: number; mae_test?: number; r2?: number };
  top_drivers: Array<{ factor: string; importance: number }>;
  chart_data: Array<{ day: string; actual: number; predicted: number }>;
}

type ChartPoint = {
  label: string;
  predicted: number;
  actual: number;
};

type PredictionInput = {
  Day_of_Week: string;
  Meal_Type: string;
  Is_Veg: number;
  Event_Context: string;
  Weather: string;
};

const FORECAST_API_URL = API_CONFIG.FORECAST_API_URL;

const SCENARIO_FIELDS: Array<{
  label: string;
  key: "Day_of_Week" | "Meal_Type";
  options: string[];
}> = [
  {
    label: "Day",
    key: "Day_of_Week",
    options: [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ],
  },
  {
    label: "Meal",
    key: "Meal_Type",
    options: ["Breakfast", "Lunch", "Snacks", "Dinner"],
  },
];

const formatContextLabel = (context: string) => {
  if (context === "Normal") return "Normal Day";
  if (context === "Exam_Week") return "Exam Week";
  if (context === "Navratri_Festival") return "Festival";
  if (context === "Diwali_Break") return "Vacation";
  return context;
};

const formatChartLabel = (day: string, index: number) => {
  if (!day) return `D${index + 1}`;
  const parsed = new Date(day);
  if (Number.isNaN(parsed.getTime())) {
    return day;
  }
  return parsed.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
  });
};

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

const ManagerSimulator: React.FC = () => {
  const [mlData, setMlData] = useState<MLAnalyticsData | null>(null);
  const [mlOnline, setMlOnline] = useState(false);
  const [mlLoading, setMlLoading] = useState(true);
  const mlRefreshRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const [predictionInput, setPredictionInput] = useState<PredictionInput>({
    Day_of_Week: "Monday",
    Meal_Type: "Lunch",
    Is_Veg: 1,
    Event_Context: "Normal",
    Weather: "Sunny",
  });
  const [predictionResult, setPredictionResult] = useState<number | null>(null);

  const fetchML = useCallback(async (silent = false) => {
    if (!silent) setMlLoading(true);
    try {
      const mlRes = await axios
        .get(`${FORECAST_API_URL}/analytics`)
        .catch(() => null);
      if (mlRes?.data) {
        setMlData(mlRes.data);
        setMlOnline(true);
      } else {
        setMlOnline(false);
        setMlData(null);
      }
    } catch {
      setMlOnline(false);
      setMlData(null);
    } finally {
      if (!silent) setMlLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchML();
    mlRefreshRef.current = setInterval(() => fetchML(true), 30000);

    return () => {
      if (mlRefreshRef.current) {
        clearInterval(mlRefreshRef.current);
        mlRefreshRef.current = null;
      }
    };
  }, [fetchML]);

  const handleSimulate = async () => {
    try {
      const pred = await axios.post(
        `${FORECAST_API_URL}/predict`,
        predictionInput,
      );
      setPredictionResult(Math.round(Number(pred.data.prediction) || 0));

      await axios.post(`${FORECAST_API_URL}/scenario-stats`, {
        Day_of_Week: predictionInput.Day_of_Week,
        Meal_Type: predictionInput.Meal_Type,
      });

      // Pull fresh model analytics so the graph reflects latest real values.
      await fetchML(true);
      toast.success("Prediction Updated!");
    } catch {
      toast.error("Prediction failed");
    }
  };

  const chartPoints: ChartPoint[] = (mlData?.chart_data || [])
    .map((point, index) => {
      const predicted = Number(point.predicted);
      const actual = Number(point.actual);
      return {
        label: formatChartLabel(point.day, index),
        predicted: Number.isFinite(predicted) ? predicted : 0,
        actual: Number.isFinite(actual) ? actual : 0,
      };
    })
    .slice(-7);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Simulator</h1>
          <p className="text-sm text-gray-500 mt-1">
            Scenario simulator and key demand drivers from the ML engine.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          <span
            className={`px-3 py-1 rounded-full text-xs font-medium border ${mlOnline ? "bg-green-100 text-green-700 border-green-200" : "bg-red-100 text-red-700 border-red-200"}`}
          >
            {mlOnline ? "Online" : "Offline"}
          </span>
          <button
            onClick={() => fetchML(false)}
            className="p-2 text-gray-400 hover:text-gray-600"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {mlLoading ? (
        <div className="p-8 text-center text-gray-500">
          <Loader2 className="animate-spin inline mr-2" size={20} />
          Connecting...
        </div>
      ) : !mlOnline || !mlData ? (
        <div className="p-8 flex flex-col items-center justify-center bg-white rounded-xl border shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-700">
            Engine Offline
          </h3>
          <p className="text-gray-500 mt-2 text-center max-w-md">
            Start the Python service (port 5001).
          </p>
          <button
            onClick={() => fetchML(false)}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 flex items-center gap-2"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      ) : (
        <>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" />
                Real Predicted vs Actual Demand
              </h3>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="flex items-center gap-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="text-[10px] text-green-600 font-medium">
                  Live model data
                </span>
              </span>
              <span className="text-[10px] text-gray-400">
                Worm graph from analytics endpoint
              </span>
            </div>

            {chartPoints.length === 0 ? (
              <p className="text-gray-400 text-sm py-16 text-center">
                No prediction trend data available yet.
              </p>
            ) : (
              (() => {
                const W = 860;
                const H = 330;
                const pad = { top: 24, right: 24, bottom: 58, left: 58 };
                const cW = W - pad.left - pad.right;
                const cH = H - pad.top - pad.bottom;
                const count = chartPoints.length;

                const values = chartPoints.flatMap((p) => [
                  p.predicted,
                  p.actual,
                ]);
                const maxVal = Math.max(...values, 1);
                const minVal = Math.min(...values, 0);
                const yRange = maxVal - minVal;
                const yMax = maxVal + yRange * 0.1;
                const yMin = Math.max(0, minVal - yRange * 0.1);

                const xStep = count > 1 ? cW / (count - 1) : cW / 2;
                const getX = (i: number) =>
                  pad.left + (count > 1 ? i * xStep : cW / 2);
                const getY = (v: number) =>
                  pad.top + cH - ((v - yMin) / (yMax - yMin || 1)) * cH;

                const predPts = chartPoints.map((p, i) => ({
                  x: getX(i),
                  y: getY(p.predicted),
                }));
                const actPts = chartPoints.map((p, i) => ({
                  x: getX(i),
                  y: getY(p.actual),
                }));

                const predPath = smoothPath(predPts);
                const actPath = smoothPath(actPts);
                const predFill =
                  predPath +
                  `L${predPts[predPts.length - 1].x},${pad.top + cH}L${predPts[0].x},${pad.top + cH}Z`;
                const actFill =
                  actPath +
                  `L${actPts[actPts.length - 1].x},${pad.top + cH}L${actPts[0].x},${pad.top + cH}Z`;

                const yTicks = Array.from({ length: 5 }, (_, i) => {
                  const val = yMin + ((yMax - yMin) * i) / 4;
                  return { val: Math.round(val), y: getY(val) };
                });

                const hi =
                  hoveredIdx != null && hoveredIdx < chartPoints.length
                    ? hoveredIdx
                    : null;

                return (
                  <div
                    className="relative"
                    onMouseLeave={() => setHoveredIdx(null)}
                  >
                    <svg
                      viewBox={`0 0 ${W} ${H}`}
                      className="w-full h-auto"
                      preserveAspectRatio="xMidYMid meet"
                    >
                      <defs>
                        <linearGradient
                          id="simPredGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#3B82F6"
                            stopOpacity="0.18"
                          />
                          <stop
                            offset="100%"
                            stopColor="#3B82F6"
                            stopOpacity="0.01"
                          />
                        </linearGradient>
                        <linearGradient
                          id="simActGrad"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor="#10B981"
                            stopOpacity="0.18"
                          />
                          <stop
                            offset="100%"
                            stopColor="#10B981"
                            stopOpacity="0.01"
                          />
                        </linearGradient>
                      </defs>

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

                      {chartPoints.length > 1 && (
                        <>
                          <path d={predFill} fill="url(#simPredGrad)" />
                          <path d={actFill} fill="url(#simActGrad)" />
                        </>
                      )}

                      <path
                        d={predPath}
                        fill="none"
                        stroke="#3B82F6"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d={actPath}
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />

                      {chartPoints.map((_d, i) => (
                        <rect
                          key={`hover-${i}`}
                          x={getX(i) - xStep / 2}
                          y={pad.top}
                          width={xStep}
                          height={cH}
                          fill="transparent"
                          className="cursor-crosshair"
                          onMouseEnter={() => setHoveredIdx(i)}
                        />
                      ))}

                      {hi != null && (
                        <line
                          x1={getX(hi)}
                          y1={pad.top}
                          x2={getX(hi)}
                          y2={pad.top + cH}
                          stroke="#94A3B8"
                          strokeWidth="1"
                          strokeDasharray="4,3"
                        />
                      )}

                      {chartPoints.map((point, i) => {
                        const isHovered = hi === i;
                        return (
                          <g key={i}>
                            <circle
                              cx={getX(i)}
                              cy={getY(point.predicted)}
                              r={isHovered ? 6 : 4}
                              fill={isHovered ? "#3B82F6" : "white"}
                              stroke="#3B82F6"
                              strokeWidth="2"
                            />
                            <circle
                              cx={getX(i)}
                              cy={getY(point.actual)}
                              r={isHovered ? 6 : 4}
                              fill={isHovered ? "#10B981" : "white"}
                              stroke="#10B981"
                              strokeWidth="2"
                            />
                            <text
                              x={getX(i)}
                              y={pad.top + cH + 18}
                              textAnchor="middle"
                              fontSize="11"
                              className="fill-gray-500"
                              fontFamily="system-ui"
                            >
                              {point.label}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {hi != null && chartPoints[hi] && (
                      <div
                        className="absolute pointer-events-none z-20 bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 min-w-[180px]"
                        style={{
                          top: "18px",
                          left: `calc(${(predPts[hi].x / W) * 100}% + 12px)`,
                          transform: "translateX(-25%)",
                        }}
                      >
                        <p className="text-xs font-semibold text-gray-800 mb-2 border-b border-gray-100 pb-1.5">
                          {chartPoints[hi].label}
                        </p>
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center gap-6">
                            <span className="text-xs text-blue-600 font-medium">
                              Predicted
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {chartPoints[hi].predicted.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex justify-between items-center gap-6">
                            <span className="text-xs text-emerald-600 font-medium">
                              Actual
                            </span>
                            <span className="text-sm font-bold text-gray-900">
                              {chartPoints[hi].actual.toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-center gap-6 mt-2">
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
                  </div>
                );
              })()
            )}
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-800 mb-4">
              Key Demand Drivers
            </h3>
            <div className="space-y-3">
              {mlData.top_drivers.map((driver, index) => {
                const maxImportance = Math.max(
                  ...mlData.top_drivers.map((item) => item.importance),
                  1,
                );

                return (
                  <div key={`${driver.factor}-${index}`}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600 truncate">
                        {driver.factor}
                      </span>
                      <span className="text-gray-900 font-medium">
                        {(driver.importance * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-indigo-400 h-full rounded-full"
                        style={{
                          width: `${(driver.importance / maxImportance) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-base font-semibold text-gray-800 mb-6 border-b pb-2 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" />
              Scenario Simulator
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
              {SCENARIO_FIELDS.map((field) => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    {field.label}
                  </label>
                  <select
                    className="w-full p-2 border rounded-lg text-sm"
                    value={predictionInput[field.key]}
                    onChange={(e) =>
                      setPredictionInput((prev) => ({
                        ...prev,
                        [field.key]: e.target.value,
                      }))
                    }
                  >
                    {field.options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Weather
                </label>
                <select
                  className="w-full p-2 border rounded-lg text-sm"
                  value={predictionInput.Weather}
                  onChange={(e) =>
                    setPredictionInput((prev) => ({
                      ...prev,
                      Weather: e.target.value,
                    }))
                  }
                >
                  {["Sunny", "Cloudy", "Rainy", "Cold"].map((weather) => (
                    <option key={weather} value={weather}>
                      {weather}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Context
                </label>
                <select
                  className="w-full p-2 border rounded-lg text-sm"
                  value={predictionInput.Event_Context}
                  onChange={(e) =>
                    setPredictionInput((prev) => ({
                      ...prev,
                      Event_Context: e.target.value,
                    }))
                  }
                >
                  <option value="Normal">Normal Day</option>
                  <option value="Exam_Week">Exam Week</option>
                  <option value="Navratri_Festival">Festival</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Diwali_Break">Vacation</option>
                  <option value="Graduation">Graduation</option>
                </select>
              </div>
              <button
                onClick={handleSimulate}
                className="bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-sm font-medium"
              >
                Simulate
              </button>
            </div>

            {predictionResult !== null && (
              <div className="mt-6 bg-indigo-50 border border-indigo-100 p-4 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-indigo-600 font-medium text-xs uppercase tracking-wider">
                    Predicted
                  </span>
                  <div className="text-2xl font-bold text-gray-900 mt-1">
                    {predictionResult}{" "}
                    <span className="text-sm font-normal text-gray-500">
                      units
                    </span>
                  </div>
                </div>
                <div className="text-right text-sm text-indigo-900 font-medium">
                  {predictionInput.Day_of_Week}, {predictionInput.Meal_Type},{" "}
                  {predictionInput.Weather},{" "}
                  {formatContextLabel(predictionInput.Event_Context)}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default ManagerSimulator;
