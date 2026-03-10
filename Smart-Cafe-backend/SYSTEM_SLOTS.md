# System Slots Feature

## Overview

System slots are **default, recurring time slots** that provide a stable booking structure for the canteen. They:

- ✅ **Cannot be deleted** (only disabled/cancelled)
- ✅ **Provide consistent meal times** across days
- ✅ **Respect admin token policies** (capacity, fairness rules, etc.)
- ✅ **Can be customized** by adjusting capacity or cancelling specific dates
- ✅ **Support multiple canteens** - each canteen gets its own system slots
- ✅ **Can be disabled temporarily** - hidden from student view when disabled

## Canteen-Specific System Slots

### Global vs Canteen-Specific

- **System slots are created per canteen** - each canteen has its own set of 13 daily slots
- **Modifying one canteen's slot** only affects that canteen (other canteens unaffected)
- **Bulk creation** - admins can create slots for all canteens at once
- **Independent management** - disable, enable, or cancel slots per canteen

### How It Works

1. **Seeding creates slots for all active canteens**

   ```bash
   node seed_system_slots.js
   # Creates 13 slots × 7 days × number of active canteens
   ```

2. **Admin can create slots for specific canteen or all canteens**
   - Select "All Canteens" to create the same slot for all canteens
   - Select specific canteen to create slot for that canteen only

3. **Students see only their selected canteen's slots**
   - Filtering happens automatically based on canteen selection
   - Disabled slots are hidden from student view

## Slot Schedule

### Breakfast (07:00 AM - 10:00 AM)

- 07:00 AM - 08:00 AM (Capacity: 80)
- 08:00 AM - 09:00 AM (Capacity: 100)
- 09:00 AM - 10:00 AM (Capacity: 60)

### Lunch (12:00 PM - 02:00 PM)

- 12:00 PM - 12:30 PM (Capacity: 150)
- 12:30 PM - 01:00 PM (Capacity: 200) ← **Peak time**
- 01:00 PM - 01:30 PM (Capacity: 150)
- 01:30 PM - 02:00 PM (Capacity: 100)

### Snacks (04:00 PM - 05:00 PM)

- 04:00 PM - 04:30 PM (Capacity: 80)
- 04:30 PM - 05:00 PM (Capacity: 100)

### Dinner (07:00 PM - 09:00 PM)

- 07:00 PM - 07:30 PM (Capacity: 120)
- 07:30 PM - 08:00 PM (Capacity: 150) ← **Peak time**
- 08:00 PM - 08:30 PM (Capacity: 120)
- 08:30 PM - 09:00 PM (Capacity: 80)

**Total: 13 slots per day**

## How to Seed System Slots

### Initial Setup (All Canteens)

Run the seeding script to create system slots for all active canteens for the next 7 days:

```bash
cd Smart-Cafe-backend
npm run seed:slots
```

Or directly:

```bash
node seed_system_slots.js
```

### Seed for Specific Canteen

Create slots for only one canteen:

```bash
node seed_system_slots.js --canteen=<canteenId>
```

### Daily Mode (Cron Job)

Create tomorrow's slots only (for all canteens):

```bash
npm run seed:daily
# OR
node seed_system_slots.js --daily
```

FoDisplay **"OFF"** badge in red if disabled

- Display **canteen name** below meal type (if not default canteen)
- **Cannot be deleted** (button shows "Cancel Slot" instead for system slots)
- Can be **disabled** (hidden from students, can be re-enabled)
- Can be **cancelled** (marked as cancelled, cannot be re-opened)
- Capacity can still be adjusted
- Show message: _"System slots cannot be deleted. You can cancel/disable them temporarily."_

### Disable vs Cancel

**Disable** (Temporary):

- Slot is **hidden from students** (not visible in booking page)
- Can be **re-enabled** anytime
- Use for: temporary closures, maintenance, low staff availability
- Button: Amber "Disable Slot" / Green "Enable Slot"

**Cancel** (Permanent):

- Slot is **marked as cancelled** (shown grayed out)
- **Cannot be re-opened** once cancelled
- Existing bookings are notified
- Use for: holidays, emergencies, permanent closure
- Button: Red "Cancel Slot"

