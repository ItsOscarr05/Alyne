# Production-Ready Manual Testing Suite

**Last Updated:** December 2024  
**Version:** 1.0  
**Status:** Comprehensive Testing Guide

---

## Table of Contents

1. [Pre-Testing Setup](#pre-testing-setup)
2. [Test Environment Configuration](#test-environment-configuration)
3. [Authentication & User Management](#authentication--user-management)
4. [Provider Discovery & Search](#provider-discovery--search)
5. [Booking Management](#booking-management)
6. [Payment Processing](#payment-processing)
7. [Real-Time Messaging](#real-time-messaging)
8. [Reviews & Ratings](#reviews--ratings)
9. [Provider Onboarding](#provider-onboarding)
10. [Profile Management](#profile-management)
11. [Real-Time Updates](#real-time-updates)
12. [Error Handling & Edge Cases](#error-handling--edge-cases)
13. [Cross-Platform Testing](#cross-platform-testing)
14. [Security Testing](#security-testing)
15. [Performance Testing](#performance-testing)
16. [Accessibility Testing](#accessibility-testing)
17. [Regression Testing](#regression-testing)

---

## Pre-Testing Setup

### 1. Environment Preparation

**Backend Setup:**

```powershell
cd backend
pnpm install
pnpm run db:push  # Ensure database schema is up to date
pnpm run seed     # Seed test data
pnpm run dev      # Start backend server
```

**Expected:** Server running on `http://localhost:3000`

**Mobile Setup:**

```powershell
cd mobile
pnpm install
pnpm start
# Press 'w' for web, 'i' for iOS simulator, 'a' for Android emulator
```

**Expected:** App running on `http://localhost:8081` (web)

### 2. Test Data Verification

**Verify seeded data:**

- 3 test providers (yoga, massage, nutrition)
- 1 test client account
- Sample bookings (various statuses)
- Sample reviews
- Sample messages

### 3. Test Accounts

**Client Account:**

- Email: `test@alyne.com`
- Password: `test123` (or use "Dev Login" button)

**Provider Accounts:**

- Email: `yoga@alyne.com` | Password: `provider123`
- Email: `massage@alyne.com` | Password: `provider123`
- Email: `nutrition@alyne.com` | Password: `provider123`

**Admin/Test Accounts:**

- Use registration flow to create additional test accounts as needed

---

## Test Environment Configuration

### Required Environment Variables

**Backend `.env`:**

```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_SECRET=your_plaid_secret
PLAID_ENV=sandbox
REDIS_URL=redis://localhost:6379
```

**Mobile `.env`:**

```env
API_BASE_URL=http://localhost:3000/api
STRIPE_PUBLISHABLE_KEY=pk_test_...
PLAID_CLIENT_ID=your_plaid_client_id
PLAID_ENV=sandbox
```

### Third-Party Service Setup

**Stripe (Test Mode):**

- Use test API keys
- Test card: `4242 4242 4242 4242`
- Any future expiry date, any CVC

**Plaid (Sandbox):**

- Use sandbox credentials
- Test bank: Any bank
- Username: `user_good`
- Password: `pass_good`

---

## Authentication & User Management

### Test Suite A1: User Registration

**Test A1.1: Client Registration**

- [ ] Navigate to registration screen
- [ ] Select "I'm a Client"
- [ ] Enter valid email and password
- [ ] Submit registration
- [ ] Verify redirect to onboarding/profile setup
- [ ] Verify user can access app features

**Test A1.2: Provider Registration**

- [ ] Navigate to registration screen
- [ ] Select "I'm a Provider"
- [ ] Enter valid email and password
- [ ] Submit registration
- [ ] Verify redirect to provider onboarding flow
- [ ] Verify user type is set correctly

**Test A1.3: Registration Validation**

- [ ] Attempt registration with invalid email format
- [ ] Attempt registration with weak password
- [ ] Attempt registration with existing email
- [ ] Verify appropriate error messages display
- [ ] Verify form prevents submission on invalid data

**Test A1.4: Registration Edge Cases**

- [ ] Test with very long email addresses
- [ ] Test with special characters in password
- [ ] Test with empty fields
- [ ] Test with whitespace-only fields
- [ ] Verify proper sanitization and validation

### Test Suite A2: User Login

**Test A2.1: Successful Login**

- [ ] Navigate to login screen
- [ ] Enter valid credentials
- [ ] Submit login
- [ ] Verify redirect to appropriate home screen
- [ ] Verify authentication state persists on refresh

**Test A2.2: Login Validation**

- [ ] Attempt login with incorrect password
- [ ] Attempt login with non-existent email
- [ ] Attempt login with empty fields
- [ ] Verify error messages display correctly
- [ ] Verify form prevents submission on invalid data

**Test A2.3: Dev Login (Development Only)**

- [ ] Use "Dev Login" button if available
- [ ] Verify quick login functionality
- [ ] Verify appropriate user type is set
- [ ] Verify this only works in development mode

**Test A2.4: Session Management**

- [ ] Login successfully
- [ ] Close and reopen app
- [ ] Verify user remains logged in
- [ ] Verify token refresh works correctly
- [ ] Test logout functionality

### Test Suite A3: Password Management

**Test A3.1: Password Reset Flow**

- [ ] Navigate to "Forgot Password"
- [ ] Enter registered email
- [ ] Verify reset email sent (check logs/email service)
- [ ] Click reset link
- [ ] Enter new password
- [ ] Verify password updated
- [ ] Verify can login with new password

**Test A3.2: Password Change**

- [ ] Login to account
- [ ] Navigate to settings/profile
- [ ] Access "Change Password"
- [ ] Enter current password
- [ ] Enter new password
- [ ] Verify password updated
- [ ] Verify can login with new password

---

## Provider Discovery & Search

### Test Suite D1: Provider Discovery

**Test D1.1: Basic Discovery**

- [x] Login as client
- [x] Navigate to Discover tab
- [x] Verify provider cards display
- [x] Verify each card shows:
  - Provider name
  - Profile photo (or placeholder)
  - Rating (or "No reviews yet")
  - Price range or "Starting at $X"
  - Specialty tags
- [x] Verify cards are tappable

**Test D1.2: Location-Based Discovery**

- [x] Grant location permissions
- [x] Verify providers sorted by distance
- [x] Verify distance displayed (if applicable)
- [x] Test with location denied
- [x] Verify fallback behavior works

**Test D1.3: Search Functionality**

- [x] Enter search query (e.g., "yoga")
- [x] Verify results filter correctly
- [x] Clear search
- [x] Verify all providers show again
- [x] Test with partial matches
- [x] Test with special characters
- [x] Test with empty search

**Test D1.4: Filter Functionality**

- [x] Apply service type filter
- [x] Apply price range filter
- [x] Apply rating filter
- [x] Apply multiple filters simultaneously
- [x] Clear filters
- [x] Verify filter state persists

### Test Suite D2: Provider Detail Modal

**Test D2.1: Modal Display**

- [ ] Click on provider card
- [ ] Verify modal opens with fade animation
- [ ] Verify modal has blue outline
- [ ] Verify close button works
- [ ] Verify tap outside modal closes it
- [ ] Verify modal size is appropriate

**Test D2.2: Provider Information**

- [ ] Verify About tab displays:
  - Provider name
  - Bio text
  - Specialty tags
  - Availability slots (with blue outline)
  - Credentials (if available)
- [ ] Verify Services tab displays:
  - Service names
  - Service prices
  - Service durations
  - Service descriptions
- [ ] Verify Reviews tab displays:
  - Review ratings
  - Review comments
  - Reviewer names
  - Review dates

**Test D2.3: Modal Interactions**

- [ ] Test tab switching (About/Services/Reviews)
- [ ] Test scrolling within modal
- [ ] Test "Book Session" button
- [ ] Test "Message" button (if visible)
- [ ] Verify modal doesn't close on internal interactions

**Test D2.4: Availability Display**

- [x] Verify availability slots are displayed
- [x] Verify slots have blue outline
- [x] Verify slot sizes are appropriate
- [x] Verify slots show correct times
- [x] Verify slots are formatted correctly (12-hour format)
- [x] Verify unavailable days are removed from display

---

## Booking Management

### Test Suite B1: Booking Creation

**Test B1.1: Booking Creation Flow**

- [ ] Click "Book Session" on provider detail modal
- [ ] Verify CreateBookingModal opens
- [ ] Verify modal matches ProviderDetailModal styling
- [ ] Verify back button in header works
- [ ] Select a service (verify grid layout)
- [ ] Select date from calendar
- [ ] Select time slot
- [ ] Add notes (optional)
- [ ] Submit booking
- [ ] Verify booking created successfully
- [ ] Verify redirect/close behavior

**Test B1.2: Service Selection**

- [ ] Verify services displayed in 2-column grid
- [ ] Verify each service card shows:
  - Service name
  - Price
  - Duration
- [ ] Select a service
- [ ] Verify selection is highlighted
- [ ] Change selection
- [ ] Verify previous selection clears

**Test B1.3: Date & Time Selection**

- [x] Verify calendar displays correctly
- [x] Select a date
- [x] Verify time slots appear (dynamically generated based on provider availability)
- [x] Verify time slots displayed in 12-hour format
- [x] Select a time slot
- [x] Verify selection is saved
- [x] Test with past dates (should be disabled)
- [x] Test with unavailable dates
- [x] Verify time slots only show for days provider is available

**Test B1.4: Booking Validation**

- [ ] Attempt to create booking without service
- [ ] Attempt to create booking without date
- [ ] Attempt to create booking without time
- [ ] Verify appropriate error messages
- [ ] Verify form prevents submission

**Test B1.5: Booking Confirmation**

- [ ] Complete booking creation
- [ ] Verify success message/notification
- [ ] Verify booking appears in "Pending" tab
- [ ] Verify booking details are correct
- [ ] Verify provider receives notification (check logs)

### Test Suite B2: Booking Status Management

**Test B2.1: Provider Accept Booking**

- [x] Login as provider
- [x] Navigate to Bookings tab
- [x] Go to "Pending" tab
- [x] Verify pending booking displays
- [x] Click "Accept" button
- [x] Verify booking status changes to "Confirmed"
- [x] Verify booking moves to "Upcoming" tab
- [x] Verify client sees update in real-time (no refresh needed)

**Test B2.2: Provider Decline Booking**

- [x] Login as provider
- [x] Navigate to pending booking
- [x] Click "Decline" button
- [x] Verify booking status changes to "Declined"
- [x] Verify booking moves to "Declined" tab
- [x] Verify client sees update in real-time (no refresh needed)

**Test B2.3: Provider Complete Booking**

- [ ] Login as provider
- [ ] Navigate to "Upcoming" tab
- [ ] Find confirmed booking
- [ ] Click "Complete" button
- [ ] Verify booking status changes to "Completed"
- [ ] Verify booking moves to "Past" tab
- [ ] Verify client can now review

**Test B2.4: Client Cancel Booking**

- [ ] Login as client
- [ ] Navigate to "Upcoming" tab
- [ ] Find confirmed booking
- [ ] Click "Cancel" button (if available)
- [ ] Verify booking status changes to "Cancelled"
- [ ] Verify provider sees update

### Test Suite B3: Booking Display

**Test B3.1: Booking Cards**

- [ ] Verify booking cards display correctly
- [ ] Verify cards show:
  - Provider name and photo
  - Service name
  - Date and time
  - Status badge (with correct color)
  - Price
  - Location (if available)
- [ ] Verify status colors:
  - Pending: Orange/Yellow
  - Confirmed: Purple
  - Completed: Green
  - Declined/Cancelled: Red

**Test B3.2: Booking Tabs**

- [ ] Verify tabs display: Pending, Upcoming, Past, Declined
- [ ] Switch between tabs
- [ ] Verify correct bookings show in each tab
- [ ] Verify tab animations work
- [ ] Verify pagination works (if applicable)

**Test B3.3: Booking Options Menu**

- [ ] Navigate to "Past" or "Declined" tab
- [ ] Verify options button (3 dots) appears
- [ ] Click options button
- [ ] Verify modal appears at bottom with fade animation
- [ ] Verify modal has red outline
- [ ] Verify "Remove from History" option displays
- [ ] Click "Remove from History"
- [ ] Verify booking is hidden
- [ ] Verify booking no longer appears in list

**Test B3.4: Reviewed Status**

- [ ] Complete a booking as provider
- [ ] Login as client
- [ ] Navigate to "Past" tab
- [ ] Verify "Write a Review" button appears
- [ ] Write and submit review
- [ ] Verify button changes to "Reviewed" with:
  - Yellow background
  - Bright yellow outline
  - Filled star icon
  - "Reviewed" text

### Test Suite B4: Real-Time Booking Updates

**Test B4.1: Status Update Real-Time**

- [x] Open bookings page as client
- [x] Have provider accept/decline booking in another session
- [x] Verify booking status updates automatically
- [x] Verify booking moves to correct tab automatically
- [x] Verify no page refresh needed

**Test B4.2: New Booking Real-Time**

- [ ] Have client create booking
- [ ] Verify provider sees new booking in "Pending" tab immediately
- [ ] Verify no refresh needed

**Test B4.3: Payment Status Updates**

- [ ] Complete payment for booking
- [ ] Verify payment status updates in real-time
- [ ] Verify booking card reflects payment status

---

## Payment Processing

### Test Suite P1: Payment Intent Creation

**Test P1.1: Payment Intent Initialization**

- [x] Navigate to payment for confirmed booking
- [x] Verify PaymentCheckoutModal opens
- [x] Verify modal styling (blue outline, fade animation)
- [x] Verify booking summary displays correctly
- [x] Verify times displayed in 12-hour format
- [x] Verify payment breakdown shows:
  - Service Price
  - Platform Fee (Alyne)
  - Total Amount Due
- [x] Verify payment breakdown card shows:
  - Platform Fee (Stripe): $X.XX
  - Provider Payment (Plaid): $X.XX

**Test P1.2: Payment Amounts Calculation**

- [x] Verify platform fee is calculated correctly (7.5%)
- [x] Verify provider amount equals service price
- [x] Verify total = provider amount + platform fee
- [x] Test with different service prices
- [x] Verify amounts display with 2 decimal places

### Test Suite P2: Stripe Payment (Platform Fee)

**Test P2.1: Stripe Payment Form (Web)**

- [ ] Verify Stripe Elements form loads
- [ ] Enter test card: `4242 4242 4242 4242`
- [ ] Enter future expiry date
- [ ] Enter any CVC
- [ ] Submit payment
- [ ] Verify platform fee payment processes
- [ ] Verify success feedback

**Test P2.2: Stripe Payment Sheet (Native)**

- [ ] Test on iOS/Android device/simulator
- [ ] Verify Stripe payment sheet opens
- [ ] Complete payment
- [ ] Verify platform fee payment processes
- [ ] Verify success feedback

**Test P2.3: Stripe Payment Errors**

- [x] Use declined card: `4000 0000 0000 0002`
- [x] Verify error message displays (in AlertModal, not native alert)
- [x] Verify payment form remains accessible
- [x] Verify user can retry payment
- [x] Verify buttons reset from loading state after error

### Test Suite P3: Plaid Payment (Provider Amount)

**Test P3.1: Plaid Link Initialization**

- [ ] After Stripe payment succeeds, verify Plaid Link button appears
- [ ] Click "Pay Provider" button
- [ ] Verify Plaid Link modal opens
- [ ] Verify Plaid script loads correctly
- [ ] Verify no console errors

**Test P3.2: Plaid Payment Flow**

- [ ] In Plaid Link, search for bank (e.g., "First Platypus Bank")
- [ ] Enter test credentials:
  - Username: `user_good`
  - Password: `pass_good`
- [ ] Select account
- [ ] Complete Plaid flow
- [ ] Verify payment processes
- [ ] Verify success feedback

**Test P3.3: Plaid Payment Errors**

- [ ] Use invalid credentials: `user_bad_credentials` / `pass_bad`
- [ ] Verify error message displays
- [ ] Verify user can retry
- [ ] Test with locked account: `user_locked` / `pass_good`
- [ ] Verify appropriate error handling

**Test P3.4: Simultaneous Payment Flow**

- [ ] Click "Pay Now" button
- [ ] Verify both Stripe and Plaid payments initiate
- [ ] Complete Stripe payment
- [ ] Complete Plaid payment
- [ ] Verify both payments complete
- [ ] Verify success message shows
- [ ] Verify receipt modal opens

### Test Suite P4: Payment Receipt

**Test P4.1: Receipt Display**

- [x] Complete payment successfully
- [x] Verify ReceiptModal opens (as modal, not separate screen)
- [x] Verify receipt shows:
  - Booking details
  - Payment breakdown
  - Transaction IDs
  - Payment dates
  - Total amounts
  - Times in 12-hour format
- [ ] Verify receipt is printable/exportable (if applicable)

**Test P4.2: Payment History**

- [x] Navigate to payment history (if available)
- [x] Verify completed payments display
- [x] Verify payment details are accurate
- [x] Verify payments are sortable/filterable
- [x] Verify filter buttons work even when no entries match
- [x] Verify times displayed in 12-hour format

### Test Suite P5: Payment Edge Cases

**Test P5.1: Payment for Different Booking Statuses**

- [ ] Attempt payment for pending booking (should fail)
- [ ] Attempt payment for declined booking (should fail)
- [ ] Attempt payment for completed booking (should show already paid)
- [ ] Verify only confirmed bookings can be paid

**Test P5.2: Payment Retry**

- [ ] Fail a payment intentionally
- [ ] Verify user can retry payment
- [ ] Verify no duplicate charges occur
- [ ] Verify payment state is correct

**Test P5.3: Concurrent Payments**

- [x] Open payment modal for a booking
- [x] Attempt to open payment modal for another booking while first is processing
- [x] Verify error message displays: "Payment Already in Progress"
- [x] Verify only one payment can be processed at a time
- [x] Verify payment state is properly managed globally
- [x] Complete first payment
- [x] Verify can now open payment modal for another booking
- [x] Verify proper error handling for concurrent attempts

---

## Real-Time Messaging

### Test Suite M1: Conversation List

**Test M1.1: Conversation Display**

- [x] Navigate to Messages tab
- [x] Verify conversations list displays
- [x] Verify search bar appears at the top
- [x] Verify each conversation shows:
  - Other user's name
  - Last message preview
  - Timestamp
  - Unread count badge (if applicable)
  - Provider badge (if applicable)
- [x] Verify empty state displays when no conversations

**Test M1.2: Conversation Navigation**

- [x] Click on a conversation
- [x] Verify chat screen opens
- [x] Verify header is fixed at the top of the screen
- [x] Verify header shows:
  - Back button
  - User avatar and name
  - Online/Offline status
- [x] Scroll through messages
- [x] Verify header remains fixed at top
- [x] Verify back button works
- [x] Verify conversation list refreshes on return

**Test M1.2.1: Conversation Search**

- [x] Navigate to Messages tab
- [x] Type in search bar (e.g., provider name)
- [x] Verify conversations filter in real-time
- [x] Verify non-matching conversations collapse with smooth animation
- [x] Verify matching conversations expand with smooth animation
- [x] Clear search
- [x] Verify all conversations expand back smoothly
- [x] Verify search works with:
  - First name
  - Last name
  - Full name
  - Case-insensitive matching
- [x] Verify empty state shows when no matches found

**Test M1.3: Real-Time Conversation Updates**

- [ ] Have another user send a message
- [ ] Verify conversation appears/updates in real-time
- [ ] Verify unread count updates
- [ ] Verify last message preview updates

### Test Suite M2: Chat Functionality

**Test M2.1: Sending Messages**

- [ ] Open a conversation
- [ ] Type a message
- [ ] Click send button
- [ ] Verify message appears immediately (optimistic update)
- [ ] Verify message shows "SENT" status
- [ ] Verify message persists after refresh

**Test M2.2: Receiving Messages**

- [ ] Have another user send a message
- [ ] Verify message appears in real-time
- [ ] Verify message shows correct sender
- [ ] Verify timestamp is correct
- [ ] Verify messages are ordered correctly

**Test M2.3: Message Status**

- [ ] Send a message
- [ ] Verify status updates: SENT → DELIVERED → READ
- [ ] Verify status updates in real-time
- [ ] Verify read receipts work

**Test M2.4: Message History**

- [ ] Open conversation with message history
- [ ] Verify messages load correctly
- [ ] Verify pagination works (if applicable)
- [ ] Verify scroll to bottom works
- [ ] Verify message ordering is correct

**Test M2.5: Empty Chat State**

- [x] Open new conversation (no messages)
- [x] Verify header is fixed at top of screen
- [x] Verify empty state displays
- [x] Verify "Start the conversation" message shows
- [x] Send first message
- [x] Verify empty state disappears
- [x] Verify header remains fixed while scrolling through messages

### Test Suite M3: Starting New Conversations

**Test M3.1: Message from Booking Card**

- [x] Login as provider
- [x] Navigate to Bookings tab
- [x] Find a booking card
- [x] Verify message button (chat bubble icon) appears for providers
- [x] Click message button
- [x] Verify chat screen opens
- [x] Verify correct user is selected
- [x] Verify can send message
- [x] Login as client
- [x] Navigate to Bookings tab
- [x] Verify message button does NOT appear on booking cards
- [x] Verify clients cannot message from booking cards

**Test M3.2: Message from Provider Detail**

- [x] Login as client
- [x] Open provider detail modal (from Discover screen)
- [x] Verify "Message" button appears in footer
- [x] Click "Message" button
- [x] Verify modal closes
- [x] Verify chat screen opens
- [x] Verify correct provider is selected
- [x] Verify this is the ONLY way clients can start new conversations
- [x] Verify clients cannot start conversations from booking cards or booking detail screens

**Test M3.3: Message from Booking Detail**

- [x] Login as provider
- [x] Open booking detail page
- [x] Verify "Message" button appears in Provider/Client section
- [x] Click "Message" button
- [x] Verify chat screen opens
- [x] Verify correct user is selected
- [x] Login as client
- [x] Open booking detail page
- [x] Verify "Message" button does NOT appear for clients
- [x] Verify clients cannot message from booking detail screen

**Test M3.4: New Conversation Creation**

- [ ] Start conversation from any entry point
- [ ] Send first message
- [ ] Verify conversation appears in Messages tab
- [ ] Verify conversation persists

---

## Reviews & Ratings

### Test Suite R1: Review Submission

**Test R1.1: Review Modal Display**

- [ ] Complete a booking as provider
- [ ] Login as client
- [ ] Navigate to "Past" tab
- [ ] Click "Write a Review" button
- [ ] Verify SubmitReviewModal opens
- [ ] Verify modal styling (blue outline, fade animation)
- [ ] Verify modal shows:
  - Provider name
  - Service name
  - Booking date
  - Star rating selector
  - Comment text area

**Test R1.2: Review Submission**

- [ ] Select star rating (1-5)
- [ ] Enter review comment
- [ ] Submit review
- [ ] Verify review saves successfully
- [ ] Verify modal closes
- [ ] Verify "Reviewed" button appears on booking card
- [ ] Verify review appears on provider profile

**Test R1.3: Review Validation**

- [ ] Attempt to submit without rating
- [ ] Attempt to submit with invalid data
- [ ] Verify appropriate error messages
- [ ] Verify form prevents submission

**Test R1.4: Review Display on Profile**

- [x] Submit a review
- [x] Navigate to provider profile
- [x] Go to Reviews tab
- [x] Verify review displays:
  - Star rating
  - Comment text
  - Reviewer name (or "Anonymous")
  - Review date
- [x] Verify review appears in correct order
- [x] Verify provider rating updates in real-time after review submission
- [x] Verify review count updates in real-time

### Test Suite R2: Review Editing

**Test R2.1: Edit Review Modal**

- [ ] Navigate to provider profile
- [ ] Find your review
- [ ] Click "Edit" button (if available)
- [ ] Verify EditReviewModal opens
- [ ] Verify existing review data is pre-filled
- [ ] Modify rating and/or comment
- [ ] Submit changes
- [ ] Verify review updates
- [ ] Verify updated review displays correctly

**Test R2.2: Review Deletion**

- [ ] Navigate to your review
- [ ] Click "Delete" button (if available)
- [ ] Confirm deletion
- [ ] Verify review is removed
- [ ] Verify "Write a Review" button appears again on booking

---

## Provider Onboarding

### Test Suite O1: Provider Onboarding Flow

**Test O1.1: Onboarding Start**

- [ ] Register as new provider
- [ ] Verify redirect to onboarding flow
- [ ] Verify onboarding steps are clear
- [ ] Verify progress indicator (if available)

**Test O1.2: Profile Setup**

- [x] Complete profile information:
  - First name, last name (collected during registration, not in onboarding)
  - Bio/description ✅
  - Profile photo upload ✅
  - Specialty tags ✅
- [x] Verify each step validates correctly (bio is required) ✅
- [x] Verify can navigate back/forward (back button in header) ✅

**Test O1.3: Services Setup**

- [x] Add services ✅
- [x] Set prices for each service ✅
- [x] Set durations ✅
- [x] Add service descriptions ✅
- [x] Verify services save correctly ✅
- [x] Verify can delete services ✅
- [ ] Verify can edit services (can add/remove, but editing existing services not implemented in onboarding - can be done in profile settings)

**Test O1.4: Credentials Setup**

- [x] Add certifications/licenses ✅
- [ ] Upload credential documents (documentUrl field exists in schema but UI not implemented - can be added later)
- [x] Verify credentials save ✅
- [x] Verify credentials display on profile (credentials are stored and can be displayed) ✅

**Test O1.5: Availability Setup**

- [x] Set availability calendar (day selection) ✅
- [x] Select available time slots ✅
- [x] Set recurring availability (defaults to recurring) ✅
- [x] Verify availability saves ✅
- [x] Verify availability displays correctly (stored in database) ✅

**Test O1.6: Bank Account Setup (Plaid)**

- [x] Navigate to bank account setup ✅
- [x] Click "Connect Bank Account" ✅
- [x] Verify Plaid Link opens ✅
- [x] Use test credentials: `user_good` / `pass_good` (Plaid sandbox credentials)
- [x] Complete Plaid flow ✅
- [x] Verify bank account connects ✅
- [x] Verify account is marked as verified (bankAccountVerified flag) ✅
- [x] Verify account details display correctly ✅

**Test O1.7: Onboarding Completion**

- [x] Complete all onboarding steps ✅
- [x] Submit onboarding ✅
- [x] Verify profile goes live (isActive defaults to true) ✅
- [ ] Verify redirect to provider dashboard (currently redirects to profile - should redirect to dashboard)
- [x] Verify profile appears in discovery (if isActive is true, appears in discovery) ✅

---

## Profile Management

### Test Suite PR1: Profile Viewing

**Test PR1.1: Client Profile**

- [ ] Navigate to Profile tab
- [ ] Verify profile displays:
  - Name
  - Email
  - Profile photo
  - User type
- [ ] Verify edit button is available

**Test PR1.2: Provider Profile**

- [ ] Login as provider
- [ ] Navigate to Profile tab
- [ ] Verify profile displays:
  - Name
  - Bio
  - Services
  - Credentials
  - Bank account status
- [ ] Verify edit options are available

### Test Suite PR2: Profile Editing

**Test PR2.1: Edit Basic Information**

- [ ] Navigate to profile settings
- [ ] Edit name
- [ ] Edit bio (for providers)
- [ ] Upload new profile photo
- [ ] Save changes
- [ ] Verify changes persist
- [ ] Verify changes reflect across app

**Test PR2.2: Edit Services**

- [ ] Navigate to services management
- [ ] Add new service
- [ ] Edit existing service
- [ ] Delete service
- [ ] Verify changes save
- [ ] Verify changes reflect on profile

**Test PR2.3: Change Password**

- [ ] Navigate to security settings
- [ ] Enter current password
- [ ] Enter new password
- [ ] Confirm new password
- [ ] Save changes
- [ ] Verify password updates
- [ ] Verify can login with new password

---

## Real-Time Updates

### Test Suite RT1: Socket Connection

**Test RT1.1: Connection Status**

- [ ] Open app
- [ ] Verify Socket.io connects
- [ ] Check browser console for connection logs
- [ ] Verify connection status indicator (if available)
- [ ] Test reconnection after disconnect

**Test RT1.2: Booking Updates**

- [x] Open bookings page
- [x] Have another user change booking status
- [x] Verify booking updates in real-time
- [x] Verify no page refresh needed
- [x] Verify updates are instant
- [x] Verify bookings move between tabs automatically (Pending → Upcoming)

**Test RT1.3: Message Updates**

- [x] Open messages/conversation
- [x] Have another user send message
- [x] Verify message appears in real-time
- [x] Verify unread counts update
- [x] Verify conversation list updates

**Test RT1.4: Payment Updates**

- [x] Complete payment
- [x] Verify payment status updates in real-time
- [x] Verify booking reflects payment status
- [x] Verify provider sees payment update

---

## Error Handling & Edge Cases

### Test Suite E1: Network Errors

**Test E1.1: Offline Handling**

- [ ] Disconnect network
- [ ] Attempt to load data
- [ ] Verify appropriate error message
- [ ] Verify app doesn't crash
- [ ] Reconnect network
- [ ] Verify app recovers gracefully

**Test E1.2: Slow Network**

- [ ] Throttle network (slow 3G)
- [ ] Test loading screens display
- [ ] Test timeout handling
- [ ] Verify user can retry failed requests

**Test E1.3: API Errors**

- [ ] Simulate 500 server error
- [ ] Simulate 404 not found
- [ ] Simulate 401 unauthorized
- [ ] Verify appropriate error messages
- [ ] Verify user-friendly error handling

### Test Suite E2: Input Validation

**Test E2.1: Form Validation**

- [ ] Test all forms with invalid input
- [ ] Test with empty fields
- [ ] Test with special characters
- [ ] Test with SQL injection attempts
- [ ] Test with XSS attempts
- [ ] Verify proper sanitization

**Test E2.2: Edge Case Inputs**

- [ ] Very long text inputs
- [ ] Special characters in names
- [ ] Unicode characters
- [ ] Emoji in text fields
- [ ] Verify proper handling

### Test Suite E3: State Management

**Test E3.1: Concurrent Actions**

- [ ] Open multiple modals simultaneously
- [ ] Perform actions rapidly
- [ ] Verify state doesn't conflict
- [ ] Verify proper cleanup

**Test E3.2: Navigation Edge Cases**

- [ ] Navigate rapidly between screens
- [ ] Press back button multiple times
- [ ] Test deep linking
- [ ] Test navigation state persistence

---

## Cross-Platform Testing

### Test Suite C1: Web Platform

**Test C1.1: Browser Compatibility**

- [ ] Test on Chrome
- [ ] Test on Firefox
- [ ] Test on Safari
- [ ] Test on Edge
- [ ] Verify consistent behavior
- [ ] Verify responsive design works

**Test C1.2: Web-Specific Features**

- [ ] Verify Stripe Elements work
- [ ] Verify Plaid Link works
- [ ] Verify WebSocket connections
- [ ] Verify local storage works

### Test Suite C2: Mobile Platforms

**Test C2.1: iOS Testing**

- [ ] Test on iOS simulator
- [ ] Test on physical iOS device
- [ ] Verify native payment sheet works
- [ ] Verify push notifications (if implemented)
- [ ] Verify app permissions work

**Test C2.2: Android Testing**

- [ ] Test on Android emulator
- [ ] Test on physical Android device
- [ ] Verify native payment sheet works
- [ ] Verify app permissions work
- [ ] Verify different screen sizes

---

## Security Testing

### Test Suite S1: Authentication Security

**Test S1.1: Token Security**

- [ ] Verify tokens stored securely
- [ ] Verify tokens expire correctly
- [ ] Verify refresh token flow works
- [ ] Test token tampering (should fail)
- [ ] Test expired token handling

**Test S1.2: Authorization**

- [ ] Attempt to access other user's data
- [ ] Attempt to modify other user's bookings
- [ ] Attempt to access admin endpoints
- [ ] Verify proper 403/401 responses

**Test S1.3: Input Sanitization**

- [ ] Test SQL injection attempts
- [ ] Test XSS attempts
- [ ] Test command injection
- [ ] Verify proper sanitization

### Test Suite S2: Payment Security

**Test S2.1: Payment Data**

- [ ] Verify payment data never stored
- [ ] Verify PCI compliance
- [ ] Verify secure API communication (HTTPS)
- [ ] Test payment amount tampering (should fail)

**Test S2.2: Plaid Security**

- [ ] Verify Plaid tokens stored securely
- [ ] Verify Plaid credentials never exposed
- [ ] Test Plaid token expiration handling

---

## Performance Testing

### Test Suite PER1: Load Times

**Test PER1.1: Initial Load**

- [ ] Measure app startup time
- [ ] Measure time to first contentful paint
- [ ] Verify loads within acceptable time (< 3 seconds)
- [ ] Test with slow network

**Test PER1.2: Screen Transitions**

- [ ] Measure navigation time
- [ ] Measure modal open time
- [ ] Verify smooth animations
- [ ] Verify no janky transitions

**Test PER1.3: Data Loading**

- [ ] Measure provider list load time
- [ ] Measure booking list load time
- [ ] Measure message history load time
- [ ] Verify loading indicators show

### Test Suite PER2: Resource Usage

**Test PER2.1: Memory Usage**

- [ ] Monitor memory usage
- [ ] Test with many open modals
- [ ] Test with long conversation history
- [ ] Verify no memory leaks

**Test PER2.2: Network Usage**

- [ ] Monitor API calls
- [ ] Verify efficient data fetching
- [ ] Verify proper caching
- [ ] Test with limited bandwidth

---

## Accessibility Testing

### Test Suite A11Y1: Screen Reader Support

**Test A11Y1.1: VoiceOver (iOS)**

- [ ] Enable VoiceOver
- [ ] Navigate through app
- [ ] Verify all elements are readable
- [ ] Verify proper labels
- [ ] Verify navigation order

**Test A11Y1.2: TalkBack (Android)**

- [ ] Enable TalkBack
- [ ] Navigate through app
- [ ] Verify all elements are readable
- [ ] Verify proper labels

### Test Suite A11Y2: Visual Accessibility

**Test A11Y2.1: Color Contrast**

- [ ] Verify sufficient color contrast
- [ ] Test with color blindness simulators
- [ ] Verify information not conveyed by color alone

**Test A11Y2.2: Text Sizing**

- [ ] Test with large text sizes
- [ ] Verify text remains readable
- [ ] Verify layout doesn't break

---

## Regression Testing

### Test Suite REG1: Critical Paths

**Test REG1.1: End-to-End Booking Flow**

- [ ] Discover provider
- [ ] View provider profile
- [ ] Create booking
- [ ] Provider accepts
- [ ] Client pays
- [ ] Provider completes
- [ ] Client reviews
- [ ] Verify entire flow works

**Test REG1.2: End-to-End Payment Flow**

- [ ] Create booking
- [ ] Provider accepts
- [ ] Navigate to payment
- [ ] Complete Stripe payment
- [ ] Complete Plaid payment
- [ ] View receipt
- [ ] Verify payment recorded

**Test REG1.3: End-to-End Messaging Flow**

- [ ] Start conversation from booking
- [ ] Send messages
- [ ] Receive messages
- [ ] Verify real-time updates
- [ ] Verify message persistence

---

## Test Execution Checklist

### Pre-Release Testing

Before releasing to production, ensure:

- [ ] All critical paths tested (Test Suite REG1)
- [ ] All payment flows tested (Test Suite P1-P5)
- [ ] All real-time features tested (Test Suite RT1)
- [ ] Cross-platform testing complete (Test Suite C1-C2)
- [ ] Security testing complete (Test Suite S1-S2)
- [ ] Performance acceptable (Test Suite PER1-PER2)
- [ ] No critical bugs found
- [ ] Error handling verified (Test Suite E1-E3)
- [ ] Accessibility tested (Test Suite A11Y1-A11Y2)

### Test Results Documentation

For each test:

- [ ] Document test result (Pass/Fail)
- [ ] Document any bugs found
- [ ] Document browser/device used
- [ ] Document test date/time
- [ ] Document tester name

### Bug Reporting Template

When reporting bugs, include:

- **Test Case ID:** (e.g., B1.1)
- **Severity:** Critical/High/Medium/Low
- **Steps to Reproduce:** Detailed steps
- **Expected Result:** What should happen
- **Actual Result:** What actually happened
- **Screenshots/Logs:** If applicable
- **Browser/Device:** Environment details
- **Date/Time:** When bug occurred

---

## Test Automation Recommendations

While this is a manual testing suite, consider automating:

1. **Critical Path Tests** (REG1) - Run on every commit
2. **Payment Flow Tests** (P1-P5) - Run before releases
3. **Authentication Tests** (A1-A3) - Run on every build
4. **API Integration Tests** - Test backend endpoints
5. **E2E Tests** - Use Playwright or Cypress for web

---

**Last Updated:** December 2025  
**Maintained By:** Development Team  
**Next Review:** Before each major release
