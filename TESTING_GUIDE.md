# Alyne MVP Testing Guide

## Overview
This guide covers systematic testing of all 5 MVP phases. We'll test each phase in order to ensure the complete user journey works end-to-end.

---

## Prerequisites

### 1. Start Backend Server
```powershell
cd backend
pnpm run dev
```
**Expected:** Server running on `http://localhost:3000`

### 2. Start Mobile App
```powershell
cd mobile
pnpm start
```
Then press:
- `w` for web
- `a` for Android emulator
- `i` for iOS simulator

### 3. Database Setup
Ensure your database is set up and migrations are run:
```powershell
cd backend
pnpm exec prisma migrate dev
pnpm exec prisma generate
```

### 4. Environment Variables
Check that `.env` files are configured:
- `backend/.env` - Database URL, JWT_SECRET, etc.
- `mobile/.env` or `app.json` - API_BASE_URL, STRIPE_PUBLISHABLE_KEY

---

## Phase 1: Core Marketplace Testing

### Test 1.1: Provider Discovery
**Steps:**
1. Login as a client (or use dev login)
2. Navigate to Discover tab
3. Verify providers are displayed
4. Test search functionality
5. Test filters (if implemented)

**Expected Results:**
- ✅ Provider cards display with name, rating, price
- ✅ Search filters providers
- ✅ Distance/rating filters work
- ✅ Can tap provider to see details

**Common Issues:**
- No providers showing → Check backend API, database has provider data
- Search not working → Check API endpoint, network requests
- Filters not applying → Check filter logic in backend

### Test 1.2: Provider Detail Screen
**Steps:**
1. Tap on a provider card
2. View provider profile
3. Check tabs: About, Services, Reviews
4. Verify "Book Session" button appears

**Expected Results:**
- ✅ Provider bio displays
- ✅ Services list shows with prices
- ✅ Reviews display (if any)
- ✅ "Book Session" button is visible

**Common Issues:**
- Blank screen → Check API response, provider ID
- Missing data → Check database, API includes all relations

### Test 1.3: Booking Creation Flow
**Steps:**
1. Tap "Book Session" on provider detail
2. Select a service
3. Pick a date from calendar
4. Select a time slot
5. Add notes (optional)
6. Submit booking

**Expected Results:**
- ✅ Service selection works
- ✅ Calendar shows available dates
- ✅ Time slots are selectable
- ✅ Booking creates successfully
- ✅ Redirects to bookings screen

**Common Issues:**
- No services → Provider needs to add services in onboarding
- No time slots → Provider needs to set availability
- Booking fails → Check API, booking service logic

### Test 1.4: Booking Management
**Steps:**
1. Navigate to Bookings tab
2. View upcoming bookings
3. As provider: Accept/Decline pending bookings
4. Verify booking status updates

**Expected Results:**
- ✅ Bookings list displays
- ✅ Upcoming/Past sections work
- ✅ Accept/Decline buttons appear for providers
- ✅ Status updates after action

**Common Issues:**
- No bookings → Create test booking first
- Actions not working → Check API endpoints, authentication

---

## Phase 2: Provider Onboarding Testing

### Test 2.1: Access Onboarding
**Steps:**
1. Login as a provider
2. Navigate to Profile tab
3. Tap "Complete Provider Profile"

**Expected Results:**
- ✅ Onboarding screen opens
- ✅ Multi-step form appears
- ✅ Progress bar shows

### Test 2.2: Profile Setup (Step 1)
**Steps:**
1. Add profile photo (optional)
2. Enter bio
3. Add specialties
4. Continue to next step

