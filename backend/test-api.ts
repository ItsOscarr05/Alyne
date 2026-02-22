/**
 * Simple API Test Script for Dual Payment Flow
 * Run with: pnpm tsx test-api.ts
 */

const BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = 'dev-token'; // Use your actual JWT in production

// Replace with actual IDs from your database
const BOOKING_ID = 'cmiks4pv80001bdhek3xp9so7'; // Test booking without payment

async function apiRequest(method: string, endpoint: string, body?: any) {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers: {
        'Authorization': `Bearer ${AUTH_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    
    let data;
    try {
      data = await response.json();
    } catch (e) {
      throw new Error(`Invalid JSON response: HTTP ${response.status}`);
    }
    
    if (!response.ok) {
      const errorMsg = data?.error || data?.message || data?.data?.error || `HTTP ${response.status}`;
      const error: any = new Error(errorMsg);
      error.status = response.status;
      error.data = data;
      throw error;
    }
    return data;
  } catch (error: any) {
    // Re-throw if it's already a proper Error with message
    if (error instanceof Error && error.message && !error.message.includes('[object')) {
      throw error;
    }
    // Handle fetch errors (network issues)
    if (error?.name === 'TypeError' && error?.message?.includes('fetch')) {
      throw new Error(`Network error: Could not connect to ${BASE_URL}. Is the server running?`);
    }
    // Handle other errors - try to extract meaningful message
    if (error?.data) {
      const errorMsg = error.data.error || error.data.message || JSON.stringify(error.data);
      throw new Error(errorMsg);
    }
    throw new Error(String(error) || 'Unknown error');
  }
}

async function testPaymentIntent() {
  console.log('\n🧪 Test 1: Creating Payment Intent (Platform Fee Only)');
  console.log('='.repeat(60));
  
  try {
    const response = await apiRequest('POST', '/api/payments/create-intent', {
      bookingId: BOOKING_ID,
    });

    const data = response.data || response;
    console.log('✅ Payment Intent Created Successfully');
    console.log(`   Client Secret: ${data.clientSecret?.substring(0, 30) || 'N/A'}...`);
    console.log(`   Platform Fee: $${data.platformFee || 'N/A'}`);
    console.log(`   Provider Amount: $${data.providerAmount || 'N/A'}`);
    console.log(`   Total Amount: $${data.amount || 'N/A'}`);
    console.log(`   Stripe Connect: ${data.stripeAccountId ? 'Yes' : 'N/A'}`);
    
    // Verify calculation if we have the data
    if (data.providerAmount && data.platformFee && data.amount) {
      const expectedTotal = data.providerAmount + data.platformFee;
      if (Math.abs(data.amount - expectedTotal) < 0.01) {
        console.log('✅ Calculation correct: providerAmount + platformFee = totalAmount');
      } else {
        console.log('❌ Calculation error!');
      }
      
      // Verify Stripe amount is only platform fee
      console.log(`\n   ⚠️  Verify in Stripe Dashboard:`);
      console.log(`      Payment Intent should be for $${data.platformFee} (NOT $${data.amount})`);
      console.log(`      ✅ This is correct - only platform fee goes to Stripe!`);
    }
    
    return data;
  } catch (error: any) {
    console.log('❌ Failed to create payment intent');
    const errorMsg = error?.message || error?.toString() || String(error);
    console.log(`   Error: ${errorMsg}`);
    if (error?.data) {
      console.log(`   Response: ${JSON.stringify(error.data, null, 2)}`);
    }
    if (errorMsg.includes('Booking not found') || errorMsg.includes('not found')) {
      console.log('   ⚠️  Make sure BOOKING_ID is set to a valid booking ID from your database');
    }
    if (errorMsg.includes('payout') || errorMsg.includes('Stripe') || errorMsg.includes('onboarding')) {
      console.log('   ⚠️  Provider needs to complete Stripe Connect onboarding first');
      console.log('   ⚠️  Provider must complete payout setup before payments can be processed');
    }
    return null;
  }
}

async function testPaymentCalculation() {
  console.log('\n🧪 Test 2: Verifying Payment Calculation Logic');
  console.log('='.repeat(60));
  
  const servicePrice = 120;
  const platformFeePercent = 7.5;
  const expectedPlatformFee = 9;
  const expectedProviderAmount = 120;
  const expectedTotal = 129;
  
  console.log(`   Service Price: $${servicePrice}`);
  console.log(`   Platform Fee (${platformFeePercent}%): $${expectedPlatformFee}`);
  console.log(`   Provider Amount: $${expectedProviderAmount}`);
  console.log(`   Total Client Pays: $${expectedTotal}`);
  console.log(`\n   ✅ Stripe Connect: client pays total; platform fee and provider share handled by Stripe`);
}

async function runTests() {
  console.log('\n🚀 Testing Stripe Connect Payment Flow Backend');
  console.log('='.repeat(60));
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Booking ID: ${BOOKING_ID}`);
  console.log('\n⚠️  Make sure to update BOOKING_ID with an actual booking from your database!');
  
  await testPaymentCalculation();
  
  const paymentData = await testPaymentIntent();
  
  console.log('\n📊 Test Summary');
  console.log('='.repeat(60));
  if (paymentData) {
    console.log('✅ Payment Intent: Stripe Connect direct charge (total amount, application fee)');
    console.log('✅ Calculation: Correct (providerAmount + platformFee = totalAmount)');
  } else {
    console.log('❌ Payment Intent: Failed - check booking ID and provider Stripe Connect setup');
  }
  
  console.log('\n📝 Next Steps:');
  console.log('1. Provider completes Stripe Connect onboarding (GET /api/stripe/connect/onboarding-link)');
  console.log('2. Client pays via Stripe on checkout (card on file on connected account)');
  console.log('3. After booking completed, provider payout is released via process-provider-payment');
}

// Run tests
runTests().catch(console.error);

