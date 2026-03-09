# Phase 2 Testing Checklist - Provider Onboarding

## Pre-Testing Setup

### 1. Ensure Backend Server is Running
```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne\backend"
pnpm run dev
```
**Expected:** Server running on `http://localhost:3000`

### 2. Start Mobile App
```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne\mobile"
pnpm start
```
Then press `w` for web

---

## Test Accounts

**New Provider Account (to be created during testing):**
- Email: `newprovider@alyne.com`
- Password: `provider123`
- User Type: `PROVIDER`

**Existing Provider Account (for testing profile updates):**
- Email: `yoga@alyne.com`
- Password: `provider123`

---

## Test 2.1: Profile Creation Step ✅

### Steps:
1. ✅ Register a new provider account OR login as existing provider
2. ✅ Navigate to **Profile** tab
3. ✅ Tap **"Complete Provider Setup"** or **"Edit Profile"** button
4. ✅ Verify onboarding screen loads with **Step 1: Profile**
5. ✅ Fill in:
   - Bio: "Experienced wellness provider with 5 years of experience"
   - Add specialties: "Yoga", "Meditation", "Wellness"
6. ✅ Tap **"Next"** or **"Save & Continue"**
7. ✅ Verify progress bar updates
8. ✅ Verify moves to **Step 2: Services**

### Expected Results:
- ✅ Profile step loads correctly
- ✅ Bio field accepts text
- ✅ Specialties can be added and removed
- ✅ Form validation works (bio required)
- ✅ Progress bar shows 25% (1/4 steps)
- ✅ Successfully moves to next step

### Issues to Note:
- [ ] Onboarding screen doesn't load
- [ ] Bio field not saving
- [ ] Specialties not saving
- [ ] Can't proceed to next step

---

## Test 2.2: Services Setup Step ✅

### Steps:
1. ✅ On **Step 2: Services**
2. ✅ Add first service:
   - Name: "60-Minute Session"
   - Description: "One-on-one wellness session"
   - Price: "75"
   - Duration: "60"
3. ✅ Add second service:
   - Name: "90-Minute Extended Session"
   - Description: "Extended wellness session"
   - Price: "100"
   - Duration: "90"
4. ✅ Verify services appear in list
5. ✅ Test removing a service
6. ✅ Tap **"Next"** or **"Save & Continue"**
7. ✅ Verify moves to **Step 3: Credentials**

### Expected Results:
- ✅ Services step loads correctly
- ✅ Can add multiple services
- ✅ Can remove services
- ✅ Form validation works (name, price, duration required)
- ✅ Progress bar shows 50% (2/4 steps)
- ✅ Successfully moves to next step

### Issues to Note:
- [ ] Can't add services
- [ ] Services not saving
- [ ] Validation not working
- [ ] Can't proceed to next step

---

## Test 2.3: Credentials Setup Step ✅

### Steps:
1. ✅ On **Step 3: Credentials**
2. ✅ Add first credential:
   - Name: "Yoga Teacher Certification"
   - Issuer: "Yoga Alliance"
   - Issue Date: "2020-01-15"
   - Expiry Date: "2025-01-15"
3. ✅ Add second credential (optional):
   - Name: "CPR Certification"
   - Issuer: "American Red Cross"
4. ✅ Verify credentials appear in list
5. ✅ Test removing a credential
6. ✅ Tap **"Next"** or **"Save & Continue"**
7. ✅ Verify moves to **Step 4: Availability**

### Expected Results:
- ✅ Credentials step loads correctly
- ✅ Can add multiple credentials
- ✅ Can remove credentials
- ✅ Date fields work correctly
- ✅ Progress bar shows 75% (3/4 steps)
- ✅ Successfully moves to next step

### Issues to Note:
- [ ] Can't add credentials
- [ ] Credentials not saving
- [ ] Date pickers not working
- [ ] Can't proceed to next step

---

## Test 2.4: Availability Setup Step ✅

### Steps:
1. ✅ On **Step 4: Availability**
2. ✅ Select days of week (e.g., Monday, Wednesday, Friday)
3. ✅ Set time ranges for each day:
   - Monday: 9:00 AM - 5:00 PM
   - Wednesday: 9:00 AM - 5:00 PM
   - Friday: 9:00 AM - 5:00 PM
4. ✅ Verify selected days show time pickers
5. ✅ Verify can toggle days on/off
6. ✅ Tap **"Complete Setup"** or **"Finish"**
7. ✅ Verify completion screen appears
8. ✅ Tap **"Go to Profile"** or **"Done"**
9. ✅ Verify redirects to Profile tab

### Expected Results:
- ✅ Availability step loads correctly
- ✅ Can select/deselect days
- ✅ Time pickers work for selected days
- ✅ Progress bar shows 100% (4/4 steps)
- ✅ Completion screen appears
- ✅ Successfully redirects to profile

### Issues to Note:
- [ ] Can't select days
- [ ] Time pickers not working
- [ ] Availability not saving
- [ ] Completion screen doesn't appear
- [ ] Can't finish onboarding

---

## Test 2.5: Profile Verification ✅

### Steps:
1. ✅ After completing onboarding, go to **Profile** tab
2. ✅ Verify profile shows:
   - Bio text
   - Specialties listed
   - Services count
   - Credentials count
3. ✅ Navigate to **Discover** tab (as different user)
4. ✅ Search for the new provider
5. ✅ Verify provider appears in discovery
6. ✅ Tap on provider card
7. ✅ Verify provider detail screen shows:
   - Bio
   - Services (with prices)
   - Credentials (if any)
   - Availability info

### Expected Results:
- ✅ Profile displays all saved information
- ✅ Provider appears in discovery
- ✅ Provider detail shows all information correctly
- ✅ Services are visible with correct pricing

### Issues to Note:
- [ ] Profile not showing saved data
- [ ] Provider not appearing in discovery
- [ ] Provider detail missing information
- [ ] Services not displaying

---

## Phase 2 Testing Summary

### Completed Tests:
- [ ] Test 2.1: Profile Creation Step
- [ ] Test 2.2: Services Setup Step
- [ ] Test 2.3: Credentials Setup Step
- [ ] Test 2.4: Availability Setup Step
- [ ] Test 2.5: Profile Verification

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

## Next Steps After Phase 2 Testing

Once Phase 2 is complete and working:
1. Fix any critical issues found
2. Move to Phase 3: Real-time Messaging testing
3. Then Phase 4: Reviews System testing
4. Finally Phase 5: Payments testing

