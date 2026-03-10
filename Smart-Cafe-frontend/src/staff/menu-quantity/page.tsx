import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Loader2, Save, Search, Store } from "lucide-react";
import toast from "react-hot-toast";
import Button from "../../components/common/Button";
import * as menuService from "../../services/menu.service";
import * as canteenService from "../../services/canteen.service";
import type { MenuItem } from "../../services/menu.service";
import type { Canteen } from "../../services/canteen.service";
import { cn } from "../../utils/cn";
import { useRealtimeRefresh } from "../../hooks/useRealtimeRefresh";

const StaffMenuQuantity: React.FC = () => {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [canteenFilter, setCanteenFilter] = useState("All");
  const [quantityDrafts, setQuantityDrafts] = useState<Record<string, string>>(
    {},
  );
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [menuItems, canteenData] = await Promise.all([
        menuService.getMenuItems(),
        canteenService.getCanteens({ isActive: true }),
      ]);

      setItems(menuItems);
      setCanteens(canteenData);
      setQuantityDrafts((prev) => {
        const next = { ...prev };
        for (const item of menuItems) {
          const id = item.id || item._id || "";
          if (!id) continue;
          if (next[id] === undefined) {
            next[id] = String(item.availableQuantity ?? 100);
          }
        }
        return next;
      });
    } catch (error) {
      console.error("Failed to load menu quantities:", error);
      toast.error("Failed to load menu quantities");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useRealtimeRefresh(["menu:updated", "booking:updated"], () => {
    loadData();
  });

  const getItemCanteenIds = (item: MenuItem): string[] => {
    if (!Array.isArray(item.canteens)) return [];
    return item.canteens
      .map((canteen) => {
        if (typeof canteen === "string") return canteen;
        return canteen.id || canteen._id || "";
      })
      .filter(Boolean);
  };

  const getCanteenNames = (item: MenuItem): string[] => {
    if (!Array.isArray(item.canteens) || item.canteens.length === 0) return [];
    return item.canteens.map((canteen) => {
      if (typeof canteen !== "string") {
        return canteen.name || "Unknown";
      }
      const found = canteens.find(
        (entry) => (entry.id || entry._id) === canteen,
      );
      return found?.name || "Unknown";
    });
  };

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const name = (item.itemName || "").toLowerCase();
      const matchesSearch = name.includes(searchQuery.toLowerCase());

      if (canteenFilter === "All") return matchesSearch;

      const canteenIds = getItemCanteenIds(item);
      const matchesCanteen =
        canteenIds.length === 0 || canteenIds.includes(canteenFilter);
      return matchesSearch && matchesCanteen;
    });
  }, [items, searchQuery, canteenFilter]);

  const onQuantityChange = (itemId: string, value: string) => {
    if (!itemId) return;
    setQuantityDrafts((prev) => ({
      ...prev,
      [itemId]: value,
    }));
  };

  const saveQuantity = async (item: MenuItem) => {
    const itemId = item.id || item._id || "";
    if (!itemId) return;

    const parsedQuantity = Number(quantityDrafts[itemId]);
    if (!Number.isFinite(parsedQuantity) || parsedQuantity < 0) {
      toast.error("Quantity must be 0 or greater");
      return;
    }

    try {
      setSavingId(itemId);
      const updated = await menuService.updateMenuItemQuantity(
        itemId,
        Math.floor(parsedQuantity),
      );

      setItems((prev) =>
        prev.map((entry) => {
          const id = entry.id || entry._id;
          return id === itemId ? { ...entry, ...updated } : entry;
        }),
      );
      setQuantityDrafts((prev) => ({
        ...prev,
        [itemId]: String(updated.availableQuantity || 0),
      }));
      toast.success(`${updated.itemName} quantity updated`);
    } catch (error: any) {
      console.error("Failed to update quantity:", error);
      toast.error(
        error?.response?.data?.message || "Failed to update quantity",
      );
    } finally {
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        <Loader2 className="animate-spin mr-2" size={20} />
        Loading menu quantities...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Food Quantity Control
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Adjust live dish quantities. Changes immediately affect student
          ordering.
        </p>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-3">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={16}
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search food item"
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <select
          value={canteenFilter}
          onChange={(e) => setCanteenFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="All">All Canteens</option>
          {canteens.map((canteen) => (
            <option
              key={canteen.id || canteen._id}
              value={canteen.id || canteen._id}
            >
              {canteen.name}
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Item</th>
              <th className="px-4 py-3 text-left font-medium">Canteens</th>
              <th className="px-4 py-3 text-left font-medium">Current</th>
              <th className="px-4 py-3 text-left font-medium">New Quantity</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredItems.map((item) => {
              const itemId = item.id || item._id || "";
              const canteenNames = getCanteenNames(item);
              const currentQty = Number(item.availableQuantity ?? 100);
              const draftValue = quantityDrafts[itemId] ?? String(currentQty);
              const isDirty = Number(draftValue) !== currentQty;

              return (
                <tr key={itemId} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{item.itemName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      ₹{item.price || 0}
                    </p>
                  </td>

                  <td className="px-4 py-3">
                    {canteenNames.length === 0 ? (
                      <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                        All Canteens
                      </span>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {canteenNames.map((name, index) => (
                          <span
                            key={`${itemId}-${index}`}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            <Store size={10} />
                            {name}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "px-2 py-1 rounded text-xs font-semibold border",
                        currentQty > 10
                          ? "bg-green-50 text-green-700 border-green-200"
                          : currentQty > 0
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-red-50 text-red-700 border-red-200",
                      )}
                    >
                      {currentQty}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <input
                      type="number"
                      min={0}
                      value={draftValue}
                      onChange={(e) => onQuantityChange(itemId, e.target.value)}
                      className="w-28 px-2 py-1.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </td>

                  <td className="px-4 py-3 text-right">
                    <Button
                      size="sm"
                      disabled={!isDirty || savingId === itemId}
                      isLoading={savingId === itemId}
                      onClick={() => saveQuantity(item)}
                    >
                      <Save size={14} className="mr-1" />
                      Save
                    </Button>
                  </td>
                </tr>
              );
            })}

            {filteredItems.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                  No food items found for this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StaffMenuQuantity;
