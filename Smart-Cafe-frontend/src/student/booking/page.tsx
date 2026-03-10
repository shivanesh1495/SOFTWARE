import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import {
  Search,
  Leaf,
  AlertTriangle,
  Check,
  ShoppingBag,
  Plus,
  Minus,
  Sparkles,
  Loader2,
} from "lucide-react";
import { cn } from "../../utils/cn";
import { getMenuItems, type MenuItem } from "../../services/menu.service";
import {
  getNutritionForItems,
  type BestNutritionItem,
  type NutrientEstimate,
} from "../../services/nutrition.service";
import {
  getDietRecommendations,
  type DietRecommendation,
} from "../../services/ai.service";
import * as canteenService from "../../services/canteen.service";
import type { Canteen } from "../../services/canteen.service";
import { getPublicSettings } from "../../services/system.service";
import { useCart } from "../../store/cart.store";
import toast from "react-hot-toast";
import { getOperatingStatus } from "../../utils/serviceSchedule";
import { useRealtimeRefresh } from "../../hooks/useRealtimeRefresh";

// Frontend Interface
interface FrontendMenuItem {
  id: string;
  name: string;
  price: number;
  category: "Breakfast" | "Lunch" | "Snacks";
  type: "Veg" | "Non-Veg" | "Vegan";
  isJain: boolean;
  allergens: string[];
  ecoScore: number;
  imageColor: string;
  isVeg: boolean;
  isAvailable: boolean;
  availableQuantity: number;
}

const COLORS = [
  "bg-orange-100",
  "bg-gray-100",
  "bg-red-100",
  "bg-green-100",
  "bg-yellow-100",
  "bg-blue-100",
  "bg-purple-100",
];
const getColor = (name: string) => COLORS[name.charCodeAt(0) % COLORS.length];

