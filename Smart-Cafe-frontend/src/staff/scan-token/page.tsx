import React, { useState, useEffect } from "react";
import Button from "../../components/common/Button";
import Modal from "../../components/common/Modal";
import {
  Camera,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Loader2,
  Shuffle,
  Plus,
  Trash2,
} from "lucide-react";
import * as bookingService from "../../services/booking.service";
import type { Booking } from "../../services/booking.service";
import * as menuService from "../../services/menu.service";
import type { MenuItem } from "../../services/menu.service";
import toast from "react-hot-toast";
import {
  decodeTokenPayload,
  type TokenPayload,
} from "../../utils/tokenPayload";
import { getPublicSettings } from "../../services/system.service";

interface EditableBookingItem {
  menuItemId: string;
  quantity: number;
  portionSize: "Regular" | "Small";
}

const StaffScanToken: React.FC = () => {
  const [tokenInput, setTokenInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [scanResult, setScanResult] = useState<
    "success" | "invalid" | "expired" | null
  >(null);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [payload, setPayload] = useState<TokenPayload | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [onlineBookingEnabled, setOnlineBookingEnabled] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editableItems, setEditableItems] = useState<EditableBookingItem[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loadingMenuItems, setLoadingMenuItems] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const settings = await getPublicSettings();
      setOnlineBookingEnabled(settings.onlineBookingEnabled);
    } catch (error) {
      console.error("Failed to load settings:", error);
    }
  };

  const handleLookup = async () => {
    if (!tokenInput.trim()) return;
    const decoded = decodeTokenPayload(tokenInput.trim());
    if (decoded) {
      setScanResult("success");
      setBooking(null);
      setPayload(decoded);
      return;
    }
    try {
      setLookingUp(true);
      setScanResult(null);
      setBooking(null);
      setPayload(null);
      const result = await bookingService.getBookingByToken(tokenInput.trim());
      setBooking(result);
      if (result.status === "confirmed" || result.status === "pending") {
        setScanResult("success");
      } else if (
        result.status === "completed" ||
        result.status === "cancelled"
      ) {
        setScanResult("expired");
      } else {
        setScanResult("invalid");
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || "";
      if (String(message).toLowerCase().includes("expired")) {
        setScanResult("expired");
      } else {
        setScanResult("invalid");
      }
      setBooking(null);
      setPayload(null);
    } finally {
      setLookingUp(false);
    }
  };

  const handleConfirmEntry = async () => {
    const bookingId = booking?.id || payload?.bookingId;
    if (!bookingId) {
      toast.error("Missing booking ID for confirmation");
      return;
    }
    try {
      setConfirming(true);
      await bookingService.completeBooking(bookingId);
      toast.success(
        `Token ${booking?.tokenNumber || payload?.tokenNumber} entry confirmed!`,
      );
      setScanResult(null);
      setBooking(null);
      setPayload(null);
      setTokenInput("");
    } catch (error) {
      console.error("Failed to confirm entry:", error);
      toast.error("Failed to confirm entry");
    } finally {
      setConfirming(false);
    }
  };

  const simulateCameraScan = () => {
    setScanning(true);
    setScanResult(null);
    setBooking(null);
    setPayload(null);
    // Camera scan would set tokenInput and trigger lookup
    // For now, simulate a delay then prompt manual entry
    setTimeout(() => {
      setScanning(false);
      toast("Camera scan not available. Please enter token manually.", {
        icon: "📷",
      });
    }, 2000);
  };

  const getMenuItemId = (entry: any): string => {
    if (!entry) return "";
    if (typeof entry === "string") return entry;
    return entry.id || entry._id || "";
  };

  const getMenuItemPrice = (
    menuItemId: string,
    portionSize: "Regular" | "Small",
  ) => {
    const menuItem = menuItems.find(
      (entry) => (entry.id || entry._id) === menuItemId,
    );
    if (!menuItem) return 0;

    const basePrice = Number(menuItem.price || 0);
    return portionSize === "Small" ? Math.round(basePrice * 0.8) : basePrice;
  };

  const existingTotal = Number(booking?.totalAmount || 0);
  const newTotal = editableItems.reduce((sum, item) => {
    const price = getMenuItemPrice(item.menuItemId, item.portionSize);
    return sum + price * item.quantity;
  }, 0);
  const isSameTotal = newTotal === existingTotal;

  const openEditModal = async () => {
    if (!booking) return;

    const mappedItems: EditableBookingItem[] = (booking.items || []).map(
      (item: any) => ({
        menuItemId: getMenuItemId(item.menuItem),
        quantity: Math.max(1, Number(item.quantity) || 1),
        portionSize: item.portionSize === "Small" ? "Small" : "Regular",
      }),
    );

    setEditableItems(mappedItems.length > 0 ? mappedItems : []);
    setIsEditModalOpen(true);

    try {
      setLoadingMenuItems(true);
      const items = await menuService.getMenuItems();
      setMenuItems(items);
    } catch (error) {
      console.error("Failed to load menu items for replacement:", error);
      toast.error("Failed to load available dishes");
    } finally {
      setLoadingMenuItems(false);
    }
  };

  const addEditableRow = () => {
    const firstMenuItemId = menuItems[0]?.id || menuItems[0]?._id || "";
    if (!firstMenuItemId) return;

    setEditableItems((prev) => [
      ...prev,
      {
        menuItemId: firstMenuItemId,
        quantity: 1,
        portionSize: "Regular",
      },
    ]);
  };

  const updateEditableRow = (
    index: number,
    patch: Partial<EditableBookingItem>,
  ) => {
    setEditableItems((prev) =>
      prev.map((entry, idx) =>
        idx === index ? { ...entry, ...patch } : entry,
      ),
    );
  };

  const removeEditableRow = (index: number) => {
    setEditableItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const submitReplacement = async () => {
    if (!booking?.id) return;
    if (editableItems.length === 0) {
      toast.error("Add at least one dish");
      return;
    }

    if (!isSameTotal) {
      toast.error("Replacement total must match original total");
      return;
    }

    try {
      setSavingEdit(true);
      const updated = await bookingService.replaceBookingItems(booking.id, {
        items: editableItems,
        enforceSameTotal: true,
      });
      setBooking(updated);
      setIsEditModalOpen(false);
      toast.success("Order items updated");
    } catch (error: any) {
      console.error("Failed to replace booking items:", error);
      toast.error(error?.response?.data?.message || "Failed to update order");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Scan Token</h1>
        <p className="text-sm text-gray-500 mt-1">
          Validate student booking tokens.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Scanner Section */}
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 flex flex-col items-center justify-center min-h-[400px]">
          {scanning ? (
            <div className="relative w-full max-w-sm aspect-square bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
              <div className="text-white/80 text-sm">Scanning...</div>
              <div className="absolute inset-0 border-2 border-transparent">
                <div className="absolute inset-8 border-2 border-green-400/80 rounded-lg animate-pulse shadow-[0_0_15px_rgba(74,222,128,0.5)]" />
                <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-red-500/80 animate-[ping_1.5s_cubic-bezier(0,0,0.2,1)_infinite]" />
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6 w-full">
              <div className="bg-blue-50 p-6 rounded-full inline-flex mx-auto">
                <Camera size={48} className="text-blue-600" />
              </div>
              <div>
                <p className="text-gray-900 font-medium text-lg">
                  Token Verification
                </p>
                <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
                  {onlineBookingEnabled
                    ? "Enter the token number or scan the QR code."
                    : "Online booking is currently disabled. Scanning unavailable."}
                </p>
              </div>
              {/* Manual token input */}
              <div className="flex gap-2 max-w-sm mx-auto">
                <input
                  type="text"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                  placeholder="Enter token number..."
                  disabled={!onlineBookingEnabled}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand outline-none font-mono uppercase disabled:bg-gray-100 disabled:text-gray-400"
                />
                <Button
                  onClick={handleLookup}
                  disabled={
                    !tokenInput.trim() || lookingUp || !onlineBookingEnabled
                  }
                  isLoading={lookingUp}
                >
                  Verify
                </Button>
              </div>
              <Button
                size="lg"
                variant="secondary"
                onClick={simulateCameraScan}
                disabled={!onlineBookingEnabled}
              >
                Use Camera
              </Button>
            </div>
          )}
          {scanning && (
            <Button
              variant="secondary"
              className="mt-6"
              onClick={() => setScanning(false)}
            >
              Cancel
            </Button>
          )}
        </div>

        {/* Result Section */}
        <div className="space-y-6">
          {lookingUp && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              <Loader2 className="animate-spin mr-2" size={24} />
              <span>Verifying token...</span>
            </div>
          )}

          {scanResult === "success" && booking && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="text-green-600" size={32} />
                <div>
                  <h3 className="text-lg font-bold text-green-900">
                    Valid Token
                  </h3>
                  <p className="text-green-700 text-sm">Entry Authorized</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-green-100 space-y-3">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500 text-sm">Token ID</span>
                  <span className="font-mono font-bold text-gray-900">
                    {booking.tokenNumber}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm flex items-center gap-1">
                    <User size={14} /> Student
                  </span>
                  <span className="font-medium text-gray-900">
                    {(booking as any).user?.name ||
                      (booking as any).guestName ||
                      "Student"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm flex items-center gap-1">
                    <Clock size={14} /> Slot Time
                  </span>
                  <span className="font-medium text-blue-600">
                    {booking.slot?.startTime && booking.slot?.endTime
                      ? `${booking.slot.startTime} - ${booking.slot.endTime}`
                      : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Status</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {booking.status}
                  </span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  variant="secondary"
                  onClick={openEditModal}
                  className="w-full"
                >
                  <Shuffle size={16} className="mr-2" />
                  Replace Dish (Same Total)
                </Button>
                <Button
                  className="w-full bg-green-600 hover:bg-green-700 text-white border-transparent"
                  onClick={handleConfirmEntry}
                  isLoading={confirming}
                >
                  Confirm Entry & Complete
                </Button>
              </div>
            </div>
          )}

          {scanResult === "success" && payload && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="text-green-600" size={32} />
                <div>
                  <h3 className="text-lg font-bold text-green-900">
                    Valid Token
                  </h3>
                  <p className="text-green-700 text-sm">Entry Authorized</p>
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 border border-green-100 space-y-3">
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-500 text-sm">Token ID</span>
                  <span className="font-mono font-bold text-gray-900">
                    {payload.tokenNumber || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm flex items-center gap-1">
                    <User size={14} /> Student
                  </span>
                  <span className="font-medium text-gray-900">Student</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm flex items-center gap-1">
                    <Clock size={14} /> Slot Time
                  </span>
                  <span className="font-medium text-blue-600">
                    {payload.slotTime || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-500 text-sm">Status</span>
                  <span className="font-medium text-gray-900 capitalize">
                    {payload.status || "confirmed"}
                  </span>
                </div>
              </div>

              <Button
                className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white border-transparent"
                onClick={handleConfirmEntry}
                isLoading={confirming}
              >
                Confirm Entry & Complete
              </Button>
            </div>
          )}

          {scanResult === "expired" && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="text-red-600" size={32} />
                <div>
                  <h3 className="text-lg font-bold text-red-900">
                    Token Expired / Used
                  </h3>
                  <p className="text-red-700 text-sm">
                    Cannot process this token
                  </p>
                </div>
              </div>
              <p className="text-red-800 mb-4">
                This token has already been used or the booking was cancelled.
                {booking && (
                  <span className="block mt-1 text-sm">
                    Status:{" "}
                    <strong className="capitalize">{booking.status}</strong>
                  </span>
                )}
              </p>
              <Button
                variant="danger"
                className="w-full mt-4"
                onClick={() => {
                  setScanResult(null);
                  setBooking(null);
                  setTokenInput("");
                }}
              >
                Dismiss
              </Button>
            </div>
          )}

          {scanResult === "invalid" && !lookingUp && (
            <div className="bg-red-50 border border-red-100 rounded-xl p-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center gap-3 mb-4">
                <XCircle className="text-red-600" size={32} />
                <div>
                  <h3 className="text-lg font-bold text-red-900">
                    Token Not Found
                  </h3>
                  <p className="text-red-700 text-sm">
                    No booking matches this token
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={() => {
                  setScanResult(null);
                  setBooking(null);
                  setTokenInput("");
                }}
              >
                Try Again
              </Button>
            </div>
          )}

          {!scanResult && !scanning && !lookingUp && (
            <div className="h-full flex items-center justify-center border-2 border-dashed border-gray-200 rounded-xl text-gray-400 p-8 text-center">
              <div className="max-w-xs">
                <p>Scan result details will appear here.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Replace Order Items"
        footer={
          <div className="flex gap-3 justify-end">
            <Button
              variant="secondary"
              onClick={() => setIsEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={submitReplacement}
              isLoading={savingEdit}
              disabled={
                loadingMenuItems || editableItems.length === 0 || !isSameTotal
              }
            >
              Save Replacement
            </Button>
          </div>
        }
      >
        {loadingMenuItems ? (
          <div className="flex items-center justify-center py-8 text-gray-500">
            <Loader2 className="animate-spin mr-2" size={18} />
            Loading available dishes...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-sm text-blue-800">
              Replacement is allowed only when total amount is unchanged.
            </div>

            <div className="space-y-3">
              {editableItems.map((item, index) => {
                const linePrice = getMenuItemPrice(
                  item.menuItemId,
                  item.portionSize,
                );
                return (
                  <div
                    key={`edit-item-${index}`}
                    className="grid grid-cols-12 gap-2 items-center"
                  >
                    <select
                      value={item.menuItemId}
                      onChange={(e) =>
                        updateEditableRow(index, {
                          menuItemId: e.target.value,
                        })
                      }
                      className="col-span-5 border border-gray-200 rounded-lg px-2 py-2 text-sm"
                    >
                      {menuItems.map((menuItem) => {
                        const id = menuItem.id || menuItem._id || "";
                        return (
                          <option key={id} value={id}>
                            {menuItem.itemName} (₹{menuItem.price || 0})
                          </option>
                        );
                      })}
                    </select>

                    <input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        updateEditableRow(index, {
                          quantity: Math.max(1, Number(e.target.value) || 1),
                        })
                      }
                      className="col-span-2 border border-gray-200 rounded-lg px-2 py-2 text-sm"
                    />

                    <select
                      value={item.portionSize}
                      onChange={(e) =>
                        updateEditableRow(index, {
                          portionSize:
                            e.target.value === "Small" ? "Small" : "Regular",
                        })
                      }
                      className="col-span-3 border border-gray-200 rounded-lg px-2 py-2 text-sm"
                    >
                      <option value="Regular">Regular</option>
                      <option value="Small">Small</option>
                    </select>

                    <button
                      type="button"
                      onClick={() => removeEditableRow(index)}
                      className="col-span-2 inline-flex items-center justify-center p-2 rounded-lg text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={16} />
                    </button>

                    <p className="col-span-12 text-xs text-gray-500">
                      Line Total: ₹{linePrice * item.quantity}
                    </p>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addEditableRow}
              className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
            >
              <Plus size={14} /> Add Dish
            </button>

            <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Existing Total</span>
                <span className="font-semibold">₹{existingTotal}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">New Total</span>
                <span className="font-semibold">₹{newTotal}</span>
              </div>
              <div
                className={
                  isSameTotal
                    ? "text-green-700 text-xs"
                    : "text-red-700 text-xs"
                }
              >
                {isSameTotal
                  ? "Total matches. You can save replacement."
                  : "New total must exactly match existing total."}
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default StaffScanToken;
