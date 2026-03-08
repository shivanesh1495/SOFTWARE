import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Leaf,
  CheckCircle,
  X,
  Users,
  MapPin,
} from "lucide-react";
import Button from "../../components/common/Button";
import { cn } from "../../utils/cn";
import * as canteenService from "../../services/canteen.service";
import type {
  Canteen,
  CanteenConfig,
  CanteenFieldConfig,
  CanteenTableColumn,
} from "../../services/canteen.service";
import toast from "react-hot-toast";

// ─── Helper: resolve a dot-path from an object ───
const getNestedValue = (
  obj: Record<string, unknown>,
  path: string,
): unknown => {
  return path
    .split(".")
    .reduce(
      (acc: unknown, key) => (acc as Record<string, unknown>)?.[key],
      obj,
    );
};

const setNestedValue = (
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> => {
  const keys = path.split(".");
  const clone = { ...obj };
  if (keys.length === 1) {
    clone[keys[0]] = value;
    return clone;
  }
  const parent = { ...((clone[keys[0]] as Record<string, unknown>) || {}) };
  parent[keys[1]] = value;
  clone[keys[0]] = parent;
  return clone;
};

// ─── Helper: dynamic style mappings ───
const getCrowdColor = (level: string) => {
  switch (level) {
    case "Low":
      return "text-green-600 bg-green-50 border-green-200";
    case "Medium":
      return "text-amber-600 bg-amber-50 border-amber-200";
    case "High":
      return "text-red-600 bg-red-50 border-red-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "Open":
      return "bg-green-100 text-green-700";
    case "Closed":
      return "bg-gray-100 text-gray-500";
    case "Closing Soon":
      return "bg-amber-100 text-amber-700";
    default:
      return "bg-gray-100 text-gray-500";
  }
};

const getEcoScoreColor = (score: string) => {
  switch (score) {
    case "A":
      return "text-green-600";
    case "B":
      return "text-lime-500";
    case "C":
      return "text-yellow-500";
    default:
      return "text-red-500";
  }
};

// ─── Dynamic table cell renderer ───
const DynamicCell: React.FC<{
  column: CanteenTableColumn;
  canteen: Canteen;
  onToggle: (id: string) => void;
}> = ({ column, canteen, onToggle }) => {
  const value = getNestedValue(
    canteen as unknown as Record<string, unknown>,
    column.key,
  );

  switch (column.type) {
    case "avatar-text":
      return (
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-gray-600",
                canteen.imageColor || "bg-orange-100",
              )}
            >
              {canteen.name?.[0] || "?"}
            </div>
            <div>
              <div className="font-medium text-gray-900">{canteen.name}</div>
              {canteen.description && (
                <div className="text-xs text-gray-400 truncate max-w-[200px]">
                  {canteen.description}
                </div>
              )}
            </div>
          </div>
        </td>
      );
    case "icon-text":
      return (
        <td className="px-6 py-4">
          <div className="flex items-center gap-1 text-gray-600">
            {column.icon === "MapPin" && <MapPin size={14} />}
            <span>{(value as string) || "N/A"}</span>
          </div>
        </td>
      );
    case "badge":
      return (
        <td className="px-6 py-4">
          <span
            className={cn(
              "px-2 py-1 rounded-full text-xs font-semibold",
              getStatusColor(value as string),
            )}
          >
            {value as string}
          </span>
        </td>
      );
    case "crowd-badge":
      return (
        <td className="px-6 py-4">
          <span
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border",
              getCrowdColor(value as string),
            )}
          >
            <Users size={12} />
            {value as string}
          </span>
        </td>
      );
    case "occupancy":
      return (
        <td className="px-6 py-4">
          <div className="text-sm">
            <span className="font-medium">{canteen.occupancy}</span>
            <span className="text-gray-400"> / {canteen.capacity}</span>
          </div>
        </td>
      );
    case "eco-score":
      return (
        <td className="px-6 py-4">
          <div className="flex items-center gap-1">
            <Leaf size={14} className={getEcoScoreColor(value as string)} />
            <span className="font-bold">{value as string}</span>
          </div>
        </td>
      );
    case "toggle":
      return (
        <td className="px-6 py-4">
          <button
            onClick={() => onToggle(canteen.id)}
            className="focus:outline-none"
          >
            {canteen.isActive ? (
              <span className="flex items-center text-green-600 text-xs font-medium bg-green-50 px-2 py-1 rounded-full">
                <CheckCircle size={12} className="mr-1" /> Active
              </span>
            ) : (
              <span className="flex items-center text-gray-400 text-xs font-medium bg-gray-100 px-2 py-1 rounded-full">
                <X size={12} className="mr-1" /> Inactive
              </span>
            )}
          </button>
        </td>
      );
    default:
      return <td className="px-6 py-4">{String(value ?? "")}</td>;
  }
};

