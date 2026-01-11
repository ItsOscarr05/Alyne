# Client Profile Page Enhancement Plan

## Current State Analysis

### Provider Profile (Robust & Complete)

- ✅ **Hero Section**: Pattern background, large avatar, rating badge
- ✅ **Quick Stats Cards**: Services, Credentials, Availability Days, Rating (4 cards with colored borders)
- ✅ **Bank Account Status**: Visual indicator card
- ✅ **Bio & Specialties Display**: Rich content sections
- ✅ **Visual Hierarchy**: Multiple card sections with proper spacing

### Client Profile (Lackluster & Incomplete)

- ❌ **Basic Card**: Simple avatar, name, email only
- ❌ **No Stats**: No quick metrics or insights
- ❌ **No Visual Interest**: Plain, minimal design
- ❌ **No Activity Preview**: No recent bookings or activity
- ❌ **No Personalization**: No favorites or preferences shown

---

## Proposed Enhancements

### 1. **Hero Section** (Match Provider Visual Treatment)

**Goal**: Give clients the same premium, polished look

**Design Elements**:

- Pattern background (similar grid/radial gradient)
- Large avatar (120x120) with hover overlay for photo change
- Name prominently displayed
- Email with icon
- "Client" badge (similar to provider badge)

**Visual Parity**: ✅ Matches provider hero section

---

### 2. **Quick Stats Section** (4 Cards with Colored Borders)

**Goal**: Show client activity metrics at a glance

**Card 1: Total Bookings** (Blue/Primary)

- Icon: `calendar-outline`
- Value: Total bookings count
- Label: "Total Bookings"
- Border Color: Primary blue
- Action: Tap to view all bookings

**Card 2: Upcoming Bookings** (Purple)

