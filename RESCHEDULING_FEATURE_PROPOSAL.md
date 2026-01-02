# Rescheduling Feature Proposal

## Overview

Rescheduling is a critical feature that allows both clients and providers to change the date/time of existing bookings. This feature must handle various scenarios, maintain data integrity, notify all parties, and provide a smooth user experience.

---

## 1. User Flows & Who Can Reschedule

### 1.1 Client-Initiated Reschedule (ONLY)

- **Who**: **Only clients** can reschedule their own bookings
- **When**:
  - PENDING bookings (automatic - no approval needed)
  - CONFIRMED bookings (automatic - no approval needed)
  - Cannot reschedule COMPLETED, CANCELLED, or DECLINED bookings
- **Flow**: Client selects new date/time → System checks provider availability → If available, automatically updates booking → Notifies provider
- **Note**: Providers cannot reschedule bookings. They can only accept, decline, complete, or cancel bookings.

---

## 2. Business Rules & Constraints

### 2.1 Time Restrictions

- **Minimum notice**: Cannot reschedule less than X hours before appointment (e.g., 24 hours)
  - If within notice window, suggest cancellation instead
- **Maximum advance**: Can reschedule up to Y days in advance (e.g., 90 days)

### 2.2 Automatic System (No Approval)

- **Model**: Clients can reschedule automatically, assuming availability is checked
- **Flow**: Client selects new time → System validates provider availability → If available, booking updates immediately → Provider gets notified
- **No approval needed**: Since client is checking provider's availability before selecting, the reschedule is automatic
- **Provider notification**: Provider receives real-time notification of the reschedule

### 2.4 Availability Checks

- Must check provider availability for new time slot
- Consider service duration when checking (not just start time)
- Block conflicting bookings (same provider, overlapping time)
- Respect provider's availability slots (recurring + specific dates)

### 2.5 Payment Considerations

- **If already paid**: Rescheduling is free (no refund/charge)
- **If not paid yet**: Payment status unchanged
- **Refund policy**: Could add option to refund if rescheduling is provider-initiated and client can't make new time

---

## 3. Database Schema Changes

### 3.1 Option A: Minimal (Recommended for MVP)

Use existing `updateBooking` functionality. No schema changes needed.

- Just update `scheduledDate` and `scheduledTime` fields
- `updatedAt` timestamp tracks when rescheduled
- Could add optional `rescheduleReason` to notes field

### 3.2 Option B: With History Tracking (Future Enhancement)

Add `BookingReschedule` model for audit trail:

```prisma
model BookingReschedule {
  id              String   @id @default(cuid())
  bookingId       String
  previousDate    DateTime
  previousTime    String
  newDate         DateTime
  newTime         String
  rescheduledBy   String   // userId who initiated
  reason          String?  // Optional reason
  status          String   // "pending", "accepted", "rejected", "completed"
  requestedAt     DateTime @default(now())
  resolvedAt      DateTime?

  booking Booking @relation(fields: [bookingId], references: [id])

  @@index([bookingId])
}
```

For MVP, recommend **Option A** - keep it simple, add history later if needed.

---

## 4. API Design

### 4.1 Endpoint: `PATCH /api/bookings/:id/reschedule`

**Request Body:**

```typescript
{
  scheduledDate: string;  // ISO date string
  scheduledTime: string;  // "14:00" format
  reason?: string;        // Optional reason for rescheduling
}
```

**Response:**

```typescript
{
  success: true;
  data: BookingDetail; // Updated booking
}
```

**Business Logic:**

1. Verify user is the client for this booking (only clients can reschedule)
2. Verify booking status allows rescheduling (not COMPLETED/CANCELLED/DECLINED)
3. Check time restrictions (minimum notice, etc.)
4. Verify new time slot is available:
   - Check provider's availability slots
   - Check for conflicting bookings (same provider, overlapping time)
   - Consider service duration
5. If available, automatically update booking with new date/time
6. Emit real-time notification to provider
7. Optionally send email/push notification
8. Return updated booking

### 4.2 Alternative: Use existing `PATCH /api/bookings/:id`

- Add validation logic for rescheduling
- Check if `scheduledDate` or `scheduledTime` changed
- Apply rescheduling business rules

**Recommendation**: Create dedicated `/reschedule` endpoint for clarity and specific validation.

---

## 5. UI/UX Design

### 5.1 Where Reschedule Button Appears

**Booking Detail Screen** (`/booking/[id]`):

- Add "Reschedule" button in action area
- **Only visible to clients** (not providers)
- Show for PENDING and CONFIRMED bookings only
- Position near other action buttons (Pay Now, etc. for clients)

**Booking List (Card Actions)**:

- Could add reschedule option in booking card menu/options (client view only)
- Or keep it only in detail view for cleaner UI

**Recommendation**: Start with booking detail screen only, client-side only.

### 5.2 Reschedule Flow

**Step 1: Initiate Reschedule**

- User taps "Reschedule" button
- Navigate to reschedule screen (similar to create booking flow)

**Step 2: Reschedule Screen** (`/booking/[id]/reschedule`)

- Show current booking details (date, time, service)
- Calendar picker for new date (similar to create booking)
- Time slot picker filtered by provider availability
- Optional: Reason field (textarea) - "Why are you rescheduling?"
- Show comparison: "Current: Jan 15, 2:00 PM → New: Jan 18, 10:00 AM"

**Step 3: Confirmation**

- Before submitting, show confirmation modal:
  - "Reschedule booking from [old] to [new]?"
  - Warn if within minimum notice window
  - Show any applicable fees/restrictions

**Step 4: Success**

- Show success message
- Navigate back to booking detail
- Booking card/list updates via real-time or refresh

### 5.3 UI Components Needed

