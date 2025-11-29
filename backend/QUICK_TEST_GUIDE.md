# Quick Test Guide - Dual Payment Flow

## Step 1: Get a Test Booking ID

### Option A: Using Prisma Studio (Easiest)
```powershell
cd backend
pnpm exec prisma studio
```
1. Open `http://localhost:5555` in your browser
2. Go to `Booking` table
3. Find a booking with `status: 'CONFIRMED'`
4. Copy the `id` field

### Option B: Using SQL Query
```sql
SELECT id, "clientId", "providerId", price, status 
FROM "Booking" 
WHERE status = 'CONFIRMED' 
LIMIT 1;
```

### Option C: Using Node REPL
```powershell
cd backend
node
```
```javascript
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.booking.findFirst({ where: { status: 'CONFIRMED' } }).then(b => console.log(b?.id));
```

## Step 2: Update Test Script

Edit `backend/test-api.ts`:
```typescript
const BOOKING_ID = 'paste_your_booking_id_here';
```

## Step 3: Run Tests

### Option A: TypeScript Test Script
```powershell
cd backend
pnpm tsx test-api.ts
```

### Option B: PowerShell Test Script
```powershell
cd backend
# First, edit test-payment-flow.ps1 and update BOOKING_ID
.\test-payment-flow.ps1
```

### Option C: Manual API Testing

**1. Create Payment Intent:**
```powershell
$body = @{
    bookingId = "your_booking_id"
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:3000/api/payments/create-intent" `
    -Method POST `
    -Headers @{
        "Authorization" = "Bearer dev-token"
        "Content-Type" = "application/json"
    } `
    -Body $body
```

**2. Check Stripe Dashboard:**
- Go to https://dashboard.stripe.com/test/payments
- Find the payment intent you just created
- **VERIFY:** Amount should be platform fee only (e.g., $12.00)
- **VERIFY:** NOT the total amount (e.g., NOT $132.00)

## Step 4: Verify Results

### ✅ Success Indicators:
1. Payment intent created successfully
2. Payment intent amount = platform fee only (e.g., $12.00)
3. Response includes `requiresPlaidPayment: true`
4. Response shows correct breakdown:
   - `platformFee`: $12.00
   - `providerAmount`: $120.00
   - `amount`: $132.00 (total)

### ❌ Failure Indicators:
1. Payment intent amount = total amount ($132.00) ❌
2. Error: "Provider has not set up a verified bank account" 
   - **Fix:** Provider needs to complete Plaid Link first
3. Error: "Booking not found"
   - **Fix:** Use a valid booking ID

## Step 5: Check Stripe Dashboard

**Critical Verification:**
1. Go to Stripe Dashboard → Payments
2. Find your test payment
3. **MUST SEE:** Amount = $12.00 (platform fee)
4. **MUST NOT SEE:** Amount = $132.00 (total)

If you see $132.00, the implementation is incorrect!

## Common Issues

### Issue: "Provider has not set up a verified bank account"
**Solution:** 
1. Provider needs to link bank account via Plaid first
2. Use the provider link token endpoint
3. Complete Plaid Link flow
4. Exchange public token

### Issue: Payment intent is for full amount
**Solution:** 
- Check `backend/src/services/payment.service.ts` line 97
- Should be: `amount: Math.round(platformFee * 100)`
- NOT: `amount: Math.round(totalAmount * 100)`

### Issue: Test script can't connect
**Solution:**
- Make sure backend server is running: `pnpm run dev`
- Check server is on port 3000
- Verify `BASE_URL` in test script

## Next Steps After Successful Test

1. ✅ Verify Stripe only shows platform fee
2. ✅ Test Plaid Link for providers
3. ✅ Test Plaid Payment Initiation for clients  
4. ✅ Implement frontend dual payment UI

