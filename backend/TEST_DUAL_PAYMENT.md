# Testing Dual Payment Flow

## Overview
This document outlines how to test the dual payment flow where:
- Client pays platform fee ($12) via Stripe → Only shows in your Stripe dashboard
- Client pays provider amount ($120) via Plaid RTP → Goes directly to provider's bank

## Prerequisites

1. **Backend server running:**
   ```powershell
   cd backend
   pnpm run dev
   ```

2. **Environment variables set:**
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   PLAID_CLIENT_ID=your_plaid_client_id
   PLAID_SECRET=your_plaid_secret
   PLAID_ENV=sandbox
   PLATFORM_FEE_PERCENTAGE=10
   ```

3. **Test data:**
   - A confirmed booking in the database
   - Provider with verified Plaid bank account
   - Client user account

## Test Scenarios

### Test 1: Create Payment Intent (Platform Fee Only)

**Endpoint:** `POST /api/payments/create-intent`

**Request:**
```json
{
  "bookingId": "your_booking_id"
}
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_xxx_secret_xxx",
    "paymentId": "payment_id",
    "amount": 132.00,        // Total client pays
    "providerAmount": 120.00, // Goes to provider via Plaid
    "platformFee": 12.00,    // Goes to Alyne via Stripe
    "requiresPlaidPayment": true
  }
}
```

**Verification:**
- ✅ `platformFee` matches expected 10% of service price
- ✅ `providerAmount` equals service price
- ✅ `amount` = `providerAmount` + `platformFee`
- ✅ `requiresPlaidPayment` is `true`
- ✅ Payment intent amount in Stripe should be `platformFee` only (12.00, not 132.00)

### Test 2: Verify Stripe Payment Intent Amount

**Check Stripe Dashboard or API:**
- Payment intent should be for $12.00 (platform fee only)
- NOT $132.00 (total amount)

**Stripe API Check:**
```bash
curl https://api.stripe.com/v1/payment_intents/pi_xxx \
  -u sk_test_xxx:
```

**Expected:**
- `amount: 1200` (12.00 in cents)
- `metadata.platformFee: "12"`
- `metadata.providerAmount: "120"`

### Test 3: Provider Plaid Link Token

**Endpoint:** `GET /api/plaid/link-token`

**Headers:**
```
Authorization: Bearer <provider_jwt_token>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "linkToken": "link-sandbox-xxx"
  }
}
```

**Verification:**
- ✅ Link token is returned
- ✅ Can be used with Plaid Link to connect provider's bank account

### Test 4: Client Payment Link Token

**Endpoint:** `GET /api/plaid/payment-link-token?bookingId=xxx`

**Headers:**
```
Authorization: Bearer <client_jwt_token>
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "linkToken": "link-sandbox-xxx"
  }
}
```

**Verification:**
- ✅ Link token is returned
- ✅ Can be used with Plaid Link for payment initiation

### Test 5: Payment Confirmation Flow

**Step 1: Confirm Stripe Payment (Platform Fee)**
**Endpoint:** `POST /api/payments/confirm`

**Request:**
```json
{
  "bookingId": "your_booking_id",
  "paymentIntentId": "pi_xxx"
}
```

**Expected:**
- ✅ Payment record updated with `status: 'completed'`
- ✅ Only platform fee ($12) is in your Stripe account
- ✅ Provider amount ($120) is NOT transferred yet (waiting for Plaid payment)

**Step 2: Initiate Plaid Payment (Provider Amount)**
- This will be handled by frontend Plaid Link integration
- Client authorizes $120 payment to provider's bank account
- Payment goes directly via Plaid RTP (instant)

## Manual Testing Steps

### 1. Get a Test Booking ID

```powershell
# Connect to your database and get a confirmed booking ID
# Or use Prisma Studio:
pnpm exec prisma studio
```

### 2. Test Payment Intent Creation

```powershell
# Update the test script with your booking ID
cd backend
.\test-payment-flow.ps1
```

### 3. Verify in Stripe Dashboard

1. Go to Stripe Dashboard → Payments
2. Look for the payment intent you just created
3. **Verify:** Amount should be $12.00 (platform fee only)
4. **Verify:** NOT $132.00 (total amount)

### 4. Test Plaid Integration

1. Use Plaid Link in sandbox mode
2. Test provider bank account linking
3. Test client payment authorization

## Expected Behavior

### ✅ What Should Happen:
- Payment intent created for platform fee only ($12)
- Stripe dashboard shows only $12 payments
- Provider receives $120 via Plaid (instant with RTP)
- No $132 collection in your account

### ❌ What Should NOT Happen:
- Payment intent for full amount ($132)
- $132 showing in Stripe dashboard
- Provider amount going through your account

## Troubleshooting

### Issue: Payment intent is for full amount
**Solution:** Check that `calculatePaymentAmounts()` is correct and payment intent uses `platformFee` only

### Issue: Provider bank account not verified
**Solution:** Ensure provider has completed Plaid Link and bank account is verified

### Issue: Plaid link token fails
**Solution:** Check Plaid credentials in `.env` and ensure `PLAID_ENV` is set correctly

### Issue: Payment confirmation fails
**Solution:** Verify payment intent status is `succeeded` in Stripe before confirming

## Next Steps After Testing

1. ✅ Verify Stripe only shows platform fee amounts
2. ✅ Test Plaid Link for providers
3. ✅ Test Plaid Payment Initiation for clients
4. ✅ Implement frontend dual payment UI
5. ✅ Test end-to-end payment flow