1. **RescheduleButton** component

   - Shows in booking detail screen (client view only)
   - Only visible if user is the client for this booking
   - Disabled states:
     - Booking status is COMPLETED/CANCELLED/DECLINED
     - Within minimum notice window (with tooltip explaining)
     - User is not the client (providers never see this button)

2. **RescheduleScreen** (new route)

   - Reuse calendar/time picker from create booking
   - Add "current vs new" comparison view
   - Add reason input field (optional)

3. **RescheduleConfirmationModal**
   - Shows old vs new schedule
   - Warning messages if applicable
   - Confirm/Cancel buttons

---

## 6. Real-Time Updates & Notifications

### 6.1 Socket.IO Events

- **Emit on reschedule**: `booking-rescheduled`
  ```typescript
  {
    bookingId: string;
    previousDate: string;
    previousTime: string;
    newDate: string;
    newTime: string;
    rescheduledBy: string; // userId
  }
  ```
- **Listen in**: Booking detail screen, bookings list
- Update UI immediately when other party reschedules

### 6.2 In-App Notifications (Future)

- Show notification badge when booking is rescheduled
- Push notification (if app supports it)

### 6.3 Email Notifications (Future)

- Send email to other party when booking is rescheduled
- Include old and new date/time
- Include reason if provided

---

## 7. Implementation Phases

### Phase 1: MVP (Recommended Start)

1. ✅ Backend API endpoint for rescheduling
2. ✅ Availability checking logic
3. ✅ Basic validation (status, permissions, time restrictions)
4. ✅ Frontend reschedule screen (reuse create booking components)
5. ✅ Reschedule button in booking detail screen
6. ✅ Real-time updates via Socket.IO
7. ✅ Basic confirmation flow

**Excludes (for later)**:

- Approval workflow for confirmed bookings
- Reschedule history/audit trail
- Email notifications
- Complex fee/refund logic

### Phase 2: Enhanced Features

1. Approval workflow for confirmed bookings
2. Reschedule history tracking
3. Email notifications
4. More sophisticated time restriction rules
5. Analytics on reschedule patterns

### Phase 3: Advanced Features

1. Automated reschedule suggestions
2. Reschedule request queue
3. Provider/client reschedule preferences
4. Reschedule fees/penalties if needed

---

## 8. Technical Considerations

### 8.1 Availability Checking

- Reuse availability logic from create booking
- Need to exclude current booking when checking conflicts (it's being moved)
- Check provider's AvailabilitySlot table
- Consider service duration (not just start time)

### 8.2 Conflict Detection

```typescript
// Pseudo-code for conflict check
async function checkAvailability(providerId, newDate, newTime, serviceDuration, excludeBookingId) {
  // Get provider availability slots for the day
  // Get all existing bookings for provider on that day (excluding current booking)
  // Check if new time slot overlaps with existing bookings
  // Consider service duration when checking overlap
  // Return true if available, false if conflict
}
```

### 8.3 State Management

- Booking status remains same (PENDING stays PENDING, CONFIRMED stays CONFIRMED)
- Only `scheduledDate`, `scheduledTime`, and `updatedAt` change
- Consider adding optional `rescheduledAt` timestamp if tracking is important

### 8.4 Error Handling

- **Availability conflict**: "This time slot is not available. Please choose another time."
- **Time restriction**: "Cannot reschedule within 24 hours of appointment. Please cancel instead."
- **Invalid status**: "This booking cannot be rescheduled."
- **Permission denied**: "Only clients can reschedule bookings."

---

## 9. Recommended Approach (MVP)

### For MVP, I recommend:

1. **Simple reschedule model** (automatic, no approval workflow)

   - Only clients can reschedule
   - System checks availability, then automatically updates if available
   - Provider gets notified via Socket.IO
   - Keep it fast and simple

2. **Time restrictions**

   - 24-hour minimum notice (configurable)
   - Clear messaging if reschedule is too late

3. **Dedicated reschedule endpoint**

   - `PATCH /api/bookings/:id/reschedule`
   - Specific validation and business logic
   - Clearer than generic update endpoint

4. **Reuse create booking UI**

   - Reschedule screen very similar to create booking
   - Same calendar/time picker components
   - Add "current schedule" comparison view

5. **Real-time updates**

   - Socket.IO events for instant UI updates
   - Booking lists and detail screens refresh automatically

6. **No schema changes initially**
   - Use existing Booking model fields
   - Add reschedule history later if needed

---

## 10. Open Questions to Decide

1. ~~**Approval workflow**: Simple (free reschedule) or approval-based?~~ ✅ **DECIDED**: Automatic system - no approval needed (clients only)

2. **Minimum notice period**: What should it be? (24 hours? 48 hours?)

   - **Recommendation**: 24 hours configurable

3. **Reschedule history**: Track in database or just use updatedAt?

   - **Recommendation**: Just use updatedAt for MVP, add history table later

4. **Provider availability**: What if provider's availability changes after booking?

   - **Recommendation**: Still allow reschedule, just check current availability

5. **Payment handling**: Any special rules for paid bookings?

   - **Recommendation**: Free reschedule, no refunds/charges (keep it simple)

6. **Reason field**: Required or optional?
   - **Recommendation**: Optional, but encourage it

---

## Next Steps

1. **Review this proposal** and decide on open questions
2. **Choose MVP scope** (recommend starting with Phase 1)
3. **Create implementation plan** with specific tasks
4. **Design UI mockups** for reschedule flow
5. **Implement backend API** endpoint
6. **Implement frontend** reschedule screen
7. **Add real-time updates**
8. **Test thoroughly** with various scenarios

Would you like me to proceed with implementing the MVP based on this proposal, or would you like to discuss/modify any aspects first?
