# Phase 1 Testing Checklist - Core Marketplace

## Pre-Testing Setup

### 1. Start Backend Server
```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne\backend"
pnpm run dev
```
**Expected:** Server running on `http://localhost:3000`

### 2. Seed Database with Test Data
```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne\backend"
pnpm run seed
```
**Expected:** Creates 3 test providers and 1 test client

### 3. Start Mobile App
```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne\mobile"
pnpm start
```
Then press `w` for web

---

## Test Accounts

**Client Account:**
- Email: `test@alyne.com`
- Password: `test123` (or use "Dev Login" button)

**Provider Accounts:**
- Email: `yoga@alyne.com` | Password: `provider123`
- Email: `massage@alyne.com` | Password: `provider123`
- Email: `nutrition@alyne.com` | Password: `provider123`

---

## Test 1.1: Provider Discovery ✅

### Steps:
1. ✅ Login as client (`test@alyne.com` or use Dev Login)
2. ✅ Navigate to **Discover** tab
3. ✅ Verify 3 provider cards are displayed
4. ✅ Check each card shows:
   - Provider name
   - Rating (may be 0 if no reviews)
   - Price range or "Starting at $X"
   - Specialty tags
5. ✅ Test search: Type "yoga" → Should filter to yoga provider
6. ✅ Test search: Type "massage" → Should filter to massage provider
7. ✅ Clear search → All providers show again

### Expected Results:
- ✅ 3 providers visible on Discover screen
- ✅ Search filters correctly
- ✅ Provider cards are tappable

### Issues to Note:
- [ ] No providers showing
- [ ] Search not working
- [ ] Cards not clickable

---

## Test 1.2: Provider Detail Screen ✅

### Steps:
1. ✅ Tap on "Sarah Johnson" (Yoga provider) card
2. ✅ Verify provider detail screen loads
3. ✅ Check **About** tab shows:
   - Bio text
   - Specialty tags
4. ✅ Switch to **Services** tab
5. ✅ Verify 2 services listed:
   - 60-Minute Yoga Session ($75)
   - 90-Minute Deep Stretch ($100)
6. ✅ Switch to **Reviews** tab
7. ✅ Verify reviews section (may be empty)
8. ✅ Check "Book Session" button is visible

### Expected Results:
- ✅ All tabs load correctly
- ✅ Services display with prices
- ✅ "Book Session" button present

### Issues to Note:
- [ ] Blank screen
- [ ] Missing services
- [ ] Tabs not switching

---

## Test 1.3: Booking Creation Flow ✅

### Steps:
1. ✅ On provider detail, tap **"Book Session"**
2. ✅ Verify booking creation screen loads
3. ✅ Select a service (e.g., "60-Minute Yoga Session")
4. ✅ Pick a date from calendar (next available day)
5. ✅ Select a time slot (should show available times)
6. ✅ Add optional notes: "First time yoga session"
7. ✅ Tap **"Confirm Booking"**
8. ✅ Verify success message/redirect
9. ✅ Check redirected to Bookings tab

### Expected Results:
- ✅ Service selection works
- ✅ Calendar shows dates
- ✅ Time slots are available
- ✅ Booking creates successfully
- ✅ Redirects to bookings screen

### Issues to Note:
- [ ] No services available
- [ ] No time slots showing
- [ ] Booking fails to create
- [ ] No redirect after booking

---

## Test 1.4: Booking Management ✅

### Steps:
1. ✅ Navigate to **Bookings** tab
2. ✅ Verify the booking you just created appears
3. ✅ Check booking shows:
   - Provider name
   - Service name
   - Date and time
   - Status (should be "PENDING")
4. ✅ Tap on the booking to see details
5. ✅ Verify booking detail screen shows all info

### Expected Results:
- ✅ Booking appears in list
- ✅ All booking info displays correctly
- ✅ Can view booking details

### Issues to Note:
- [ ] Booking not in list
- [ ] Missing booking information
- [ ] Can't view details

---

## Test 1.5: Provider Booking Actions (Optional - if logged in as provider)

### Steps:
1. ✅ Logout
2. ✅ Login as provider (`yoga@alyne.com` / `provider123`)
3. ✅ Navigate to **Bookings** tab
4. ✅ Verify pending booking appears
5. ✅ Check **"Accept"** and **"Decline"** buttons visible
6. ✅ Tap **"Accept"**
7. ✅ Verify status changes to "CONFIRMED"
8. ✅ Verify buttons disappear (or change)

### Expected Results:
- ✅ Provider sees pending bookings
- ✅ Accept/Decline buttons work
- ✅ Status updates correctly

### Issues to Note:
- [ ] Provider can't see bookings
- [ ] Accept/Decline not working
- [ ] Status not updating

---

## Phase 1 Testing Summary

### Completed Tests:
- [ ] Test 1.1: Provider Discovery
- [ ] Test 1.2: Provider Detail Screen
- [ ] Test 1.3: Booking Creation Flow
- [ ] Test 1.4: Booking Management
- [ ] Test 1.5: Provider Booking Actions

### Critical Issues Found:
1. 
2. 
3. 

### Minor Issues Found:
1. 
2. 
3. 

### Notes:
- 

---

## Next Steps After Phase 1 Testing

Once Phase 1 is complete and working:
1. Fix any critical issues found
2. Move to Phase 2: Provider Onboarding testing
3. Then Phase 3: Real-time Messaging
4. Then Phase 4: Reviews System
5. Finally Phase 5: Payments