**Expected Results:**
- ✅ Photo upload works (or at least doesn't crash)
- ✅ Bio saves
- ✅ Specialties can be added/removed
- ✅ Can proceed to services

**Common Issues:**
- Photo upload fails → Check permissions, base64 encoding
- Bio not saving → Check API endpoint

### Test 2.3: Services Setup (Step 2)
**Steps:**
1. Add service name
2. Add description
3. Set price
4. Set duration
5. Add multiple services
6. Continue

**Expected Results:**
- ✅ Can add multiple services
- ✅ Can remove services
- ✅ Price/duration validation works
- ✅ Services save to database

**Common Issues:**
- Services not saving → Check API, service creation endpoint
- Validation errors → Check input validation

### Test 2.4: Credentials (Step 3)
**Steps:**
1. Add credential name
2. Add issuer (optional)
3. Add dates (optional)
4. Continue

**Expected Results:**
- ✅ Can add credentials
- ✅ Optional fields work
- ✅ Credentials save

### Test 2.5: Availability (Step 4)
**Steps:**
1. Toggle days of week
2. Set start/end times for each day
3. Complete setup

**Expected Results:**
- ✅ Can toggle days
- ✅ Time inputs work
- ✅ Availability saves
- ✅ Completion screen shows

**Common Issues:**
- Times not saving → Check time format, API
- Availability not showing → Check provider discovery

---

## Phase 3: Real-time Messaging Testing

### Test 3.1: Conversation List
**Steps:**
1. Navigate to Messages tab
2. Verify conversations load
3. Check unread counts
4. Pull to refresh

**Expected Results:**
- ✅ Conversations display
- ✅ Last message shows
- ✅ Unread badges appear
- ✅ Refresh works

**Common Issues:**
- No conversations → Need to send messages first
- Socket not connecting → Check Socket.io setup, authentication

### Test 3.2: Chat Screen
**Steps:**
1. Tap on a conversation
2. View message history
3. Send a message
4. Verify real-time delivery

**Expected Results:**
- ✅ Messages load
- ✅ Can type and send
- ✅ Message appears immediately (optimistic UI)
- ✅ Other user receives in real-time (if testing with 2 devices)

**Common Issues:**
- Messages not sending → Check Socket.io connection, API
- Not real-time → Check Socket.io events, client connection
- Messages not loading → Check API endpoint

### Test 3.3: Real-time Updates
**Steps:**
1. Open chat on Device A
2. Send message from Device B
3. Verify message appears on Device A without refresh

**Expected Results:**
- ✅ Message appears automatically
- ✅ No refresh needed
- ✅ Socket connection maintained

**Common Issues:**
- Not receiving → Check Socket.io room joining
- Connection drops → Check authentication, network

---

## Phase 4: Reviews System Testing

### Test 4.1: Review Submission
**Steps:**
1. Navigate to Bookings tab
2. Find a completed booking
3. Tap "Write a Review"
4. Select rating (1-5 stars)
5. Add comment (optional)
6. Submit

**Expected Results:**
- ✅ Review screen opens
- ✅ Star rating works
- ✅ Can add comment
- ✅ Review submits successfully
- ✅ "Reviewed" badge appears

**Common Issues:**
- No review button → Booking must be COMPLETED status
- Review not submitting → Check API, booking validation
- Already reviewed → Check review existence logic

### Test 4.2: Review Display
**Steps:**
1. Navigate to a provider profile
2. Go to Reviews tab
3. Verify reviews display

**Expected Results:**
- ✅ Reviews show on provider profile
- ✅ Rating displays correctly
- ✅ Comments show
- ✅ Client info shows

**Common Issues:**
- No reviews → Need to submit reviews first
- Reviews not loading → Check API endpoint

---

## Phase 5: Payments Testing

### Test 5.1: Payment Button
**Steps:**
1. Navigate to Bookings tab
2. Find a CONFIRMED booking (as client)
3. Verify "Pay Now" button appears

**Expected Results:**
- ✅ Payment button shows for confirmed bookings
- ✅ Button doesn't show if already paid

**Common Issues:**
- No button → Booking must be CONFIRMED, not PENDING
- Button shows after payment → Check payment status logic

### Test 5.2: Payment Checkout
**Steps:**
1. Tap "Pay Now"
2. Verify checkout screen loads
3. Check booking summary
4. Tap "Pay" button
5. Complete Stripe payment (use test card)

**Expected Results:**
- ✅ Checkout screen shows booking details
- ✅ Stripe payment sheet opens
- ✅ Can enter test card
- ✅ Payment processes

**Test Cards (Stripe Test Mode):**
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- Any future expiry date, any CVC

**Common Issues:**
- Payment sheet not opening → Check Stripe key, StripeProvider setup
- Payment fails → Check Stripe secret key, payment intent creation
- Not confirming → Check payment confirmation endpoint

### Test 5.3: Payment Status
**Steps:**
1. After successful payment
2. Return to bookings
3. Verify "Paid" badge appears

**Expected Results:**
- ✅ Payment status updates
- ✅ "Paid" badge shows
- ✅ Payment button disappears

---

## End-to-End User Journey Testing

### Complete Client Journey
1. **Register/Login** as client
2. **Discover** providers
3. **View** provider profile
4. **Book** a session
5. **Message** provider
6. **Pay** for confirmed booking
7. **Review** after completion

### Complete Provider Journey
1. **Register/Login** as provider
2. **Complete** onboarding
3. **Receive** booking request
4. **Accept** booking
5. **Message** client
6. **Receive** payment
7. **View** reviews

---

## Common Testing Issues & Solutions

### Backend Not Starting
- Check `.env` file exists
- Verify database connection
- Check port 3000 is available
- Look for error messages in console

### Mobile App Not Connecting
- Verify `API_BASE_URL` in mobile config
- Check backend is running
- Check CORS settings
- Verify network requests in browser dev tools

### Database Issues
- Run migrations: `pnpm exec prisma migrate dev`
- Generate Prisma client: `pnpm exec prisma generate`
- Check database URL in `.env`
- Use Prisma Studio to inspect data: `pnpm exec prisma studio`

### Authentication Issues
- Check JWT_SECRET is set
- Verify token storage works
- Check token expiration
- Use dev login for testing

### Socket.io Not Working
- Check Socket.io server is running
- Verify authentication token is passed
- Check CORS settings for Socket.io
- Look for connection errors in console

### Stripe Not Working
- Verify Stripe keys are set (test mode)
- Check StripeProvider is wrapping app
- Use test card numbers
- Check Stripe dashboard for logs

---

## Testing Checklist

### Phase 1: Core Marketplace
- [ ] Provider discovery loads
- [ ] Search works
- [ ] Provider detail shows
- [ ] Booking creation works
- [ ] Booking acceptance works

### Phase 2: Provider Onboarding
- [ ] Onboarding accessible
- [ ] Profile step works
- [ ] Services step works
- [ ] Credentials step works
- [ ] Availability step works
- [ ] Completion works

### Phase 3: Messaging
- [ ] Conversations load
- [ ] Chat screen works
- [ ] Messages send
- [ ] Real-time updates work

### Phase 4: Reviews
- [ ] Review button appears
- [ ] Review submission works
- [ ] Reviews display on profile

### Phase 5: Payments
- [ ] Payment button appears
- [ ] Checkout screen works
- [ ] Stripe payment processes
- [ ] Payment status updates

---

## Next Steps After Testing

1. **Document Issues**: Create a list of bugs found
2. **Prioritize Fixes**: Critical vs. Nice-to-have
3. **Fix Critical Bugs**: Address blocking issues first
4. **Re-test**: Verify fixes work
5. **Polish**: Improve UX based on testing

---

## Quick Test Commands

```powershell
# Start backend
cd backend; pnpm run dev

# Start mobile (in new terminal)
cd mobile; pnpm start

# Check database
cd backend; pnpm exec prisma studio

# View logs
# Backend: Check terminal output
# Mobile: Check browser console (web) or Metro bundler
```

---

## Need Help?

If you encounter issues during testing:
1. Check console logs (backend and mobile)
2. Check network requests in browser dev tools
3. Verify database has test data
4. Check environment variables
5. Review error messages carefully

Good luck with testing! 🚀

