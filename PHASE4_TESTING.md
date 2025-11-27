# Phase 4 Testing Checklist - Reviews & Ratings

## Pre-Testing Setup

### 1. Ensure Backend Server is Running
```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne\backend"
pnpm run dev
```
**Expected:** Server running on `http://localhost:3000`

### 2. Ensure Database Migration is Applied
```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne\backend"
pnpm migrate
```
**Expected:** Migration `20251127053650_add_review_flagging` is applied

### 3. Start Mobile App
```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne\mobile"
pnpm start
```
Then press `w` for web

**Note:** For testing reviews, you'll need at least one completed booking. See "Test Data Setup" section below for instructions on creating completed bookings.

---

## Test Accounts

**Client Account:**
- Email: `test@alyne.com` (or use dev login)
- Password: `test123`
- User Type: `CLIENT`

**Provider Accounts:**
- Email: `yoga@alyne.com` | Password: `provider123`
- Email: `massage@alyne.com` | Password: `provider123`
- Email: `nutrition@alyne.com` | Password: `provider123`

---

## Test 4.1: Review Submission - Basic Flow

### Steps:
1. Login as a client (`test@alyne.com` or use dev login)
2. Navigate to **Bookings** tab
3. Find a booking with status **COMPLETED**
4. Verify **"Write a Review"** button appears on the completed booking
5. Tap **"Write a Review"** button
6. Verify review submission screen opens
7. Select a rating (1-5 stars) by tapping stars
8. Optionally add a comment
9. Tap **"Submit Review"** button
10. Verify success message appears
11. Navigate back to bookings
12. Verify booking now shows **"Reviewed"** badge

### Expected Results:
- ✅ Review button appears on completed bookings
- ✅ Review submission screen loads correctly
- ✅ Star rating selection works (1-5 stars)
- ✅ Comment field accepts text (optional, max 500 chars)
- ✅ Character count displays correctly
- ✅ Submit button is disabled until rating is selected
- ✅ Review submits successfully
- ✅ Success message appears
- ✅ Booking shows "Reviewed" badge after submission
- ✅ Cannot submit duplicate reviews for same booking

### Common Issues:
- Review button not appearing → Check booking status is COMPLETED
- Cannot submit review → Check API endpoint `/reviews/submit`
- Duplicate review error → Check review uniqueness constraint
- Rating not saving → Check rating validation (1-5)

---

## Test 4.2: Review Display on Provider Profile

### Steps:
1. Login as a client
2. Navigate to **Discover** tab
3. Tap on a provider card (e.g., "Sarah Johnson")
4. Verify provider detail screen opens
5. Check **Reviews** tab
6. Verify reviews are displayed (if any exist)
7. Check each review shows:
   - Reviewer name (initials in avatar)
   - Star rating
   - Comment (if provided)
   - Date
8. If no reviews exist, verify "No reviews yet" message appears

### Expected Results:
- ✅ Reviews tab is visible on provider profile
- ✅ Reviews are displayed in chronological order (newest first)
- ✅ Each review shows:
   - Reviewer's name and avatar
   - Star rating (1-5 stars)
   - Comment text (if provided)
   - Review date
- ✅ Empty state shows "No reviews yet" when no reviews exist
- ✅ Reviews are only visible if `isVisible: true` and `isFlagged: false`

### Common Issues:
- Reviews not showing → Check review query filters
- Wrong review order → Check sorting by `createdAt desc`
- Reviews from wrong provider → Check `providerId` filter

---

## Test 4.3: Rating Aggregation

### Steps:
1. Navigate to a provider profile
2. Check provider header shows:
   - Average rating (e.g., "4.5")
   - Review count (e.g., "(12 reviews)")
   - Star display matching average rating
3. Submit a new review with a 5-star rating
4. Refresh provider profile
5. Verify average rating updates
6. Verify review count increases