### Creating Slots for Multiple Canteens

1. Click "Create Slot" button
2. Select **"All Canteens"** from dropdown
3. Set time, capacity, and meal type
4. Click "Create Slot"
5. System creates the same slot for all active canteens

### Custom Slots (created by admin)

- No **"SYS"** badge indicator
- **Can be deleted** (button shows "Delete Slot")
- Full control for admins
- Can be created for specific canteen or all canteeanteens (or specific canteen if --canteen flag used)

3. Creates system slots for each canteen:
   - Initial mode: next 7 days
   - Daily mode: tomorrow only
4. Marks each slot with `isSystemSlot: true` and `canteenId: <canteenId>`
5. Skips slots that already exist (safe to re-run)
6. Reports created/skipped counts per canteen

### Recommended Cron Setup

```bash
# Run daily at 11:59 PM to create tomorrow's slots for all canteens
59 23 * * * cd /path/to/Smart-Cafe-backend && node seed_system_slots.js --daily
```

## Admin Dashboard Behavior

### System Slots

- Display a **"SYS"** badge in the slot grid
- **Cannot be deleted** (button shows "Cancel Slot" instead)
- Can be **cancelled/disabled** temporarily
- Capacity can still be adjusted
- Show message: _"System slots cannot be deleted. You can cancel/disable them temporarily."_

### Custom Slots (created by admin)

- No badge indicator
- **Can be deleted** (button shows "Delete Slot")
- Full control for admins

## User Experience

Students and staff see:

- All **active** system slots (not cancelled)
- Can book tokens following all admin policies:
  - Max bookings per day
  - Peak booking window
  - Token expiry rules
  - Priority segments (Faculty/Guest reservations)
  - No-show penalties

## Database Schema

```javascript
{
  date: Date,              // e.g., 2026-03-10T00:00:00.000Z
  time: String,            // e.g., "12:30 PM - 01:00 PM"
  mealType: String,        // "BREAKFAST" | "LUNCH" | "DINNER" | "SNACKS"
  capacity: Number,        // e.g., 200
  booked: Number,          // e.g., 45
  status: String,          // "Open" | "Full" | "Cancelled" | "FastFilling"
  canteenId: String,       // "default" or specific canteen ID
  isSystemSlot: Boolean,   // true for system slots, false/undefined for custom
  createdAt: Date,
  updatedAt: Date
}
```

## API Behavior

### `DELETE /api/slots/:id`

```javascript
// If slot.isSystemSlot === true
Response: 403 Forbidden
{
  "success": false,
  "message": "System slots cannot be deleted. You can cancel them instead."
}
```

### Student Booking Flow

1. Student views available slots
2. Selects a system slot (e.g., Lunch 12:30 PM - 01:00 PM)
3. Creates booking following all policies
4. `slot.booked` increments, status updates if needed
5. Token generated and shown to student

## Benefits

✅ **Predictable schedule** - Students know meal times in advance  
✅ **Reduced admin overhead** - No need to manually create daily slots  
✅ **Policy enforcement** - All bookings respect capacity/fairness rules  
✅ **Flexibility** - Admins can still adjust capacity or cancel specific dates  
✅ **Data integrity** - Cannot accidentally delete slots with existing bookings

## Customization

To modify the default slot schedule:

1. Edit `seed_system_slots.js`
2. Update the `SYSTEM_SLOTS` array
3. Run `npm run seed:slots` to create new slots
4. Existing slots remain unchanged (script skips duplicates)

## Troubleshooting

**Q: What if I need to change slot times?**  
A: Cancel the old slot and create a new custom slot, or modify the seed script and re-run for future dates.

**Q: Can I delete a system slot with bookings?**  
A: No, system slots cannot be deleted. Cancel them instead to preserve booking history.

**Q: How do I extend the booking window beyond 7 days?**  
A: Modify the seed script's loop (`for (let i = 0; i < 7; i++)`) to generate more days, or set up a cron job.

**Q: What happens if I run the seed script multiple times?**  
A: Safe! It skips existing slots and only creates missing ones.
