import React, { useState, useEffect, useCallback } from "react";
import { Utensils, Scale, UtensilsCrossed, Package } from "lucide-react";
import { getAllSettings } from "../../../services/system.service";
import { useRealtimeRefresh } from "../../../hooks/useRealtimeRefresh";

const ServingRules: React.FC = () => {
  const [rules, setRules] = useState({
    riceLimit: 0,
    curryLimit: 0,
    portionMode: "Standard" as "Standard" | "Small",
    surplusDonation: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchRules = async () => {
    try {
      const settings = await getAllSettings();
      const map: Record<string, string> = {};
      settings.forEach((s) => {
        map[s.settingKey] = s.settingValue;
      });

      setRules({
        riceLimit: parseInt(map["RICE_PORTION_LIMIT_G"]) || 0,
        curryLimit: parseInt(map["CURRY_PORTION_LIMIT_ML"]) || 0,
        portionMode: map["PORTION_SIZE"] === "Small" ? "Small" : "Standard",
        surplusDonation: map["SURPLUS_DONATION_ENABLED"] === "true",
      });
    } catch (error) {
      console.error("Failed to load serving rules", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRules();
  }, []);

  // Real-time: re-fetch when manager changes portion size or surplus donation
  const handleSettingsUpdate = useCallback(() => {
    fetchRules();
  }, []);
  useRealtimeRefresh(["settings:updated"], handleSettingsUpdate);

  if (loading) return null;

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center gap-2 mb-4 text-gray-900 font-semibold">
        <Utensils size={20} className="text-orange-600" />
        <h3>Serving Rules</h3>
      </div>
      <div className="space-y-3">
        {/* Active Portion Mode */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-md shadow-sm text-gray-400">
              <UtensilsCrossed size={16} />
            </div>
            <span className="text-sm font-medium text-gray-700">
              Portion Mode
            </span>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              rules.portionMode === "Small"
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {rules.portionMode === "Small" ? "Small (-10%)" : "Standard"}
          </span>
        </div>

        {/* Surplus Donation Status */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-md shadow-sm text-gray-400">
              <Package size={16} />
            </div>
            <span className="text-sm font-medium text-gray-700">
              Surplus Donation
            </span>
          </div>
          <span
            className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              rules.surplusDonation
                ? "bg-green-100 text-green-700"
                : "bg-gray-200 text-gray-500"
            }`}
          >
            {rules.surplusDonation ? "Active" : "Off"}
          </span>
        </div>

        {/* Rice Portion Limit */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-md shadow-sm text-gray-400">
              <Scale size={16} />
            </div>
            <span className="text-sm font-medium text-gray-700">
              Rice Portion Limit
            </span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            {rules.riceLimit}{" "}
            <span className="text-xs font-normal text-gray-500">g</span>
          </span>
        </div>

        {/* Curry Portion Limit */}
        <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-md shadow-sm text-gray-400">
              <Scale size={16} />
            </div>
            <span className="text-sm font-medium text-gray-700">
              Curry Portion Limit
            </span>
          </div>
          <span className="text-lg font-bold text-gray-900">
            {rules.curryLimit}{" "}
            <span className="text-xs font-normal text-gray-500">ml</span>
          </span>
        </div>
      </div>
    </div>
  );
};

export default ServingRules;
