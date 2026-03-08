import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Users, ChevronRight, Info, Loader2 } from "lucide-react";
import { cn } from "../../utils/cn";
import * as canteenService from "../../services/canteen.service";
import type { Canteen, CanteenConfig } from "../../services/canteen.service";

const CanteenSelection: React.FC = () => {
  const navigate = useNavigate();
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [config, setConfig] = useState<CanteenConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [canteenData, configData] = await Promise.all([
        canteenService.getCanteens({ isActive: true }),
        canteenService.getCanteenConfig(),
      ]);
      setCanteens(canteenData);
      setConfig(configData);
    } catch (error) {
      console.error("Failed to load canteens:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (id: string) => {
    localStorage.setItem("selectedCanteenId", id);
    navigate(`/user/booking?canteenId=${id}`);
  };

  const getCrowdColor = (level: string) => {
    // Dynamic: crowd levels come from config, styling by position
    if (!config) return "text-gray-600 bg-gray-50";
    const idx = config.crowdLevels.indexOf(level);
    const colors = [
      "text-green-600 bg-green-50",
      "text-amber-600 bg-amber-50",
      "text-red-600 bg-red-50",
    ];
    return colors[idx] ?? "text-gray-600 bg-gray-50";
  };

  const getStatusColor = (status: string) => {
    if (!config) return "bg-gray-100 text-gray-500";
    const idx = config.statuses.indexOf(status);
    const colors = [
      "bg-green-100 text-green-700",
      "bg-gray-100 text-gray-500",
      "bg-amber-100 text-amber-700",
    ];
    return colors[idx] ?? "bg-gray-100 text-gray-500";
  };

  const getAvatarColor = (canteen: Canteen, index: number) => {
    if (canteen.imageColor) return canteen.imageColor;
    const colorOptions = config?.colorOptions || [];
    return colorOptions.length > 0
      ? colorOptions[index % colorOptions.length].value
      : "bg-orange-100";
  };

  return (
    <div className="space-y-6 pb-20">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Select Canteen</h1>
        <p className="text-sm text-gray-500 mt-1">
          Choose where you'd like to eat today.
        </p>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} />
          <span>Loading canteens...</span>
        </div>
      ) : canteens.length === 0 ? (
        <div className="bg-white p-8 rounded-2xl border border-gray-100 text-center text-gray-500">
          <p>No canteens available right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {canteens.map((canteen, index) => {
            const canteenId = canteen.id || canteen._id || "";
            return (
              <div
                key={canteenId}
                onClick={() => handleSelect(canteenId)}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden p-4 flex gap-4 items-center"
              >
                {/* Image Placeholder */}
                <div
                  className={cn(
                    "w-20 h-20 rounded-xl flex items-center justify-center flex-shrink-0 text-gray-500 font-bold text-xl",
                    getAvatarColor(canteen, index),
                  )}
                >
                  {canteen.name[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-gray-900 truncate">
                      {canteen.name}
                    </h3>
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-1 rounded-full",
                        getStatusColor(canteen.status),
                      )}
                    >
                      {canteen.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    <div
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md",
                        getCrowdColor(canteen.crowd),
                      )}
                    >
                      <Users size={12} />
                      {canteen.crowd} Crowd
                    </div>
                    {canteen.location && (
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <MapPin size={12} />
                        <span>{canteen.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="ml-2">
                  <button className="p-2 rounded-full bg-gray-50 text-gray-400 group-hover:bg-brand-light group-hover:text-brand transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="bg-brand-light border border-brand/20 rounded-xl p-4 flex gap-3">
        <Info size={20} className="text-brand flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-800">
          <strong>Tip:</strong> Check the crowd status before booking to avoid
          long wait times.
        </p>
      </div>
    </div>
  );
};

export default CanteenSelection;
