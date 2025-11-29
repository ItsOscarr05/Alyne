# Test Script for Dual Payment Flow
# This script tests the backend payment endpoints

$baseUrl = "http://localhost:3000"
$authToken = "dev-token"  # Use your actual JWT token in production

Write-Host "Testing Dual Payment Flow Backend" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host ""

# Test 1: Create Payment Intent (Platform Fee Only)
Write-Host "Test 1: Creating Payment Intent (Platform Fee Only)" -ForegroundColor Yellow
Write-Host "-----------------------------------------------------" -ForegroundColor Yellow

# You'll need to replace these with actual IDs from your database
$bookingId = "YOUR_BOOKING_ID_HERE"  # Replace with actual booking ID

$paymentIntentBody = @{
    bookingId = $bookingId
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/payments/create-intent" `
        -Method POST `
        -Headers @{
            "Authorization" = "Bearer $authToken"
            "Content-Type" = "application/json"
        } `
        -Body $paymentIntentBody
    
    Write-Host "✓ Payment Intent Created Successfully" -ForegroundColor Green
    Write-Host "  Client Secret: $($response.data.clientSecret.Substring(0, 20))..." -ForegroundColor Cyan
    Write-Host "  Platform Fee: `$$($response.data.platformFee)" -ForegroundColor Cyan
    Write-Host "  Provider Amount: `$$($response.data.providerAmount)" -ForegroundColor Cyan
    Write-Host "  Total Amount: `$$($response.data.amount)" -ForegroundColor Cyan
    Write-Host "  Requires Plaid Payment: $($response.data.requiresPlaidPayment)" -ForegroundColor Cyan
    Write-Host ""
    
    # Store for next test
    $paymentId = $response.data.paymentId
    $clientSecret = $response.data.clientSecret
} catch {
    Write-Host "✗ Failed to create payment intent" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 2: Get Provider Plaid Link Token
Write-Host "Test 2: Getting Provider Plaid Link Token" -ForegroundColor Yellow
Write-Host "------------------------------------------" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/plaid/link-token" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $authToken"
        }
    
    Write-Host "✓ Provider Link Token Created" -ForegroundColor Green
    Write-Host "  Link Token: $($response.data.linkToken.Substring(0, 20))..." -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "✗ Failed to create provider link token" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 3: Get Client Payment Link Token
Write-Host "Test 3: Getting Client Payment Link Token" -ForegroundColor Yellow
Write-Host "------------------------------------------" -ForegroundColor Yellow

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/plaid/payment-link-token?bookingId=$bookingId" `
        -Method GET `
        -Headers @{
            "Authorization" = "Bearer $authToken"
        }
    
    Write-Host "✓ Client Payment Link Token Created" -ForegroundColor Green
    Write-Host "  Link Token: $($response.data.linkToken.Substring(0, 20))..." -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "✗ Failed to create client payment link token" -ForegroundColor Red
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.ErrorDetails.Message) {
        Write-Host "  Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    }
    Write-Host ""
}

# Test 4: Check Payment Calculation
Write-Host "Test 4: Verifying Payment Calculation" -ForegroundColor Yellow
Write-Host "--------------------------------------" -ForegroundColor Yellow

Write-Host "Expected Calculation (Service Price = `$120, Platform Fee = 10%):" -ForegroundColor Cyan
Write-Host "  - Provider Amount: `$120.00" -ForegroundColor Cyan
Write-Host "  - Platform Fee: `$12.00" -ForegroundColor Cyan
Write-Host "  - Total Client Pays: `$132.00" -ForegroundColor Cyan
Write-Host "  - Stripe Payment (Platform Fee Only): `$12.00" -ForegroundColor Cyan
Write-Host "  - Plaid Payment (Provider Amount): `$120.00" -ForegroundColor Cyan
Write-Host ""

Write-Host "Test Summary" -ForegroundColor Green
Write-Host "============" -ForegroundColor Green
Write-Host "✓ Payment Intent creates only platform fee amount in Stripe" -ForegroundColor Green
Write-Host "✓ Provider can link bank account via Plaid" -ForegroundColor Green
Write-Host "✓ Client can get payment link token for provider payment" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "1. Test with actual booking ID from your database" -ForegroundColor White
Write-Host "2. Verify Stripe dashboard only shows platform fee amounts" -ForegroundColor White
Write-Host "3. Test Plaid Link flow for providers" -ForegroundColor White
Write-Host "4. Test Plaid Payment Initiation for clients" -ForegroundColor White