- Icon: `time-outline` or `calendar-number-outline`
- Value: Count of upcoming/confirmed bookings
- Label: "Upcoming"
- Border Color: Purple (#9333EA)
- Action: Tap to view upcoming tab

**Card 3: Completed Bookings** (Green)

- Icon: `checkmark-circle-outline`
- Value: Count of completed bookings
- Label: "Completed"
- Border Color: Green (#16A34A)
- Action: Tap to view past/completed tab

**Card 4: Total Spent** (Amber/Yellow)

- Icon: `cash-outline` or `wallet-outline`
- Value: Total amount spent (formatted currency)
- Label: "Total Spent"
- Border Color: Amber (#fbbf24)
- Action: Tap to view payment history

**Visual Parity**: ✅ Matches provider quick stats grid layout

---

### 3. **Recent Activity Section**

**Goal**: Show preview of recent bookings/activity

**Design**:

- Section title: "Recent Activity"
- Show 2-3 most recent bookings (upcoming or completed)
- Each booking card shows:
  - Provider name
  - Service name
  - Date/time
  - Status badge
  - Amount paid
- "View All" button linking to bookings tab
- Empty state if no bookings

**Visual Parity**: ✅ Similar to provider's recent bookings in dashboard

---

### 4. **Payment Method Status Card**

**Goal**: Show payment setup status (similar to provider's bank account card)

**Design**:

- Card with icon (checkmark-circle or close-circle)
- Status text: "Payment Method: Connected" or "Not Set Up"
- If connected: Show last 4 digits or card type
- Action button: "Manage Payment Methods" (if not connected) or "Update" (if connected)
- Links to payment settings or payment method management

**Visual Parity**: ✅ Matches provider's bank account status card

---

### 5. **Favorite Providers Section** (Optional but Nice)

**Goal**: Show providers the client has favorited or frequently books with

**Design**:

- Section title: "My Providers" or "Favorites"
- Horizontal scrollable list of provider cards
- Each card shows:
  - Provider avatar
  - Provider name
  - Rating
  - Number of bookings with them
- Tap to view provider detail
- Empty state: "No favorites yet"

**Note**: This requires backend support for favorites/bookmarks feature

---

### 6. **Enhanced Menu Section**

**Goal**: Better organization and visual hierarchy

**Current Sections**:

- Account
- Preferences
- Support

**Proposed Additions**:

- **Activity**:
  - Booking History (already exists)
  - Payment History (already exists)
  - Reviews Given (new - shows reviews client has written)
- **Account**:
  - Edit Profile (new - allow clients to edit name, email, photo)
  - Payment Methods (new - manage cards/payment methods)
- **Preferences**:
  - Notifications (if implemented)
  - Privacy Settings (if implemented)

---

## Implementation Priority

### Phase 1: Core Enhancements (High Priority)

1. ✅ Hero Section with pattern background
2. ✅ Quick Stats Section (4 cards)
3. ✅ Recent Activity Preview
4. ✅ Payment Method Status Card

### Phase 2: Additional Features (Medium Priority)

5. ⚠️ Favorite Providers Section (requires backend)
6. ⚠️ Reviews Given Section
7. ⚠️ Edit Profile functionality

### Phase 3: Nice-to-Have (Low Priority)

8. 📋 Activity Timeline
9. 📋 Spending Insights/Charts
10. 📋 Provider Recommendations

---

## Visual Design Specifications

### Hero Section

```typescript
- Background: Pattern with radial gradient (primaryLight)
- Avatar: 120x120, circular, with border
- Name: 28px, bold, centered
- Email: 14px, secondary color, with mail icon
- Badge: "Client" badge below avatar
```

### Quick Stats Cards

```typescript
- Layout: 2x2 grid (flexWrap)
- Card Size: minWidth: '45%', flex: 1
- Border: 2px, colored by metric type
- Background: themeHook.colors.surface
- Padding: theme.spacing.lg
- Icon: 24px, colored to match border
- Number: 24px, bold
- Label: 12px, secondary color
```

### Recent Activity Cards

```typescript
- Background: themeHook.colors.surface
- Border: 2px, themeHook.colors.primary
- Padding: theme.spacing.md
- Border Radius: theme.radii.lg
- Show: Provider name, service, date, status, amount
- Max Items: 3
```

### Payment Method Card

```typescript
- Background: themeHook.colors.surface
- Border: 2px, themeHook.colors.border (or success if connected)
- Padding: theme.spacing.md
- Icon: 20px (checkmark-circle or close-circle)
- Status Text: 14px, bold
```

---

## Data Requirements

### Stats to Calculate

1. **Total Bookings**: Count all bookings for client
2. **Upcoming Bookings**: Count bookings with status CONFIRMED and future date
3. **Completed Bookings**: Count bookings with status COMPLETED
4. **Total Spent**: Sum of all completed payment amounts

### API Endpoints Needed

- `GET /api/bookings/client/:clientId/stats` - Get booking statistics
- `GET /api/bookings/client/:clientId/recent` - Get recent bookings (limit 3)
- `GET /api/payments/client/:clientId/methods` - Get payment methods
- `GET /api/reviews/client/:clientId` - Get reviews written by client (if implemented)

---

## Code Structure

### New Components Needed

1. `ClientQuickStats.tsx` - Quick stats cards component
2. `ClientRecentActivity.tsx` - Recent bookings preview
3. `PaymentMethodCard.tsx` - Payment method status card
4. `ClientHeroSection.tsx` - Hero section for clients

### State Management

```typescript
interface ClientStats {
  totalBookings: number;
  upcomingBookings: number;
  completedBookings: number;
  totalSpent: number;
}

interface ClientProfileState {
  stats: ClientStats | null;
  recentBookings: BookingDetail[];
  paymentMethods: PaymentMethod[];
  isLoadingStats: boolean;
}
```

---

## Comparison Table

| Feature          | Provider Profile            | Client Profile (Current) | Client Profile (Proposed)   |
| ---------------- | --------------------------- | ------------------------ | --------------------------- |
| Hero Section     | ✅ Pattern BG, Large Avatar | ❌ Basic Card            | ✅ Pattern BG, Large Avatar |
| Quick Stats      | ✅ 4 Cards                  | ❌ None                  | ✅ 4 Cards                  |
| Activity Preview | ✅ Recent Bookings          | ❌ None                  | ✅ Recent Activity          |
| Status Card      | ✅ Bank Account             | ❌ None                  | ✅ Payment Method           |
| Bio/Info         | ✅ Bio & Specialties        | ❌ None                  | ⚠️ Optional                 |
| Visual Interest  | ✅ High                     | ❌ Low                   | ✅ High                     |

---

## Next Steps

1. **Review & Approve**: Get feedback on proposed enhancements
2. **Design Mockups**: Create visual mockups for new sections
3. **Backend Support**: Check if API endpoints exist or need creation
4. **Implementation**: Start with Phase 1 enhancements
5. **Testing**: Ensure parity with provider profile experience

---

## Questions to Consider

1. Should clients have a "bio" or "about me" section? (Probably not necessary)
2. Do we want to show spending trends/charts? (Nice-to-have)
3. Should we implement favorites/bookmarks feature? (Requires backend)
4. Do clients need an "Edit Profile" page? (Name, email, photo only)
5. Should we show provider recommendations based on booking history?

---

## Success Metrics

- ✅ Visual parity with provider profile
- ✅ Client engagement metrics improve
- ✅ Users can quickly see their activity
- ✅ Payment setup is clearly visible
- ✅ Overall profile feels "complete" and professional
