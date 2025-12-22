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

- [ ] Login as client
- [ ] Navigate to Discover tab
- [ ] Verify provider cards display
- [ ] Verify each card shows:
  - Provider name
  - Profile photo (or placeholder)
  - Rating (or "No reviews yet")
  - Price range or "Starting at $X"
  - Specialty tags
- [ ] Verify cards are tappable

**Test D1.2: Location-Based Discovery**

- [ ] Grant location permissions
- [ ] Verify providers sorted by distance
- [ ] Verify distance displayed (if applicable)
- [ ] Test with location denied
- [ ] Verify fallback behavior works

**Test D1.3: Search Functionality**

- [ ] Enter search query (e.g., "yoga")
- [ ] Verify results filter correctly
- [ ] Clear search
- [ ] Verify all providers show again
- [ ] Test with partial matches
- [ ] Test with special characters
- [ ] Test with empty search

**Test D1.4: Filter Functionality**

- [ ] Apply service type filter
- [ ] Apply price range filter
- [ ] Apply rating filter
- [ ] Apply multiple filters simultaneously
- [ ] Clear filters
- [ ] Verify filter state persists

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

- [ ] Verify availability slots are displayed
- [ ] Verify slots have blue outline
- [ ] Verify slot sizes are appropriate
- [ ] Verify slots show correct times
- [ ] Verify slots are formatted correctly

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

- [ ] Verify calendar displays correctly
- [ ] Select a date
- [ ] Verify time slots appear
- [ ] Select a time slot
- [ ] Verify selection is saved
- [ ] Test with past dates (should be disabled)
- [ ] Test with unavailable dates

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

- [ ] Login as provider
- [ ] Navigate to Bookings tab
- [ ] Go to "Pending" tab
- [ ] Verify pending booking displays
- [ ] Click "Accept" button
- [ ] Verify booking status changes to "Confirmed"
- [ ] Verify booking moves to "Upcoming" tab
- [ ] Verify client sees update in real-time

**Test B2.2: Provider Decline Booking**

- [ ] Login as provider
- [ ] Navigate to pending booking
- [ ] Click "Decline" button
- [ ] Verify booking status changes to "Declined"
- [ ] Verify booking moves to "Declined" tab
- [ ] Verify client sees update in real-time

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

- [ ] Open bookings page as client
- [ ] Have provider accept/decline booking in another session
- [ ] Verify booking status updates automatically
- [ ] Verify booking moves to correct tab automatically
- [ ] Verify no page refresh needed

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

- [ ] Navigate to payment for confirmed booking
- [ ] Verify PaymentCheckoutModal opens
- [ ] Verify modal styling (blue outline, fade animation)
- [ ] Verify booking summary displays correctly
- [ ] Verify payment breakdown shows:
  - Service Price
  - Platform Fee (Alyne)
  - Total Amount Due
- [ ] Verify payment breakdown card shows:
  - Platform Fee (Stripe): $X.XX
  - Provider Payment (Plaid): $X.XX

**Test P1.2: Payment Amounts Calculation**

- [ ] Verify platform fee is calculated correctly (e.g., 10% or configured percentage)
- [ ] Verify provider amount equals service price
- [ ] Verify total = provider amount + platform fee
- [ ] Test with different service prices
- [ ] Verify amounts display with 2 decimal places

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

- [ ] Use declined card: `4000 0000 0000 0002`
- [ ] Verify error message displays
- [ ] Verify payment form remains accessible
- [ ] Verify user can retry payment

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

- [ ] Complete payment successfully
- [ ] Verify ReceiptModal opens
- [ ] Verify receipt shows:
  - Booking details
  - Payment breakdown
  - Transaction IDs
  - Payment dates
  - Total amounts
- [ ] Verify receipt is printable/exportable (if applicable)

**Test P4.2: Payment History**

- [ ] Navigate to payment history (if available)
- [ ] Verify completed payments display
- [ ] Verify payment details are accurate
- [ ] Verify payments are sortable/filterable

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

