import React from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../components/common/Button";
import {
  ArrowLeft,
  Trash2,
  ChevronRight,
  ShoppingBag,
  Minus,
  Plus,
  Sparkles,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { useCart } from "../../store/cart.store";
import Modal from "../../components/common/Modal";
import { getNutritionForItems } from "../../services/nutrition.service";
import type { NutritionResponse } from "../../services/nutrition.service";
import toast from "react-hot-toast";

const StudentCart: React.FC = () => {
  const navigate = useNavigate();
  const {
    items: cartItems,
    removeItem,
    updateQuantity,
    getTotal,
    getItemCount,
    clearCart,
  } = useCart();

  const totalPrice = getTotal();
  const totalItems = getItemCount();

  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [showNutritionModal, setShowNutritionModal] = React.useState(false);
  const [nutritionData, setNutritionData] =
    React.useState<NutritionResponse | null>(null);

  const handleAnalyzeNutrition = async () => {
    if (cartItems.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    try {
      setIsAnalyzing(true);
      const itemNames = cartItems.map((item) => item.name);
      const data = await getNutritionForItems(itemNames);
      setNutritionData(data);
      setShowNutritionModal(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to analyze nutrition");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const totalNutritionalInfo = React.useMemo(() => {
    if (!nutritionData) return null;

    let calories = 0;
    let protein = 0;
    let carbs = 0;
    let fat = 0;

    nutritionData.items.forEach((item) => {
      const cartItem = cartItems.find((ci) => ci.name === item.itemName);
      const qty = cartItem ? cartItem.quantity : 1;

      calories += item.calories * qty;
      protein += item.proteinGrams * qty;
      carbs += item.carbsGrams * qty;
      fat += item.fatGrams * qty;
    });

    return { calories, protein, carbs, fat };
  }, [nutritionData, cartItems]);

  return (
    <div className="pb-28 space-y-6">
      {/* Header */}
      <header className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={24} className="text-gray-900" />
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Your Cart</h1>
        {totalItems > 0 && (
          <span className="ml-auto bg-blue-100 text-blue-700 font-bold px-3 py-1 rounded-full text-xs">
            {totalItems} Item{totalItems > 1 ? "s" : ""}
          </span>
        )}
      </header>

      {/* Cart Items */}
      <section className="space-y-4">
        {cartItems.length > 0 ? (
          cartItems.map((item) => (
            <div
              key={item.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex gap-4"
            >
              {/* Image */}
              <div
                className={cn(
                  "w-20 h-20 rounded-xl flex-shrink-0",
                  item.imageColor || "bg-gray-100",
                )}
              />

              <div className="flex-1 min-w-0 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 truncate">
                      {item.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      ₹{item.price} each
                    </p>
                  </div>
                  <button
                    onClick={() => removeItem(item.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                <div className="flex items-center justify-between mt-2">
                  <p className="font-bold text-gray-900">
                    ₹{item.price * item.quantity}
                  </p>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-1">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="p-1.5 bg-white rounded-md shadow-sm text-gray-600 hover:text-gray-900"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="font-bold text-gray-900 w-5 text-center text-sm">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="p-1.5 bg-white rounded-md shadow-sm text-gray-600 hover:text-gray-900"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
              <ShoppingBag size={32} />
            </div>
            <h3 className="font-bold text-gray-900">Your cart is empty</h3>
            <p className="text-sm text-gray-500 mt-2 mb-6">
              Looks like you haven't added anything yet.
            </p>
            <Button onClick={() => navigate("/user/booking")}>
              Browse Menu
            </Button>
          </div>
        )}
      </section>

      {cartItems.length > 0 && (
        <>
          {/* Clear cart */}
          <div className="flex justify-end">
            <button
              onClick={clearCart}
              className="text-sm text-red-500 hover:text-red-700 font-medium px-3 py-1 hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear Cart
            </button>
          </div>

          {/* Order Summary */}
          <section className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="font-bold text-gray-900">Order Summary</h3>
            {cartItems.map((item) => (
              <div
                key={item.id}
                className="flex justify-between text-sm text-gray-600"
              >
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium">
                  ₹{item.price * item.quantity}
                </span>
              </div>
            ))}
            <div className="border-t border-gray-100 pt-3 flex justify-between font-bold text-gray-900">
              <span>Total</span>
              <span className="text-lg">₹{totalPrice}</span>
            </div>

            <div className="pt-2">
              <Button
                variant="secondary"
                className="w-full flex items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200"
                onClick={handleAnalyzeNutrition}
                isLoading={isAnalyzing}
              >
                {!isAnalyzing && (
                  <Sparkles size={18} className="text-purple-600" />
                )}
                <span>Analyze Meal with AI</span>
              </Button>
            </div>
          </section>

          {/* Footer Actions */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 shadow-lg safe-area-bottom z-10">
            <div className="max-w-md mx-auto space-y-3">
              <div className="flex justify-between items-center px-2">
                <span className="text-gray-500 text-sm">Total Amount</span>
                <span className="text-2xl font-bold text-gray-900">
                  ₹{totalPrice}
                </span>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => navigate("/user/booking")}
                >
                  Add More
                </Button>
                <Button
                  className="flex-[2] flex justify-center items-center gap-2"
                  onClick={() => navigate("/user/slots")}
                >
                  <span>Select Slot & Book</span>
                  <ChevronRight size={18} />
                </Button>
              </div>
            </div>
          </div>

          {/* AI Nutrition Modal */}
          <Modal
            isOpen={showNutritionModal}
            onClose={() => setShowNutritionModal(false)}
            title="AI Nutrition Analysis"
          >
            {nutritionData && totalNutritionalInfo ? (
              <div className="space-y-6">
                {/* Total Stats */}
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                    Total Estimated Cart Values
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-orange-50 p-4 rounded-xl text-center border border-orange-100">
                      <span className="block text-2xl font-black text-orange-600">
                        {totalNutritionalInfo.calories.toFixed(0)}
                      </span>
                      <span className="text-xs font-semibold text-orange-800 uppercase">
                        Calories
                      </span>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-xl text-center border border-blue-100">
                      <span className="block text-2xl font-black text-blue-600">
                        {totalNutritionalInfo.protein.toFixed(1)}g
                      </span>
                      <span className="text-xs font-semibold text-blue-800 uppercase">
                        Protein
                      </span>
                    </div>
                    <div className="bg-green-50 p-4 rounded-xl text-center border border-green-100">
                      <span className="block text-2xl font-black text-green-600">
                        {totalNutritionalInfo.carbs.toFixed(1)}g
                      </span>
                      <span className="text-xs font-semibold text-green-800 uppercase">
                        Carbs
                      </span>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-xl text-center border border-yellow-100">
                      <span className="block text-2xl font-black text-yellow-600">
                        {totalNutritionalInfo.fat.toFixed(1)}g
                      </span>
                      <span className="text-xs font-semibold text-yellow-800 uppercase">
                        Fat
                      </span>
                    </div>
                  </div>
                </div>

                {/* Best Item Suggestion */}
                {nutritionData.bestItem && (
                  <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles size={16} className="text-purple-600" />
                      <h4 className="font-bold text-purple-900">
                        Top Pick: {nutritionData.bestItem.itemName}
                      </h4>
                    </div>
                    <p className="text-sm text-purple-800 leading-relaxed">
                      {nutritionData.bestItem.reason}
                    </p>
                  </div>
                )}

                {/* Info Note */}
                <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 leading-snug">
                  {nutritionData.fallback
                    ? "🤖 " +
                      (nutritionData.note ||
                        "Showing approximate local values.")
                    : "✨ Values are AI-generated estimates and may vary from actual preparation."}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-500">
                Failed to load data.
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setShowNutritionModal(false)}>
                Got it
              </Button>
            </div>
          </Modal>
        </>
      )}
    </div>
  );
};

export default StudentCart;
