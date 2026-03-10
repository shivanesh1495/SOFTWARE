# Smart Cafe Inventory & Booking System Fixes

## Summary of Changes Applied

### 1. ✅ Backend Service Improvements

**File: `src/services/booking.service.js`**

- **Issue**: Race condition errors when multiple students book simultaneously
- **Error Message**: "Curd Rice stock changed. Please refresh and try again"
- **Fix Applied**:
  - Added retry logic (maxRetries = 3) for concurrent bookings
  - Improved error messages to show actual available quantity
  - Better handling of stock reservation failures
  - Graceful fallback when items are purchased by other users

**Changes**:

```javascript
// Old: Single attempt, generic error on failure
const updated = await MenuItem.findOneAndUpdate(...);
if (!updated) {
  throw ApiError.conflict("stock changed. Please refresh and try again.");
}

// New: Retry logic with 3 attempts
for (let attempt = 1; attempt <= maxRetries; attempt++) {
  updated = await MenuItem.findOneAndUpdate(...);
  if (updated) break;
  if (attempt < maxRetries) continue; // Retry
}
```

### 2. ✅ Database Initialization Script

**File: `run-inventory-fix.js`**

- Sets default quantity to 100 for all menu items
- Ensures `isAvailable` flag matches inventory status
- Verifies data consistency
- Provides detailed statistics and sampling

**Usage**:

```bash
node run-inventory-fix.js
```

**What it does**:

- ✓ Initializes menu items without quantity to 100 units
- ✓ Marks items with 0 quantity as unavailable
- ✓ Re-enables available items incorrectly marked as unavailable
- ✓ Shows inventory statistics and sample items

### 3. ✅ Frontend (Already Working)

**Current State**: ✓ **No Changes Needed**

The frontend is already fetching quantities dynamically from the backend:

- Student dashboard: Shows quantities from API
- Booking page: Fetches item quantities in real-time
- Staff menu-quantity page: Used by staff/admin to update quantities

**Fallback Pattern** (`?? 100`):

- This is a safety mechanism for backward compatibility
- If backend doesn't send quantity, defaults to 100
- Does NOT hardcode values - all data comes from API

### 4. ✅ Admin Quantity Control

**Already Available**: ✓ **No Changes Needed**

Admin/Staff can update quantities via:

- **UI Path**: `/staff/menu-quantity` (Staff Menu Quantity Control page)
- **API Endpoint**: `PATCH /api/menu-items/:id/quantity`
- **Payload**: `{ availableQuantity: number }`

**How it works**:

1. Staff logs in
2. Navigates to "Food Quantity Control"
3. Searches for item
4. Updates quantity in the input field
5. Clicks Save
6. Quantity updates immediately and affects new bookings

---

## How the System Works Now

### Booking Flow with Stock Management:

```
1. ADMIN SETUP
   ├─ All menu items start with 100 units (default)
   └─ Staff can adjust via /staff/menu-quantity

2. STUDENT BOOKS
   ├─ Views menu items with available quantities
   ├─ Adds items to cart
   └─ Places booking

3. STOCK DEDUCTION (with retry logic)
   ├─ System reserves stock for booked items
   ├─ If race condition: retries up to 3 times
   ├─ Reserves successfully → Booking confirmed
   ├─ Reserves fail → Clear error with current availability
   └─ Booking cancelled → Stock returned to inventory

4. BOOKING COMPLETED
   ├─ Token generated for pickup
   ├─ Stock permanently deducted
   └─ Student gets pickup instructions
```

### Stock Status Updates:

```
Quantity  │  isAvailable  │  Status
----------|---------------|----------
> 0       │  true         │ ✓ Can order
0         │  false        │ ✗ Out of stock
null      │  (auto-set)   │ ✓ Defaults to 100
```

---

## Testing the Fixes

### Test 1: Initialize Quantities

```bash
node run-inventory-fix.js
# Expected: All items set to 100, statistics shown
```

### Test 2: Multiple Concurrent Bookings

1. Open app in 3 browser tabs
2. All students try to book same 1 item at same time
3. Expected: 1 succeeds, others get "only X left" instead of "stock changed"

### Test 3: Staff Update Quantity

1. Go to /staff/menu-quantity
2. Search for an item
3. Change quantity to 5
4. Save
5. Expected: Quantity updates immediately, students can't order more than 5

### Test 4: Booking Deducts Stock

1. Item has 10 units
2. Student books 3 units
3. Refresh page
4. Expected: Item now shows 7 units available

---

## API Endpoints

### Get Menu Items with Quantities

```
GET /api/menu-items/
Response: {
  id: "xxx",
  itemName: "Curd Rice",
  availableQuantity: 100,  ← Current stock
  isAvailable: true,       ← Can order?
  ...
}
```

### Admin/Staff Update Quantity

```
PATCH /api/menu-items/:id/quantity
Auth: Bearer token (staff/admin required)
Body: { availableQuantity: 50 }
Response: { ...item with updated quantity }
```

### Create Booking (with stock deduction)

```
POST /api/bookings/
Auth: Bearer token (user required)
Body: {
  slotId: "xxx",
  items: [{ menuItemId: "yyy", quantity: 2 }]
}
Response: { ...booking with items, token generated }
```

---

## Troubleshooting

### Issue: "Curd Rice stock changed. Please refresh and try again"

**Solution**: This should rarely occur now with retry logic. If it happens:

1. Refresh page to see current availability
2. Try booking in a few seconds
3. If persists, check `/staff/menu-quantity` for actual stock

### Issue: Item shows quantity but can't book

**Solution**: Item might be marked `isAvailable: false`. Check:

- Staff page → Set new quantity (auto-enables if > 0)
- Or quantity is actually 0 → Out of stock

### Issue: Quantity not updating in UI

**Solution**: Frontend caches data. Try:

1. Hard refresh: `Ctrl + Shift + R` (or `Cmd + Shift + R`)
2. Clear browser cache
3. Logout and login again

---

## Database Migration Notes

Before running `node run-inventory-fix.js`, ensure:

1. MongoDB is running on `mongodb://127.0.0.1:27017/smart-cafe`
2. No active bookings are being processed
3. Run during low-traffic time

The script is safe:

- ✓ Only sets NULL/undefined quantities to 100
- ✓ Doesn't modify existing valid quantities
- ✓ Doesn't delete any data
- ✓ Can be run multiple times safely