### Expected Results:
- ✅ Average rating displays correctly (rounded to 1 decimal)
- ✅ Review count is accurate
- ✅ Star display matches average rating (full/half/empty stars)
- ✅ Rating updates after new review submission
- ✅ Review count increments correctly
- ✅ Only visible, non-flagged reviews are counted

### Common Issues:
- Wrong average rating → Check calculation logic
- Review count incorrect → Check review filtering
- Stars not matching rating → Check star rendering logic

---

## Test 4.4: Review Prompts After Completed Bookings

### Steps:
1. Login as a client
2. Navigate to **Bookings** tab
3. Find a booking with status **COMPLETED** that hasn't been reviewed
4. Verify **"Write a Review"** button is visible
5. Verify button is styled correctly (blue background, star icon)
6. Tap the button
7. Verify it navigates to review submission screen with correct booking/provider info
8. After submitting review, return to bookings
9. Verify **"Write a Review"** button is replaced with **"Reviewed"** badge

### Expected Results:
- ✅ Review button appears on completed bookings
- ✅ Button only shows for bookings without existing reviews
- ✅ Button navigates to review screen with correct params
- ✅ Button disappears after review is submitted
- ✅ "Reviewed" badge appears after submission
- ✅ Badge persists after app refresh

### Common Issues:
- Button not appearing → Check booking status and review existence
- Wrong booking/provider info → Check route params
- Badge not updating → Check review query on bookings screen

---

## Test 4.5: Review Validation

### Steps:
1. Navigate to review submission screen
2. Try to submit without selecting a rating
3. Verify error message appears
4. Select a rating
5. Try to submit with a very long comment (>500 chars)
6. Verify character limit is enforced
7. Submit a valid review
8. Try to submit another review for the same booking
9. Verify duplicate review error appears

### Expected Results:
- ✅ Cannot submit without rating (error message shown)
- ✅ Comment character limit enforced (500 chars max)
- ✅ Character counter displays correctly
- ✅ Cannot submit duplicate reviews
- ✅ Error messages are user-friendly
- ✅ Form validation works correctly

### Common Issues:
- No validation → Check form validation logic
- Character limit not enforced → Check maxLength on TextInput
- Duplicate reviews allowed → Check review uniqueness constraint

---

## Test 4.6: Review Flagging/Moderation

### Steps:
1. Navigate to a provider profile with reviews
2. Open **Reviews** tab
3. Find a review (not your own)
4. Verify flag button (flag icon) appears in top-right of review
5. Tap flag button
6. Verify confirmation dialog appears
7. Confirm flagging
8. Verify success message appears
9. Refresh provider profile
10. Verify flagged review is no longer visible

### Expected Results:
- ✅ Flag button appears on all reviews (except your own)
- ✅ Flag button is visible and accessible
- ✅ Confirmation dialog appears before flagging
- ✅ Review is flagged successfully
- ✅ Flagged review is hidden from display (`isVisible: false`)
- ✅ Flagged review doesn't affect rating calculation
- ✅ Success message confirms flagging

### Common Issues:
- Flag button not appearing → Check user authentication and review ownership
- Review still visible after flagging → Check review query filters
- Rating still includes flagged review → Check rating calculation filter

---

## Test 4.7: Multiple Reviews

### Steps:
1. Submit multiple reviews for different providers
2. Verify each review is saved correctly
3. Check each provider's profile shows correct reviews
4. Verify reviews don't appear on wrong provider's profile
5. Submit multiple reviews from different clients for same provider
6. Verify all reviews appear on provider profile
7. Verify average rating calculates correctly from all reviews

### Expected Results:
- ✅ Each review is associated with correct provider
- ✅ Reviews don't appear on wrong provider profiles
- ✅ Multiple reviews display correctly
- ✅ Average rating calculates from all visible reviews
- ✅ Review count is accurate
- ✅ Reviews are sorted by date (newest first)

