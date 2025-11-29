# Phase 5: Payments - Testing Guide

## Overview
This guide covers comprehensive testing of the payment flow, including web and native payment processing, receipt display, and transaction history.

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

### 3. Environment Variables
Ensure `.env` files are configured:
- `backend/.env` - `STRIPE_SECRET_KEY` (test mode key)
- `mobile/.env` or `app.config.js` - `STRIPE_PUBLISHABLE_KEY` (test mode key)

### 4. Stripe Test Cards
Use Stripe test cards for testing:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- **3D Secure:** `4000 0025 0000 3155`
- Use any future expiry date (e.g., 12/25)
- Use any 3-digit CVC
- Use any ZIP code

---

## Test Cases

### Test 5.1: Payment Intent Creation

**Objective:** Verify payment intent is created correctly for confirmed bookings.

**Steps:**
1. Login as a client
2. Navigate to Bookings tab
3. Find a booking with status `CONFIRMED`
4. Tap "Pay Now" button
5. Observe checkout screen loads

**Expected Results:**
- ✅ Checkout screen displays booking summary
- ✅ Service name, provider name, date/time, and price are correct
- ✅ Payment form appears (web: Stripe Elements, native: payment sheet ready)
- ✅ No errors in console

**Common Issues:**
- Payment intent creation fails → Check backend logs, Stripe API key
- Booking not found → Verify booking exists and belongs to user
- Unauthorized error → Check authentication token

---

### Test 5.2: Web Payment Flow

**Objective:** Verify Stripe Elements payment form works on web.

**Steps:**
1. Open app in web browser
2. Navigate to checkout screen (from Test 5.1)
3. Fill in payment form:
   - Card number: `4242 4242 4242 4242`
   - Expiry: `12/25`
   - CVC: `123`
   - ZIP: `12345`
4. Click "Pay $X.XX" button
5. Wait for payment processing

**Expected Results:**
- ✅ Stripe Elements form displays correctly
- ✅ Card input fields are visible and functional
- ✅ Payment processes successfully
- ✅ Success message appears
- ✅ Option to view receipt is presented
- ✅ Redirects to receipt or bookings screen

**Common Issues:**
- Stripe Elements not loading → Check `STRIPE_PUBLISHABLE_KEY` in app.config.js
- Payment fails → Check Stripe dashboard, test card validity
- Form not submitting → Check browser console for errors

---

### Test 5.3: Native Payment Flow

**Objective:** Verify Stripe React Native payment sheet works on mobile.

**Steps:**
1. Open app on iOS/Android
2. Navigate to checkout screen
3. Tap "Pay $X.XX" button
4. Native payment sheet appears
5. Fill in test card details
6. Confirm payment

**Expected Results:**
- ✅ Payment sheet appears with correct amount
- ✅ Card input form is functional
- ✅ Payment processes successfully
- ✅ Success alert appears
- ✅ Option to view receipt is presented

**Common Issues:**
- Payment sheet not appearing → Check Stripe React Native setup
- Payment fails → Check Stripe dashboard, device network
- App crashes → Check native logs for errors

---

### Test 5.4: Payment Receipt Display

**Objective:** Verify receipt screen displays payment details correctly.

**Steps:**
1. Complete a payment (from Test 5.2 or 5.3)
2. Tap "View Receipt" button
3. Observe receipt screen

**Expected Results:**
- ✅ Receipt number displays (last 8 chars of payment ID)
- ✅ Payment amount is correct
- ✅ Payment status shows "COMPLETED"
- ✅ Date paid is correct
- ✅ Transaction ID displays (last 12 chars of Stripe payment ID)
- ✅ Booking details (service, provider, date/time) are correct
- ✅ Summary shows subtotal and total
- ✅ Security message displays

**Common Issues:**
- Receipt not loading → Check API endpoint, booking ID
- Missing data → Check database, payment record exists
- Wrong amount → Verify payment amount matches booking price

---

### Test 5.5: Payment History

**Objective:** Verify transaction history displays all payments.

**Steps:**
1. Login as client or provider
2. Navigate to Profile tab
3. Tap "Payment History" (if available) or navigate to `/payment/history`
4. Observe payment history list

**Expected Results:**
- ✅ All payments for user are listed
- ✅ Payments sorted by date (newest first)
- ✅ Each payment shows:
  - Service name
  - Provider/Client name (depending on user type)
  - Amount
  - Status badge (color-coded)
  - Date and time
  - "View Receipt" link
- ✅ Pull-to-refresh works
- ✅ Tapping a payment navigates to receipt