// ─── Dynamic form field renderer ───
const DynamicField: React.FC<{
  field: CanteenFieldConfig;
  formData: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  config: CanteenConfig;
}> = ({ field, formData, onChange, config }) => {
  const value = getNestedValue(formData, field.key);
  const inputClass = cn(
    "w-full px-3 py-2 border rounded-lg",
    field.autoComputed && "bg-gray-50 text-gray-500 cursor-not-allowed",
  );
  const isDisabled = !!field.autoComputed;

  switch (field.type) {
    case "text":
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.autoComputed && (
              <span className="text-xs text-gray-400 ml-1">(auto)</span>
            )}
          </label>
          <input
            required={field.required}
            disabled={isDisabled}
            type="text"
            maxLength={field.maxLength}
            className={inputClass}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        </div>
      );
    case "textarea":
      return (
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
          </label>
          <textarea
            maxLength={field.maxLength}
            className={inputClass}
            rows={2}
            value={(value as string) ?? ""}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        </div>
      );
    case "number":
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.autoComputed && (
              <span className="text-xs text-gray-400 ml-1">(auto)</span>
            )}
          </label>
          <input
            required={field.required}
            disabled={isDisabled}
            type="number"
            min={field.min}
            className={inputClass}
            value={(value as number) ?? field.default ?? 0}
            onChange={(e) => onChange(field.key, Number(e.target.value))}
          />
        </div>
      );
    case "select":
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
            {field.autoComputed && (
              <span className="text-xs text-gray-400 ml-1">(auto)</span>
            )}
          </label>
          <select
            disabled={isDisabled}
            className={inputClass}
            value={(value as string) ?? field.default ?? ""}
            onChange={(e) => onChange(field.key, e.target.value)}
          >
            {(field.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    case "color-select":
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
          </label>
          <select
            className={inputClass}
            value={(value as string) ?? field.default ?? ""}
            onChange={(e) => onChange(field.key, e.target.value)}
          >
            {config.colorOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      );
    case "time":
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {field.label}
          </label>
          <input
            type="time"
            className={inputClass}
            value={(value as string) ?? field.default ?? ""}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        </div>
      );
    default:
      return null;
  }
};

