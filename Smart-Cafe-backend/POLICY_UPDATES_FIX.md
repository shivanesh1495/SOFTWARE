# Student Dashboard - Real-Time Policy Updates FIX

## Problem Identified:

When admin updated policies in "Policies & Capacity" page and saved:

- ✗ Changes were saved to database
- ✗ But students didn't see the updated policies
- ✗ Student dashboard didn't display these policies at all
- ✗ No real-time notification when policies changed

## Root Causes:

1. **Backend**: `getPublicSettings()` API only returned limited booking settings, NOT the policy rules
2. **Frontend**: Student dashboard never fetched or displayed policies
3. **Real-time**: No mechanism to notify frontend when admin changed settings

---

## Fixes Applied:

### 1. Backend Fix - Expand `getPublicSettings()` API

**File**: `src/services/system.service.js`

**What changed**:

- Added new `toNumber()` helper function
- Expanded `getPublicSettings()` to fetch ALL policy settings from database:
  - `MAX_BOOKINGS_PER_STUDENT_PER_DAY`
  - `PEAK_BOOKING_WINDOW_MINS`
  - `TOKEN_EXPIRY_DURATION_MINS`
  - `NO_SHOW_GRACE_PERIOD_MINS`
  - `NO_SHOW_PENALTY_DAYS`
  - `RICE_PORTION_LIMIT_G`
  - `CURRY_PORTION_LIMIT_ML`
  - `MAX_CAPACITY_PER_SLOT`
  - `FACULTY_RESERVED_SLOTS`
  - `GUEST_RESERVED_SLOTS`

- Return them in a new `policies` object

**Example response**:

```javascript
{
  onlineBookingEnabled: true,
  walkinEnabled: true,
  ... existing fields ...
  policies: {
    maxBookingsPerDay: 2,
    peakBookingWindowMins: 30,
    tokenExpiryMins: 60,
    noShowGraceMins: 15,
    noShowPenaltyDays: 7,
    // ... other policies
  }
}
```

### 2. Frontend Type Definition Update

**File**: `src/services/system.service.ts`

**What changed**:

- Updated `PublicSettings` interface to include optional `policies` object
- Added TypeScript types for all policy fields

### 3. Created Policies Display Component

**File**: `src/student/components/PoliciesDisplay.tsx`

**What it shows**:

- Blue info box with booking policies
- Displays:
  - Max bookings per day
  - Peak booking window
  - No-show penalty days
  - Token expiry time
  - Slot capacity per time

**Features**:

- Responsive design with icons
- Gracefully hides if policies unavailable
- Shows loading state

### 4. Student Dashboard Integration

**File**: `src/student/dashboard/page.tsx`

**What changed**:

- Added import for `getPublicSettings`
- Added `publicSettings` state to store fetched policies
- Added `settingsLoading` state for loading indicator
- Created `loadPublicSettings()` async function
- Added 30-second polling interval for settings (same as slots/notifications)
- Added event listener to reload settings on window focus
- Integrated `<PoliciesDisplay>` component in JSX to render policies

---

## How It Works Now:

### Flow Diagram:

```
1. ADMIN UPDATES POLICY
   └─ Goes to /admin/capacity
   └─ Changes "Max Bookings" to 5
   └─ Saves via bulkUpdateSettings()
   └─ Saved to database

2. BACKEND API
   └─ Student calls getPublicSettings()
   └─ Backend fetches all policies from DB
   └─ Returns in response

3. STUDENT DASHBOARD
   └─ Loads policies on mount
   └─ Polls every 30 seconds
   └─ Displays policies via PoliciesDisplay component
   └─ User sees: "Max Bookings: 5"

4. REAL-TIME UPDATESa
   └─ Student returns to tab (window focus)
   └─ immediately reloads settings
   └─ Sees latest admin changes instantly
```

### Real-Time Behavior:

**Today's behavior**:

- Policies checked every 30 seconds
- Also checked when window regains focus
- If admin changes policy, student sees update within 30 seconds or on tab switch

**Scenario**:

```
10:00 - Admin sets "Max Bookings = 2"
10:01 - Student sees "Max Bookings: 2"
10:02 - Admin changes to "Max Bookings = 5"
10:02-10:30 - Student still sees old value (polling interval)
10:32 - Student clicks on app tab (window focus)
        Immediately reloads and sees "Max Bookings: 5"
```

---

## Testing the Fix:

### Step 1: Verify Backend Response

```bash
curl http://localhost:5000/api/system/public
```

Expected response includes:

```json
{
  "policies": {
    "maxBookingsPerDay": 2,
    "peakBookingWindowMins": 30,
    ...
  }
}
```

### Step 2: Test Admin Update

1. Open admin panel at `/admin/capacity`
2. Change "Max Bookings / Student / Day" to 5
3. Click "Save All Policies"
4. Open student dashboard in new tab

### Step 3: Real-Time Test

1. Student dashboard open in Tab A
2. Admin panel open in Tab B
3. Change a policy in Tab B
4. Wait 30 seconds or click Tab A
5. Expected: Student dashboard shows updated policy

---

## Database Schema:

### SystemSetting Collection:

```javascript
{
  settingKey: "MAX_BOOKINGS_PER_STUDENT_PER_DAY",
  settingValue: "2",
  dataType: "NUMBER",
  category: "CAPACITY",
  isEditable: true,
  description: "Max bookings per student per day",
  updatedAt: "2026-03-10T12:00:00Z"
}
```

When fetching, these are all combined into the `policies` object.

---

## Old vs New Behavior:

### BEFORE:

```
Admin: Changes "Max Bookings" to 5 → Save
Backend: Data saved to DB ✓
Student: Sees nothing ✗ (policies not shown)
Student: Can't verify the new limit ✗
```

### AFTER:

```
Admin: Changes "Max Bookings" to 5 → Save
Backend: Data saved to DB ✓
Student: Student dashboard shows "Max Bookings: 5" ✓
Student: Sees all booking rules ✓
Polling: Updates every 30s or on tab focus ✓
```

---

## Files Modified:

1. **Backend**:
   - `src/services/system.service.js` - Enhanced `getPublicSettings()`

2. **Frontend**:
   - `src/services/system.service.ts` - Updated `PublicSettings` interface
   - `src/student/dashboard/page.tsx` - Added policies loading & display
   - `src/student/components/PoliciesDisplay.tsx` - New component (created)

---

## Future Enhancements:

1. **WebSocket Real-Time**: Replace 30s polling with WebSocket events
2. **Toast Notifications**: Alert students when policies change
3. **History Tracking**: Show policy change history to admin
4. **Student Alerts**: Email/SMS when critical policies change