**Common Issues:**
- No payments showing → Check API endpoint, user has payments
- Wrong payments showing → Check user filtering logic
- Status colors incorrect → Verify status mapping

---

### Test 5.6: Payment Status Updates

**Objective:** Verify payment status updates correctly in database.

**Steps:**
1. Complete a payment
2. Check Stripe dashboard for payment status
3. Check database for payment record
4. Verify payment status in app

**Expected Results:**
- ✅ Payment record created in database
- ✅ Status is "completed" after successful payment
- ✅ `paidAt` timestamp is set
- ✅ `stripePaymentId` matches Stripe payment intent ID
- ✅ Amount matches booking price

**Verification:**
```sql
-- Check payment record
SELECT * FROM "Payment" WHERE "bookingId" = '<booking-id>';

-- Should show:
-- status: 'completed'
-- paidAt: <timestamp>
-- stripePaymentId: 'pi_...'
```

---

### Test 5.7: Payment Error Handling

**Objective:** Verify error handling for failed payments.

**Steps:**
1. Navigate to checkout screen
2. Use declined test card: `4000 0000 0000 0002`
3. Attempt payment
4. Observe error handling

**Expected Results:**
- ✅ Payment fails gracefully
- ✅ Error message displays to user
- ✅ Payment status remains "pending" or "failed"
- ✅ User can retry payment
- ✅ No app crash or data corruption

**Common Issues:**
- Error not displayed → Check error handling in payment flow
- Payment status not updated → Check error handling in backend
- App crashes → Check error boundaries

---

### Test 5.8: Payment Authorization

**Objective:** Verify only authorized users can access payments.

**Steps:**
1. Login as Client A
2. Create a booking with Provider B
3. Try to access payment for a booking belonging to Client C
4. Verify access is denied

**Expected Results:**
- ✅ Only booking owner (client) can create payment intent
  - **Implementation:** `paymentService.createPaymentIntent()` checks `booking.clientId !== userId` and returns 403
  - **Error Message:** "Unauthorized: Only the booking owner can create payment intent"
- ✅ Only booking owner can confirm payment
  - **Implementation:** `paymentService.confirmPayment()` checks `booking.clientId !== userId` and returns 403
  - **Additional Security:** Verifies paymentIntentId belongs to the booking via metadata check
  - **Error Message:** "Unauthorized: Only the booking owner can confirm payment"
- ✅ Client and provider can view payment receipt
  - **Implementation:** `paymentService.getPaymentByBooking()` allows access if user is either `booking.clientId` or `booking.providerId`
  - **Error Message:** "Unauthorized: You do not have access to this payment"
- ✅ Unauthorized access returns 403 error
  - **Implementation:** All authorization checks return 403 status code with descriptive error messages
  - **Routes:** All payment routes are protected by `authenticate` middleware

---

### Test 5.9: Payment for Different Booking Statuses

**Objective:** Verify payment can only be processed for confirmed bookings.

**Steps:**
1. Try to pay for a `PENDING` booking
2. Try to pay for a `COMPLETED` booking (already paid)
3. Try to pay for a `CANCELLED` booking
4. Try to pay for a `CONFIRMED` booking

**Expected Results:**
- ✅ Payment only works for `CONFIRMED` bookings
  - **Implementation:** "Pay Now" button only appears for bookings with `status === 'CONFIRMED'` and `payment?.status !== 'completed'`
  - **Backend:** `paymentService.createPaymentIntent()` checks `booking.status !== 'CONFIRMED'` and returns 400 error
- ✅ Error message for other statuses
  - **Backend Error:** "Payment can only be processed for confirmed bookings"
- ✅ Already paid bookings show "Payment already completed" error
  - **Implementation:** Button hidden for completed payments, backend returns 409 if payment already completed
  - **Backend Error:** "Payment already completed"

---

### Test 5.10: Receipt Navigation

**Objective:** Verify receipt can be accessed from multiple places.

**Steps:**
1. Complete a payment → View receipt from success message
2. Navigate to payment history → Tap a payment → View receipt
3. Navigate to booking details → View receipt (if available)

**Expected Results:**
- ✅ Receipt accessible from all entry points
  - **Implementation:** Receipt accessible from payment success redirect, payment history list, and booking details
- ✅ Receipt displays correct data
  - **Implementation:** Receipt shows payment details, booking information, and transaction ID
- ✅ Back navigation works correctly
  - **Implementation:** Back button returns to previous screen

---

## Test Data Setup

### Create Test Bookings with Payments

To test payment features, you need bookings in `CONFIRMED` status:

```sql
-- Get a test client and provider
SELECT id, "userType", "firstName", "lastName" FROM "User" WHERE "userType" IN ('CLIENT', 'PROVIDER') LIMIT 2;

-- Create a confirmed booking (replace IDs)
INSERT INTO "Booking" (
  id, "clientId", "providerId", "serviceId", status, 
  "scheduledDate", "scheduledTime", price, "createdAt", "updatedAt"
) VALUES (
  'test-booking-1',
  '<client-id>',
  '<provider-id>',
  '<service-id>',
  'CONFIRMED',
  NOW() + INTERVAL '7 days',
  '14:00',
  100.00,
  NOW(),
  NOW()
);
```

---

## API Endpoints Verification

### Payment Endpoints

1. **POST `/api/payments/create-intent`**
   - **Auth:** Required
   - **Body:** `{ bookingId: string }`
   - **Response:** `{ success: true, data: { clientSecret: string, paymentId: string } }`
   - **Status Codes:** 200 (success), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (already paid)

2. **POST `/api/payments/confirm`**
   - **Auth:** Required
   - **Body:** `{ bookingId: string, paymentIntentId: string }`
   - **Response:** `{ success: true, data: Payment }`
   - **Status Codes:** 200 (success), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found)

3. **GET `/api/payments/booking/:bookingId`**
   - **Auth:** Required
   - **Response:** `{ success: true, data: Payment }`
   - **Status Codes:** 200 (success), 401 (unauthorized), 403 (forbidden), 404 (not found)

4. **GET `/api/payments/history`**
   - **Auth:** Required
   - **Response:** `{ success: true, data: Payment[] }`
   - **Status Codes:** 200 (success), 401 (unauthorized)

---

## Success Criteria

All tests should pass with:
- ✅ No console errors
- ✅ All API calls return expected status codes
- ✅ Payment data persists correctly in database
- ✅ UI updates reflect payment status changes
- ✅ Error messages are user-friendly
- ✅ Payment flow works on both web and native
- ✅ Receipt displays all required information
- ✅ Payment history shows all user payments

---

## Notes

- Use Stripe test mode keys for all testing
- Test with different card numbers to verify error handling
- Verify database state after each payment
- Check Stripe dashboard for payment intent status
- Test on both web and native platforms
- Verify real-time updates (if implemented)

---

## Troubleshooting

### Payment Intent Not Creating
- Check Stripe API key in backend `.env`
- Verify booking status is `CONFIRMED`
- Check user authentication
- Review backend logs

### Stripe Elements Not Loading (Web)
- Check `STRIPE_PUBLISHABLE_KEY` in `app.config.js`
- Verify `@stripe/stripe-js` and `@stripe/react-stripe-js` are installed
- Check browser console for errors
- Verify network connectivity

### Payment Sheet Not Appearing (Native)
- Check `STRIPE_PUBLISHABLE_KEY` in app config
- Verify `@stripe/stripe-react-native` is installed
- Check native build includes Stripe SDK
- Review device logs

### Receipt Not Loading
- Verify payment exists in database
- Check API endpoint returns data
- Verify booking ID is correct
- Check user has access to booking

---

---

## Phase 5 Testing Summary

**Status:** ✅ **COMPLETE**

All test cases have been verified and implemented:

- ✅ **Test 5.1:** Payment Intent Creation - Working
- ✅ **Test 5.2:** Web Payment Flow - Working (Stripe Elements integration)
- ✅ **Test 5.3:** Native Payment Flow - Working (Stripe React Native)
- ✅ **Test 5.4:** Payment Receipt Display - Working
- ✅ **Test 5.5:** Transaction History - Working
- ✅ **Test 5.6:** Payment Error Handling - Working
- ✅ **Test 5.7:** Payment Status Updates - Working
- ✅ **Test 5.8:** Payment Authorization - Working (with security enhancements)
- ✅ **Test 5.9:** Payment for Different Booking Statuses - Working
- ✅ **Test 5.10:** Receipt Navigation - Working

### Key Features Implemented:
- ✅ Web payment flow with Stripe Elements
- ✅ Native payment flow with Stripe React Native
- ✅ Payment receipt display with all details
- ✅ Transaction history with filtering
- ✅ Comprehensive error handling
- ✅ Authorization checks (client-only for payment creation/confirmation, client+provider for viewing)
- ✅ Status-based payment restrictions (CONFIRMED bookings only)
- ✅ Payment metadata tracking for Stripe Dashboard
- ✅ Automatic redirect to receipt for already-paid bookings
- ✅ "Paid" badge for completed payments

**Phase 5 Testing Complete!** ✅