### Common Issues:
- Reviews on wrong profile → Check `providerId` association
- Wrong average rating → Check calculation includes all reviews
- Duplicate reviews → Check review uniqueness

---

## Test 4.8: Review Updates

### Steps:
1. Submit a review
2. Navigate back to review submission screen (if possible)
3. Try to edit the review
4. Verify review can be updated (if implemented)
5. Or verify review cannot be edited (if not implemented)

### Expected Results:
- ✅ Review is saved correctly
- ✅ Review can be updated (if feature exists)
- ✅ Or review is immutable after submission (if not implemented)

### Common Issues:
- Review not saving → Check API endpoint
- Update not working → Check update endpoint and permissions

---

## Test 4.9: Review Visibility & Database Persistence

### Steps:
1. Submit a review
2. Verify review appears on provider profile
3. Flag the review (as different user)
4. Verify review disappears from provider profile
5. Verify review doesn't affect rating calculation
6. **Verify flagged review still exists in database** (see verification script below)

### Database Verification:
Run the verification script to confirm flagged reviews persist:
```powershell
cd "C:\Users\oscar\Computer Science\Projects\Alyne\backend"
npx tsx verify-flagged-reviews.ts
```

**Expected Output:**
- ✅ Total reviews count includes flagged reviews
- ✅ Flagged reviews show `isFlagged: true`
- ✅ Flagged reviews show `isVisible: false`
- ✅ Review data (rating, comment, etc.) is preserved
- ✅ Flagged reviews are NOT deleted from database

### Expected Results:
- ✅ New reviews are visible by default
- ✅ Flagged reviews are hidden from display
- ✅ Flagged reviews don't affect ratings
- ✅ **Review data persists in database (NOT deleted)**
- ✅ Only visible, non-flagged reviews are shown
- ✅ Flagged reviews can be queried with `isFlagged: true`

### Implementation Verification:
The `flagReview` function uses `prisma.review.update()` which:
- ✅ Updates the record (does NOT delete)
- ✅ Sets `isFlagged: true`
- ✅ Sets `isVisible: false`
- ✅ Preserves all review data (rating, comment, dates, etc.)
- ✅ Stores optional `flagReason`

### Common Issues:
- Flagged reviews still visible → Check query filters (`isVisible: true, isFlagged: false`)
- Rating includes flagged reviews → Check rating calculation filter
- Reviews deleted instead of hidden → Should use `update()`, not `delete()`

---

## Test 4.10: Review API Endpoints

### Steps:
1. Test `POST /api/reviews/submit` endpoint
   - Submit valid review → Should return 201
   - Submit without rating → Should return 400
   - Submit without bookingId/providerId → Should return 400
   - Submit duplicate review → Should return 409 (or appropriate error)
   - Submit without authentication → Should return 401

2. Test `GET /api/reviews/booking/:bookingId` endpoint
   - Get existing review → Should return review with 200
   - Get non-existent review → Should return `{ success: true, data: null }` with 200
   - Access without authentication → Should return 401

3. Test `PUT /api/reviews/:id` endpoint (Edit Review)
   - Update existing review (as owner) → Should return 200
   - Update non-existent review → Should return 404
   - Update review as non-owner → Should return 403
   - Update without authentication → Should return 401
   - Update with invalid rating (< 1 or > 5) → Should return 400

4. Test `POST /api/reviews/:id/flag` endpoint
   - Flag existing review → Should return 200
   - Flag non-existent review → Should return 404
   - Flag without authentication → Should return 401
   - Flag with optional reason → Should save reason

5. Test Provider Reviews (via `GET /api/providers/:id`)
   - Get provider with reviews → Should return provider with reviews array
   - Reviews should be filtered (only visible, non-flagged)
   - Flagged reviews should NOT appear in response

