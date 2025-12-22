# Plaid Test Payments Setup Guide

## Overview

This guide will help you set up Plaid test payments using Plaid's sandbox environment. Plaid sandbox allows you to test bank account linking and payment flows without using real bank accounts.

## Step 1: Create a Plaid Account

1. **Sign up for Plaid:**
   - Go to [https://dashboard.plaid.com/signup](https://dashboard.plaid.com/signup)
   - Create a free account (no credit card required for sandbox)

2. **Verify your email** and complete the onboarding process

## Step 2: Get Your Sandbox Credentials

1. **Log into Plaid Dashboard:**
   - Go to [https://dashboard.plaid.com](https://dashboard.plaid.com)

2. **Navigate to Team Settings:**
   - Click on your team name in the top right
   - Select "Team Settings"
   - Go to "Keys" tab

3. **Copy Your Credentials:**
   - **Client ID**: Found in the "Keys" section
   - **Sandbox Secret**: Click "Show" next to "Sandbox Secret" and copy it
   - ⚠️ **Important**: Make sure you're copying the **Sandbox** secret, not Development or Production

## Step 3: Configure Environment Variables

### Backend Configuration

Add these to your `backend/.env` file:

```env
# Plaid Configuration
PLAID_CLIENT_ID=your_client_id_here
PLAID_SECRET=your_sandbox_secret_here
PLAID_ENV=sandbox
```

**Example:**

```env
PLAID_CLIENT_ID=5f8a9b2c3d4e5f6a7b8c9d0e
PLAID_SECRET=abc123def456ghi789jkl012mno345pqr678stu901vwx234yz
PLAID_ENV=sandbox
```

### Mobile Configuration (if needed)

Add to your `mobile/.env` file:

```env
PLAID_CLIENT_ID=your_client_id_here
PLAID_ENV=sandbox
```

**Note:** The mobile app doesn't need the secret key (it's only used server-side).

## Step 4: Restart Your Backend Server

After updating `.env` files:

```powershell
# Stop the server (Ctrl+C)
# Then restart
cd backend
pnpm run dev
```

## Step 5: Test Plaid Sandbox Bank Accounts

Plaid Sandbox provides pre-configured test bank accounts. You don't need real bank accounts to test!

### Test Credentials for Plaid Link

When using Plaid Link in sandbox mode, you can use these test credentials:

#### Standard Test Bank (Recommended)

- **Username**: `user_good`
- **Password**: `pass_good`
- **Institution**: Any bank (e.g., "First Platypus Bank", "Bank of America", etc.)

#### Other Test Accounts

**Success Cases:**

- `user_good` / `pass_good` - Normal successful connection
- `user_custom` / `pass_good` - Custom account with multiple accounts

**Error Cases (for testing error handling):**

- `user_locked` / `pass_good` - Account locked
- `user_bad_credentials` / `pass_bad` - Invalid credentials
- `user_mfa` / `pass_good` - Requires MFA (multi-factor authentication)

### Test Bank Account Details

When you connect with `user_good` / `pass_good`, you'll get:

- **Account Type**: Checking or Savings
- **Account Number**: Test account numbers (masked)
- **Routing Number**: Test routing numbers
- **Balance**: Various test balances

## Step 6: Test Provider Bank Account Setup

### 1. Login as a Provider

```powershell
# Use one of the test provider accounts
Email: yoga@alyne.com
Password: provider123
```

### 2. Navigate to Provider Settings

- Go to Profile tab
- Find "Bank Account" or "Payout Settings" section
- Click "Connect Bank Account" or similar

### 3. Use Plaid Link

1. The app will open Plaid Link
2. Search for a bank (e.g., "First Platypus Bank")
3. Enter test credentials:
   - **Username**: `user_good`
   - **Password**: `pass_good`
4. Select an account
5. Complete the flow

### 4. Verify Bank Account

After connecting:

- The bank account should be marked as "verified"
- Account details should be saved
- Provider can now receive payments

## Step 7: Test Payment Flow

### Test Client Payment (Payment Initiation)

1. **Create a booking** as a client
2. **Go to payment checkout**
3. **When prompted for Plaid payment:**
   - Use test credentials: `user_good` / `pass_good`
   - Select a test account
   - Complete the payment

### Test Provider Payout (Transfer)

After a client pays:

1. The system automatically processes a transfer to the provider
2. In sandbox mode, this is simulated
3. Check the payment record in the database for `plaidTransferId`

## Step 8: Verify Setup

### Test Plaid Connection

You can test if Plaid is configured correctly by checking the backend logs when:

- A provider tries to link a bank account
- A client initiates a payment

**Expected Log Messages:**

```
Plaid link token created successfully
Plaid public token exchanged successfully
Plaid transfer created: $X.XX to provider...
```

### Common Issues

#### Issue: "Invalid client_id or secret"

**Solution:**

- Double-check your `PLAID_CLIENT_ID` and `PLAID_SECRET` in `.env`
- Make sure you're using the **Sandbox** secret, not Development or Production
- Restart the backend server after changing `.env`

#### Issue: "Plaid Link fails to load"

**Solution:**

- Check that `PLAID_ENV=sandbox` is set correctly
- Verify `PLAID_CLIENT_ID` is set in mobile `.env` (if using mobile app)
- Check browser console for errors

#### Issue: "Bank account not verified"

**Solution:**

- Ensure the provider completed the full Plaid Link flow
- Check that `bankAccountVerified` is `true` in the database
- Verify `plaidAccessToken` and `plaidAccountId` are saved

#### Issue: "Transfer fails"

**Solution:**

- Verify provider has a verified bank account
- Check that `plaidAccessToken` is valid
- Ensure you're using sandbox environment (not production)
- Check backend logs for detailed error messages

## Step 9: Test Different Scenarios

### Test Successful Payment

1. Provider links bank account with `user_good` / `pass_good`
2. Client creates booking
3. Client pays using `user_good` / `pass_good`
4. ✅ Payment should succeed

### Test MFA (Multi-Factor Authentication)

1. Use `user_mfa` / `pass_good` when linking
2. Plaid will prompt for MFA code
3. Use test code: `1234` (or any 4 digits)
4. ✅ Should complete successfully

### Test Error Handling

1. Try `user_bad_credentials` / `pass_bad`
2. Should show appropriate error message
3. ✅ Error should be handled gracefully

## Step 10: Monitor in Plaid Dashboard

1. **Go to Plaid Dashboard:**
   - [https://dashboard.plaid.com](https://dashboard.plaid.com)

2. **View Activity:**
   - Go to "Activity" or "Logs" section
   - See all API calls made to Plaid
   - Debug any issues

3. **Check Link Sessions:**
   - View Plaid Link sessions
   - See which users connected accounts
   - Debug connection issues

## Environment Variables Summary

### Backend `.env`

```env
PLAID_CLIENT_ID=your_client_id
PLAID_SECRET=your_sandbox_secret
PLAID_ENV=sandbox
```

### Mobile `.env`

```env
PLAID_CLIENT_ID=your_client_id
PLAID_ENV=sandbox
```

## Next Steps

Once sandbox testing is working:

1. ✅ Test provider bank account linking
2. ✅ Test client payment initiation
3. ✅ Test provider payout transfers
4. ✅ Test error scenarios
5. ✅ Test MFA flows

## Moving to Production

When ready for production:

1. **Request Production Access:**
   - Go to Plaid Dashboard
   - Request production access (requires approval)
   - Complete Plaid's verification process

2. **Update Environment Variables:**

   ```env
   PLAID_ENV=production
   PLAID_SECRET=your_production_secret  # Different from sandbox!
   ```

3. **Use Real Bank Accounts:**
   - Production requires real bank accounts
   - Users will connect their actual bank accounts
   - Real money will be transferred

## Additional Resources

- **Plaid Sandbox Documentation:** [https://plaid.com/docs/sandbox/](https://plaid.com/docs/sandbox/)
- **Plaid Test Credentials:** [https://plaid.com/docs/sandbox/test-credentials/](https://plaid.com/docs/sandbox/test-credentials/)
- **Plaid API Reference:** [https://plaid.com/docs/api/](https://plaid.com/docs/api/)
- **Plaid Dashboard:** [https://dashboard.plaid.com](https://dashboard.plaid.com)

---

**Last Updated:** December 2024
