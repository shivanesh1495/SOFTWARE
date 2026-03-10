import React from "react";
import { Info, AlertCircle, Clock, Users } from "lucide-react";
import type { PublicSettings } from "../../services/system.service";

interface PoliciesDisplayProps {
  settings: PublicSettings | null;
  loading?: boolean;
}

export const PoliciesDisplay: React.FC<PoliciesDisplayProps> = ({
  settings,
  loading = false,
}) => {
  if (loading || !settings?.policies) {
    return null;
  }

  const p = settings.policies;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex gap-2 mb-3">
        <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
        <h3 className="font-semibold text-gray-900">Booking Policies</h3>
      </div>

      <div className="bg-white rounded p-3 space-y-2 text-sm text-gray-700">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-blue-500" />
          <span>
            <strong>Max bookings per day:</strong> {p.maxBookingsPerDay} slots
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          <span>
            <strong>Peak booking window:</strong> {p.peakBookingWindowMins} mins
            before slot time
          </span>
        </div>

        <div className="flex items-center gap-2">
          <AlertCircle size={16} className="text-orange-500" />
          <span>
            <strong>No-show penalty:</strong> {p.noShowPenaltyDays} days ban
            after no-show
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Clock size={16} className="text-blue-500" />
          <span>
            <strong>Token expiry:</strong> {p.tokenExpiryMins} mins after slot
            ends
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Info size={16} className="text-blue-500" />
          <span>
            <strong>Slot capacity:</strong> {p.maxCapacityPerSlot} students per
            slot
          </span>
        </div>
      </div>
    </div>
  );
};

export default PoliciesDisplay;