const StudentBooking: React.FC = () => {
  const [searchParams] = useSearchParams();
  const queryCanteenId = searchParams.get("canteenId") || "";
  const [activeCanteenId, setActiveCanteenId] = useState(() => {
    return queryCanteenId || localStorage.getItem("selectedCanteenId") || "";
  });
  const {
    items: cartItems,
    addItem,
    removeItem,
    updateQuantity,
    getItemCount,
  } = useCart();

  const [activeCategory, setActiveCategory] = useState<
    "Breakfast" | "Lunch" | "Snacks"
  >("Lunch");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [menuItems, setMenuItems] = useState<FrontendMenuItem[]>([]);
  const [loadingFood, setLoadingFood] = useState(true);
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [canteensLoading, setCanteensLoading] = useState(true);
  const [serviceNotice, setServiceNotice] = useState("");
  const [isNutritionModalOpen, setIsNutritionModalOpen] = useState(false);
  const [selectedNutritionItemIds, setSelectedNutritionItemIds] = useState<
    string[]
  >([]);
  const [nutritionLoading, setNutritionLoading] = useState(false);
  const [nutritionError, setNutritionError] = useState("");
  const [nutritionValues, setNutritionValues] = useState<NutrientEstimate[]>(
    [],
  );
  const [nutritionNotice, setNutritionNotice] = useState("");
  const [nutritionSearchQuery, setNutritionSearchQuery] = useState("");
  const [bestNutritionItem, setBestNutritionItem] =
    useState<BestNutritionItem | null>(null);

  // Diet Check state
  const [isDietModalOpen, setIsDietModalOpen] = useState(false);
  const [selectedDiet, setSelectedDiet] = useState("");
  const [dietLoading, setDietLoading] = useState(false);
  const [dietRecommendations, setDietRecommendations] = useState<
    DietRecommendation[]
  >([]);
  const [dietSummary, setDietSummary] = useState("");
  const [dietError, setDietError] = useState("");

  // Fetch Menu on mount
  useEffect(() => {
    if (queryCanteenId) {
      localStorage.setItem("selectedCanteenId", queryCanteenId);
      setActiveCanteenId(queryCanteenId);
      return;
    }

    if (!activeCanteenId) {
      const stored = localStorage.getItem("selectedCanteenId") || "";
      if (stored) {
        setActiveCanteenId(stored);
      }
    }
  }, [queryCanteenId]);

  const fetchFood = useCallback(async () => {
    setLoadingFood(true);
    try {
      const backendItems: MenuItem[] = await getMenuItems(
        activeCanteenId ? { canteen: activeCanteenId } : undefined,
      );
      const mapped: FrontendMenuItem[] = backendItems.map((item) => {
        const availableQuantity = Number(item.availableQuantity ?? 100);
        return {
          id: item.id || item._id || "",
          name: item.itemName,
          price: item.price || 0,
          category: mapCategory(item.category),
          type: mapDietaryType(item.dietaryType),
          isJain: item.dietaryType === "Jain",
          isVeg: item.dietaryType !== "Non-Veg" && item.dietaryType !== "Egg",
          isAvailable: item.isAvailable !== false && availableQuantity > 0,
          availableQuantity,
          allergens: item.allergens || [],
          ecoScore: mapEcoScore(item.ecoScore),
          imageColor: getColor(item.itemName),
        };
      });
      setMenuItems(mapped);
    } catch (err) {
      console.error("Failed to fetch menu:", err);
    } finally {
      setLoadingFood(false);
    }
  }, [activeCanteenId]);

  useEffect(() => {
    fetchFood();
  }, [fetchFood]);

  useRealtimeRefresh(["menu:updated", "booking:updated"], () => {
    fetchFood();
  });

  useEffect(() => {
    loadCanteens();
    loadPublicSettings();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      loadPublicSettings();
    }, 30000);

    const handleFocus = () => {
      loadPublicSettings();
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const loadPublicSettings = async () => {
    try {
      const settings = await getPublicSettings();
      if (!settings.masterBookingEnabled) {
        setServiceNotice("System under maintenance.");
        return;
      }

      if (!settings.onlineBookingEnabled) {
        setServiceNotice("Online booking is currently disabled.");
        return;
      }

      const status = getOperatingStatus(settings.operatingSchedule);
      setServiceNotice(status.isOpen ? "" : status.reason || "");
    } catch (err) {
      console.error("Failed to load public settings:", err);
      setServiceNotice("");
    }
  };

  const loadCanteens = async () => {
    try {
      setCanteensLoading(true);
      const data = await canteenService.getCanteens({ isActive: true });
      setCanteens(data);
    } catch (err) {
      console.error("Failed to fetch canteens:", err);
    } finally {
      setCanteensLoading(false);
    }
  };

  const mapCategory = (cat: string): "Breakfast" | "Lunch" | "Snacks" => {
    const u = cat?.toUpperCase() || "";
    if (u === "BREAKFAST") return "Breakfast";
    if (u === "LUNCH" || u === "DINNER") return "Lunch";
    return "Snacks";
  };

  const mapDietaryType = (type: string): "Veg" | "Non-Veg" | "Vegan" => {
    if (type === "Vegan") return "Vegan";
    if (type === "Non-Veg" || type === "Egg") return "Non-Veg";
    return "Veg";
  };

  const mapEcoScore = (score?: string): number => {
    const map: Record<string, number> = { A: 95, B: 80, C: 60, D: 40, E: 20 };
    return map[score || "C"] || 60;
  };

  const toggleFilter = (filter: string) => {
    setActiveFilters((prev) =>
      prev.includes(filter)
        ? prev.filter((f) => f !== filter)
        : [...prev, filter],
    );
  };

  const getCartQty = (itemId: string) => {
    const c = cartItems.find((i) => i.id === itemId);
    return c ? c.quantity : 0;
  };

  const handleAdd = (item: FrontendMenuItem) => {
    if (!item.isAvailable || item.availableQuantity <= 0) {
      toast.error(`${item.name} is out of stock`);
      return;
    }

    addItem({
      id: item.id,
      name: item.name,
      price: item.price,
      imageColor: item.imageColor,
      isVeg: item.isVeg,
    });
    toast.success(`${item.name} added to cart`);
  };

  const handleIncrement = (item: FrontendMenuItem) => {
    const current = getCartQty(item.id);
    if (current >= item.availableQuantity) {
      toast.error(`Only ${item.availableQuantity} available for ${item.name}`);
      return;
    }
    updateQuantity(item.id, current + 1);
  };

  const handleDecrement = (item: FrontendMenuItem) => {
    const current = getCartQty(item.id);
    if (current <= 1) {
      removeItem(item.id);
    } else {
      updateQuantity(item.id, current - 1);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCategory = item.category === activeCategory;
    const matchesSearch = item.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesVeg = activeFilters.includes("Veg")
      ? item.type === "Veg" || item.type === "Vegan"
      : true;
    const matchesVegan = activeFilters.includes("Vegan")
      ? item.type === "Vegan"
      : true;
    const matchesJain = activeFilters.includes("Jain") ? item.isJain : true;
    const matchesNutFree = activeFilters.includes("No Nuts")
      ? !item.allergens.some((a) => a.toLowerCase().includes("nut"))
      : true;
    return (
      matchesCategory &&
      matchesSearch &&
      matchesVeg &&
      matchesVegan &&
      matchesJain &&
      matchesNutFree
    );
  });

  const availableItems = menuItems.filter(
    (item) => item.isAvailable && item.availableQuantity > 0,
  );

  const toggleNutritionItem = (itemId: string) => {
    setSelectedNutritionItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const openNutritionModal = () => {
    setNutritionError("");
    setNutritionNotice("");
    setNutritionSearchQuery("");
    setBestNutritionItem(null);
    setNutritionValues([]);
    setSelectedNutritionItemIds([]);
    setIsNutritionModalOpen(true);
  };

  const fetchNutritionValues = async () => {
    if (selectedNutritionItemIds.length === 0) {
      setNutritionError("Please choose at least one food item.");
      return;
    }

    const selectedNames = availableItems
      .filter((item) => selectedNutritionItemIds.includes(item.id))
      .map((item) => item.name);

    if (selectedNames.length === 0) {
      setNutritionError("Selected items are not available.");
      return;
    }

    try {
      setNutritionLoading(true);
      setNutritionError("");
      setNutritionNotice("");
      setBestNutritionItem(null);
      const response = await getNutritionForItems(selectedNames);
      setNutritionValues(response.items || []);
      if (response.bestItem) {
        setBestNutritionItem(response.bestItem);
      }
      if (response.fallback) {
        setNutritionNotice(
          response.note || "Showing approximate local nutrient estimates.",
        );
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        "Failed to fetch nutrient values. Please try again.";
      setNutritionError(message);
      toast.error(message);
    } finally {
      setNutritionLoading(false);
    }
  };

  const filteredNutritionItems = availableItems.filter((item) =>
    item.name.toLowerCase().includes(nutritionSearchQuery.toLowerCase()),
  );

  const itemCount = getItemCount();

  const DIET_OPTIONS = [
    { id: "high-protein", label: "High Protein", emoji: "💪" },
    { id: "low-carb", label: "Low Carb", emoji: "🥗" },
    { id: "vegan", label: "Vegan", emoji: "🌱" },
    { id: "vegetarian", label: "Vegetarian", emoji: "🥬" },
    { id: "keto", label: "Keto", emoji: "🥑" },
    { id: "balanced", label: "Balanced", emoji: "⚖️" },
    { id: "low-calorie", label: "Low Calorie", emoji: "🍃" },
    { id: "weight-gain", label: "Weight Gain", emoji: "📈" },
  ];

  const openDietModal = () => {
    setSelectedDiet("");
    setDietRecommendations([]);
    setDietSummary("");
    setDietError("");
    setIsDietModalOpen(true);
  };

  const fetchDietRecommendations = async () => {
    if (!selectedDiet) {
      setDietError("Please select a diet type.");
      return;
    }

    try {
      setDietLoading(true);
      setDietError("");
      setDietRecommendations([]);
      setDietSummary("");
      const result = await getDietRecommendations(selectedDiet);
      setDietRecommendations(result.recommendations || []);
      setDietSummary(result.summary || "");
    } catch (error: any) {
      const message =
        error?.message ||
        error?.response?.data?.message ||
        "Failed to get diet recommendations. Try again.";
      setDietError(message);
    } finally {
      setDietLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <section className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Food Menu</h1>
            <p className="text-sm text-gray-500">
              Browse and add items to your cart
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={openDietModal}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full bg-gray-100 hover:bg-green-50 hover:text-green-700 transition-colors text-sm font-medium"
              disabled={loadingFood || availableItems.length === 0}
            >
              <Sparkles size={16} />
              Diet Check
            </button>
            <button
              type="button"
              onClick={openNutritionModal}
              className="inline-flex items-center gap-1 px-3 py-2 rounded-full bg-gray-100 hover:bg-blue-50 hover:text-blue-600 transition-colors text-sm font-medium"
              disabled={loadingFood || availableItems.length === 0}
            >
              <Sparkles size={16} />
              Nutrient Check
            </button>
            <Link
              to="/user/cart"
              className="relative p-2 bg-gray-100 rounded-full hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              <ShoppingBag size={22} />
              {itemCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">
                  {itemCount > 9 ? "9+" : itemCount}
                </span>
              )}
            </Link>
          </div>
        </div>

        {serviceNotice && (
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-sm text-amber-800">
            {serviceNotice}
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600">Canteen</label>
          <select
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            value={activeCanteenId}
            onChange={(e) => {
              const value = e.target.value;
              setActiveCanteenId(value);
              if (value) {
                localStorage.setItem("selectedCanteenId", value);
              } else {
                localStorage.removeItem("selectedCanteenId");
              }
            }}
            disabled={canteensLoading}
          >
            <option value="">All Canteens</option>
            {canteens.map((canteen) => {
              const id = canteen.id || canteen._id || "";
              return (
                <option key={id} value={id}>
                  {canteen.name}
                </option>
              );
            })}
          </select>
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search food (e.g. Biryani)"
            className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Category Tabs */}
        <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto">
          {(["Breakfast", "Lunch", "Snacks"] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all whitespace-nowrap",
                activeCategory === cat
                  ? "bg-white shadow-sm text-gray-900"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {["Veg", "Vegan", "Jain", "No Nuts"].map((filter) => (
            <button
              key={filter}
              onClick={() => toggleFilter(filter)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors flex items-center gap-1 whitespace-nowrap",
                activeFilters.includes(filter)
                  ? "bg-blue-50 border-blue-200 text-blue-700"
                  : "bg-white border-gray-200 text-gray-600",
              )}
            >
              {activeFilters.includes(filter) && <Check size={12} />}
              {filter}
            </button>
          ))}
        </div>
      </section>

      {/* Menu Items */}
      <section>
        {loadingFood ? (
          <div className="text-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-400 text-sm">Loading menu...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map((item) => {
              const qty = getCartQty(item.id);
              const isOutOfStock =
                !item.isAvailable || item.availableQuantity <= 0;
              const atMaxInCart = qty >= item.availableQuantity;
              return (
                <div
                  key={item.id}
                  className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm flex gap-4"
                >
                  {/* Image */}
                  <Link
                    to={`/user/item/${item.id}`}
                    className={cn(
                      "w-24 h-24 rounded-xl flex-shrink-0 cursor-pointer hover:opacity-90 transition-opacity",
                      item.imageColor,
                    )}
                  />

                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <Link
                          to={`/user/item/${item.id}`}
                          className="font-bold text-gray-900 truncate hover:text-blue-600"
                        >
                          {item.name}
                        </Link>
                        <span
                          className={cn(
                            "w-4 h-4 border flex items-center justify-center flex-shrink-0",
                            item.type === "Non-Veg"
                              ? "border-red-500"
                              : "border-green-500",
                          )}
                        >
                          <span
                            className={cn(
                              "w-2 h-2 rounded-full",
                              item.type === "Non-Veg"
                                ? "bg-red-500"
                                : "bg-green-500",
                            )}
                          />
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span
                          className={cn(
                            "text-[10px] font-bold px-1.5 py-0.5 rounded",
                            isOutOfStock
                              ? "bg-red-50 text-red-700"
                              : "bg-blue-50 text-blue-700",
                          )}
                        >
                          {isOutOfStock
                            ? "Sold Out"
                            : `${item.availableQuantity} left`}
                        </span>
                        {item.ecoScore > 80 && (
                          <span className="text-[10px] font-bold bg-green-50 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                            <Leaf size={8} /> Eco
                          </span>
                        )}
                        {item.allergens.map((alg) => (
                          <span
                            key={alg}
                            className="text-[10px] font-bold bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded flex items-center gap-1"
                          >
                            <AlertTriangle size={8} /> {alg}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-end justify-between mt-3">
                      <p className="text-lg font-bold text-gray-900">
                        ₹{item.price}
                      </p>

                      {qty === 0 ? (
                        <Button
                          size="sm"
                          className="h-8 px-3 text-xs"
                          onClick={() => handleAdd(item)}
                          disabled={isOutOfStock || !!serviceNotice}
                        >
                          {isOutOfStock ? "Sold Out" : "Add"}
                        </Button>
                      ) : (
                        <div className="flex items-center gap-2 bg-blue-50 rounded-lg px-1">
                          <button
                            onClick={() => handleDecrement(item)}
                            className="p-1 text-blue-700 hover:bg-blue-100 rounded"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-sm font-bold text-blue-700 w-4 text-center">
                            {qty}
                          </span>
                          <button
                            onClick={() => handleIncrement(item)}
                            disabled={atMaxInCart || !!serviceNotice}
                            className="p-1 text-blue-700 hover:bg-blue-100 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {filteredItems.length === 0 && (
              <div className="col-span-full text-center py-10 text-gray-400">
                No items found matching your filters.
              </div>
            )}
          </div>
        )}
      </section>

      <Modal
        isOpen={isNutritionModalOpen}
        onClose={() => setIsNutritionModalOpen(false)}
        title="AI Nutrient Checker"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsNutritionModalOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={fetchNutritionValues}
              isLoading={nutritionLoading}
              disabled={availableItems.length === 0}
            >
              Get Nutrients
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Choose available food items to fetch estimated nutrient values using
            AI.
          </p>

          {availableItems.length === 0 ? (
            <div className="text-sm text-gray-500 bg-gray-50 border border-gray-100 rounded-lg p-3">
              No available items found in the current menu.
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  size={16}
                />
                <input
                  type="text"
                  value={nutritionSearchQuery}
                  onChange={(e) => setNutritionSearchQuery(e.target.value)}
                  placeholder="Search food item by name"
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="max-h-40 overflow-y-auto border border-gray-100 rounded-lg p-2 space-y-1">
                {filteredNutritionItems.map((item) => {
                  const checked = selectedNutritionItemIds.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleNutritionItem(item.id)}
                          className="accent-blue-600"
                        />
                        <span className="text-sm text-gray-800 truncate">
                          {item.name}
                        </span>
                      </div>
                      <span className="text-xs text-gray-500">
                        ₹{item.price}
                      </span>
                    </label>
                  );
                })}

                {filteredNutritionItems.length === 0 && (
                  <div className="text-sm text-gray-500 p-2">
                    No food items match this name.
                  </div>
                )}
              </div>
            </div>
          )}

          {bestNutritionItem && (
            <div className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="font-semibold">
                Best among selected: {bestNutritionItem.itemName}
              </p>
              <p className="mt-1">{bestNutritionItem.reason}</p>
            </div>
          )}

          {nutritionError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
              {nutritionError}
            </div>
          )}

          {nutritionNotice && (
            <div className="text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
              {nutritionNotice}
            </div>
          )}

          {nutritionValues.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {nutritionValues.map((entry, index) => (
                <div
                  key={`${entry.itemName}-${index}`}
                  className="border border-gray-100 rounded-lg p-3 bg-gray-50"
                >
                  <p className="text-sm font-semibold text-gray-900 mb-2">
                    {entry.itemName}
                  </p>
                  <div className="grid grid-cols-2 gap-1 text-xs text-gray-700">
                    <span>Calories: {entry.calories}</span>
                    <span>Protein: {entry.proteinGrams}g</span>
                    <span>Carbs: {entry.carbsGrams}g</span>
                    <span>Fat: {entry.fatGrams}g</span>
                    <span>Fiber: {entry.fiberGrams}g</span>
                    <span>Sugar: {entry.sugarGrams}g</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Diet Check Modal */}
      <Modal
        isOpen={isDietModalOpen}
        onClose={() => setIsDietModalOpen(false)}
        title="AI Diet Check"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsDietModalOpen(false)}
            >
              Close
            </Button>
            <Button
              onClick={fetchDietRecommendations}
              isLoading={dietLoading}
              disabled={!selectedDiet || dietLoading}
            >
              <Sparkles size={16} className="mr-1" />
              Get Recommendations
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Select your diet type and AI will recommend the best food from the
            menu for you.
          </p>

          {/* Diet Type Grid */}
          <div className="grid grid-cols-2 gap-2">
            {DIET_OPTIONS.map((diet) => (
              <button
                key={diet.id}
                onClick={() => {
                  setSelectedDiet(diet.id);
                  setDietError("");
                }}
                className={cn(
                  "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all text-left",
                  selectedDiet === diet.id
                    ? "bg-green-50 border-green-300 text-green-800 ring-2 ring-green-200"
                    : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50",
                )}
              >
                <span className="text-lg">{diet.emoji}</span>
                {diet.label}
              </button>
            ))}
          </div>

          {dietError && (
            <div className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg p-3">
              {dietError}
            </div>
          )}

          {dietSummary && (
            <div className="text-sm text-green-800 bg-green-50 border border-green-100 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Sparkles
                  size={16}
                  className="flex-shrink-0 mt-0.5 text-green-600"
                />
                <p>{dietSummary}</p>
              </div>
            </div>
          )}

          {dietRecommendations.length > 0 && (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {dietRecommendations.map((rec, index) => (
                <div
                  key={`${rec.id}-${index}`}
                  className="border border-gray-100 rounded-xl p-3 bg-gray-50 hover:bg-white transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      {rec.name}
                    </p>
                    {rec.calories_est > 0 && (
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium whitespace-nowrap">
                        ~{rec.calories_est} cal
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">{rec.reason}</p>
                </div>
              ))}
            </div>
          )}

          {dietLoading && (
            <div className="flex items-center justify-center py-4 gap-2 text-gray-500">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Finding best options for you...</span>
            </div>
          )}
        </div>
      </Modal>

      {/* Floating Cart Bar */}
      {itemCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-20 p-4 bg-white border-t border-gray-200 shadow-lg safe-area-bottom">
          <div className="max-w-2xl mx-auto">
            <Link
              to="/user/cart"
              className="flex items-center justify-between bg-blue-600 text-white rounded-xl px-5 py-3 hover:bg-blue-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <ShoppingBag size={20} />
                <span className="font-medium">
                  {itemCount} item{itemCount > 1 ? "s" : ""} in cart
                </span>
              </div>
              <span className="font-bold text-lg">View Cart →</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentBooking;