- [ ] Open payment modal for multiple bookings
- [ ] Attempt to pay simultaneously
- [ ] Verify only one payment processes at a time
- [ ] Verify proper error handling

---

## Real-Time Messaging

### Test Suite M1: Conversation List

**Test M1.1: Conversation Display**

- [ ] Navigate to Messages tab
- [ ] Verify conversations list displays
- [ ] Verify each conversation shows:
  - Other user's name
  - Last message preview
  - Timestamp
  - Unread count badge (if applicable)
  - Provider badge (if applicable)
- [ ] Verify empty state displays when no conversations

**Test M1.2: Conversation Navigation**

- [ ] Click on a conversation
- [ ] Verify chat screen opens
- [ ] Verify back button works
- [ ] Verify conversation list refreshes on return

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

- [ ] Open new conversation (no messages)
- [ ] Verify empty state displays
- [ ] Verify "Start the conversation" message shows
- [ ] Send first message
- [ ] Verify empty state disappears

### Test Suite M3: Starting New Conversations

**Test M3.1: Message from Booking Card**

- [ ] Navigate to Bookings tab
- [ ] Find a booking card
- [ ] Click message button (chat bubble icon)
- [ ] Verify chat screen opens
- [ ] Verify correct user is selected
- [ ] Verify can send message

**Test M3.2: Message from Provider Detail**

- [ ] Open provider detail modal
- [ ] Click "Message" button
- [ ] Verify modal closes
- [ ] Verify chat screen opens
- [ ] Verify correct provider is selected

**Test M3.3: Message from Booking Detail**

- [ ] Open booking detail page
- [ ] Click "Message" button in Provider/Client section
- [ ] Verify chat screen opens
- [ ] Verify correct user is selected

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

- [ ] Submit a review
- [ ] Navigate to provider profile
- [ ] Go to Reviews tab
- [ ] Verify review displays:
  - Star rating
  - Comment text
  - Reviewer name (or "Anonymous")
  - Review date
- [ ] Verify review appears in correct order

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

- [ ] Complete profile information:
  - First name, last name
  - Bio/description
  - Profile photo upload
  - Specialty tags
- [ ] Verify each step validates correctly
- [ ] Verify can navigate back/forward

**Test O1.3: Services Setup**

- [ ] Add services
- [ ] Set prices for each service
- [ ] Set durations
- [ ] Add service descriptions
- [ ] Verify services save correctly
- [ ] Verify can edit/delete services

**Test O1.4: Credentials Setup**

- [ ] Add certifications/licenses
- [ ] Upload credential documents (if applicable)
- [ ] Verify credentials save
- [ ] Verify credentials display on profile

**Test O1.5: Availability Setup**

- [ ] Set availability calendar
- [ ] Select available time slots
- [ ] Set recurring availability
- [ ] Verify availability saves
- [ ] Verify availability displays correctly

**Test O1.6: Bank Account Setup (Plaid)**

- [ ] Navigate to bank account setup
- [ ] Click "Connect Bank Account"
- [ ] Verify Plaid Link opens
- [ ] Use test credentials: `user_good` / `pass_good`
- [ ] Complete Plaid flow
- [ ] Verify bank account connects
- [ ] Verify account is marked as verified
- [ ] Verify account details display correctly

**Test O1.7: Onboarding Completion**

- [ ] Complete all onboarding steps
- [ ] Submit onboarding
- [ ] Verify profile goes live
- [ ] Verify redirect to provider dashboard
- [ ] Verify profile appears in discovery

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

- [ ] Open bookings page
- [ ] Have another user change booking status
- [ ] Verify booking updates in real-time
- [ ] Verify no page refresh needed
- [ ] Verify updates are instant

**Test RT1.3: Message Updates**

- [ ] Open messages/conversation
- [ ] Have another user send message
- [ ] Verify message appears in real-time
- [ ] Verify unread counts update
- [ ] Verify conversation list updates

**Test RT1.4: Payment Updates**

- [ ] Complete payment
- [ ] Verify payment status updates in real-time
- [ ] Verify booking reflects payment status
- [ ] Verify provider sees payment update

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