// ─── Main Component ───
const AdminCanteens: React.FC = () => {
  const [canteens, setCanteens] = useState<Canteen[]>([]);
  const [config, setConfig] = useState<CanteenConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCanteen, setEditingCanteen] = useState<Canteen | null>(null);
  const [formData, setFormData] = useState<Record<string, unknown>>({});

  // Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    loadInitialData();
  }, []);

  // Load config once + canteens on initial mount
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [canteenData, configData] = await Promise.all([
        canteenService.getCanteens(),
        canteenService.getCanteenConfig(),
      ]);
      setCanteens(canteenData);
      setConfig(configData);
    } catch (error) {
      toast.error("Failed to load canteen data");
    } finally {
      setLoading(false);
    }
  };

  // Refresh only canteens (no loading spinner, no config re-fetch)
  const refreshCanteens = async () => {
    try {
      const data = await canteenService.getCanteens();
      setCanteens(data);
    } catch (error) {
      toast.error("Failed to refresh canteens");
    }
  };

  // Build default form data from config fields
  const buildDefaultFormData = (): Record<string, unknown> => {
    if (!config) return {};
    const defaults: Record<string, unknown> = {
      isActive: true,
      operatingHours: { open: "08:00", close: "20:00" },
    };
    config.fields.forEach((field) => {
      const keys = field.key.split(".");
      if (keys.length === 1) {
        defaults[keys[0]] = field.default ?? (field.type === "number" ? 0 : "");
      } else {
        if (!defaults[keys[0]]) defaults[keys[0]] = {};
        (defaults[keys[0]] as Record<string, unknown>)[keys[1]] =
          field.default ?? "";
      }
    });
    return defaults;
  };

  const resetForm = () => setFormData(buildDefaultFormData());

  const filteredCanteens = canteens.filter((canteen) => {
    const matchesSearch =
      canteen.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      canteen.location?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === "All" || canteen.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (canteen: Canteen) => {
    setEditingCanteen(canteen);
    setFormData({
      name: canteen.name,
      location: canteen.location || "",
      status: canteen.status,
      crowd: canteen.crowd,
      capacity: canteen.capacity,
      occupancy: canteen.occupancy,
      ecoScore: canteen.ecoScore,
      isActive: canteen.isActive,
      imageColor: canteen.imageColor || "bg-orange-100",
      description: canteen.description || "",
      operatingHours: canteen.operatingHours || {
        open: "08:00",
        close: "20:00",
      },
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this canteen?")) {
      try {
        await canteenService.deleteCanteen(id);
        toast.success("Canteen deleted");
        await refreshCanteens();
      } catch {
        toast.error("Failed to delete canteen");
      }
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await canteenService.toggleCanteenStatus(id);
      await refreshCanteens();
    } catch {
      toast.error("Failed to toggle status");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCanteen) {
        await canteenService.updateCanteen(
          editingCanteen.id,
          formData as Partial<Canteen>,
        );
        toast.success("Canteen updated");
      } else {
        await canteenService.createCanteen(formData as Partial<Canteen>);
        toast.success("Canteen created");
      }
      setIsModalOpen(false);
      setEditingCanteen(null);
      resetForm();
      await refreshCanteens();
    } catch {
      toast.error("Failed to save canteen");
    }
  };

  const handleFieldChange = (key: string, value: unknown) => {
    setFormData((prev) => setNestedValue(prev, key, value));
  };

  if (loading || !config) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const { tableColumns, fields, statuses } = config;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Canteen Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage canteens, capacity, status, and eco-scores.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCanteen(null);
            resetForm();
            setIsModalOpen(true);
          }}
        >
          <Plus size={16} className="mr-2" />
          Add Canteen
        </Button>
      </div>

      {/* Search & Filters — status options are dynamic */}
      <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            type="text"
            placeholder="Search canteens..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="All">All Status</option>
            {statuses.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Dynamic Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
            <tr>
              {tableColumns.map((col) => (
                <th key={col.key} className="px-6 py-3 font-medium">
                  {col.label}
                </th>
              ))}
              <th className="px-6 py-3 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredCanteens.length === 0 ? (
              <tr>
                <td
                  colSpan={tableColumns.length + 1}
                  className="px-6 py-8 text-center text-gray-500"
                >
                  No canteens found. Add your first canteen!
                </td>
              </tr>
            ) : (
              filteredCanteens.map((canteen) => (
                <tr key={canteen.id} className="hover:bg-gray-50">
                  {tableColumns.map((col) => (
                    <DynamicCell
                      key={col.key}
                      column={col}
                      canteen={canteen}
                      onToggle={handleToggleActive}
                    />
                  ))}
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleEdit(canteen)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(canteen.id)}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Dynamic Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-900">
                {editingCanteen ? "Edit Canteen" : "New Canteen"}
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
              {fields.map((field) => (
                <DynamicField
                  key={field.key}
                  field={field}
                  formData={formData}
                  onChange={handleFieldChange}
                  config={config}
                />
              ))}

              <div className="col-span-2 pt-4 flex justify-end gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setIsModalOpen(false)}
                  type="button"
                >
                  Cancel
                </Button>
                <Button type="submit">Save Canteen</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCanteens;