### Expected Results:
- ✅ All endpoints return correct status codes
- ✅ `POST /reviews/submit` returns 201 on success
- ✅ `GET /reviews/booking/:bookingId` returns 200 (even if review doesn't exist)
- ✅ `PUT /reviews/:id` returns 200 on success, 403 if not owner
- ✅ `POST /reviews/:id/flag` returns 200 on success
- ✅ Validation errors return 400
- ✅ Authentication required for all endpoints (401 if not authenticated)
- ✅ Reviews are filtered correctly (visible, non-flagged only)
- ✅ Error messages are descriptive
- ✅ Flagged reviews persist in database but don't appear in responses

### API Endpoint Summary:
```
POST   /api/reviews/submit              - Submit new review
GET    /api/reviews/booking/:bookingId  - Get review by booking ID
PUT    /api/reviews/:id                 - Update existing review (owner only)
POST   /api/reviews/:id/flag            - Flag a review for moderation
GET    /api/providers/:id               - Get provider (includes filtered reviews)
```

### Common Issues:
- Endpoints not working → Check route registration in `backend/src/index.ts`
- Wrong status codes → Check error handling in controllers
- Authentication errors → Check `authenticate` middleware is applied
- Reviews not filtered → Check `isVisible: true, isFlagged: false` in queries
- Update fails → Check user owns the review (clientId matches userId)

---

## Success Criteria

Phase 4 is complete when:
- ✅ Clients can submit reviews after completed bookings
- ✅ Reviews display correctly on provider profiles
- ✅ Review prompts appear on completed bookings
- ✅ Rating aggregation works (average + count)
- ✅ Basic moderation works (flag button)
- ✅ Reviews are validated correctly
- ✅ Flagged reviews are hidden
- ✅ Multiple reviews work correctly
- ✅ Review visibility is correct
- ✅ All API endpoints work correctly

---

## Notes

- Reviews can only be submitted for bookings with status `COMPLETED`
- Each booking can only have one review
- Reviews are visible by default but can be flagged
- Flagged reviews are hidden but not deleted
- Average rating only includes visible, non-flagged reviews
- Review count only includes visible, non-flagged reviews
- For best testing, create multiple completed bookings first
- Test with both client and provider accounts
- Verify reviews persist after app refresh

---

## Test Data Setup

### Creating Completed Bookings for Testing

To test reviews, you need bookings with `COMPLETED` status. Here's how to create them:

#### Option 1: Using the UI (Recommended)

1. **Create a booking:**
   - Login as a client (`test@alyne.com`)
   - Navigate to **Discover** tab
   - Select a provider and create a booking
   - Booking will be in `PENDING` status

2. **Accept the booking:**
   - Login as the provider (e.g., `yoga@alyne.com`)
   - Navigate to **Bookings** tab
   - Find the pending booking
   - Click **"Accept"** button
   - Booking status changes to `CONFIRMED`

3. **Mark as completed:**
   - While logged in as the provider
   - Find the confirmed booking in **Bookings** tab
   - Click **"Mark as Completed"** button
   - Confirm the action
   - Booking status changes to `COMPLETED`

4. **Submit review:**
   - Login as the client
   - Navigate to **Bookings** tab
   - Find the completed booking in **Past** section
   - Click **"Write a Review"** button
   - Submit your review

#### Option 2: Quick Setup Script

You can also manually update bookings in the database if needed, but using the UI is recommended.

### Additional Test Data

1. **Submit test reviews:**
   - Login as client
   - Navigate to completed booking
   - Submit review with different ratings (1-5 stars)
   - Submit reviews with and without comments

2. **Test flagging:**
   - Login as different user (provider or another client)
   - Navigate to provider profile
   - Open **Reviews** tab
   - Click flag icon on a review
   - Verify it disappears

---

## Known Limitations (MVP)

- Provider cannot respond to reviews (future enhancement)
- No review editing after submission (future enhancement)
- No review deletion (only flagging)
- No admin moderation dashboard (manual review of flagged content)
- No review reporting categories (just basic flag)

