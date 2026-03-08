import React from "react";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const NutrientsCheck: React.FC = () => {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate("/user/cart")}
      className="fixed bottom-20 right-4 flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-full shadow-lg hover:shadow-xl hover:bg-gray-50 transition-all z-40 animate-in zoom-in duration-300"
      aria-label="Nutrients Check"
      title="Nutrients Check"
    >
      <Sparkles size={18} className="text-purple-600" />
      <span className="text-sm font-semibold text-gray-800">
        Nutrients Check
      </span>
    </button>
  );
};
