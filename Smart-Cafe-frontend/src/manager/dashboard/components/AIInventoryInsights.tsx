import React from "react";
import { AlertCircle } from "lucide-react";

export const AIInventoryInsights: React.FC = () => {
  // This feature has been disabled to conserve API credits
  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-2xl border border-amber-200 shadow-sm mb-6">
      <div className="flex items-center gap-2 mb-4">
        <AlertCircle size={20} className="text-amber-600" />
        <h2 className="text-lg font-bold text-amber-950">AI Stock Insights</h2>
      </div>
      <p className="text-sm text-amber-800">
        This feature is temporarily disabled to optimize system performance. Use
        the inventory management section for real-time stock updates.
      </p>
    </div>
  );
};
