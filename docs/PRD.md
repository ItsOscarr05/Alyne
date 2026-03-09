# Product Requirements Document (PRD)

## Alyne - MVP

**Version:** 1.0  
**Date:** November 2025  
**Document Owner:** Oscar Berrigan

---

## 1. Executive Summary

**Alyne** is a mobile application that connects service providers in the personal wellness space (fitness trainers, yoga instructors, nutritionists, wellness coaches, etc.) with clients seeking these services within their local geographic area. The platform solves the dual-sided marketplace problem: professionals struggle to find consistent clients, while clients don't know where to find qualified, local wellness providers.

**Product Type:** Two-sided marketplace mobile application  
**Platform:** iOS and Android (native or cross-platform)  
**MVP Goal:** Launch with core matching, booking, and communication features in a single geographic market

---

## 2. Problem Statement

### 2.1 Service Provider Pain Points

- Difficulty finding clients in their geographic area
- Lack of a centralized platform to showcase services and availability
- Time-consuming client acquisition through word-of-mouth or social media
- Unpredictable income streams
- Limited visibility to potential clients

### 2.2 Client Pain Points

- Don't know where to find qualified wellness professionals
- Uncertainty about provider credentials and availability
- Difficulty comparing services and pricing
- Geographic constraints (want services nearby)
- Lack of reviews/ratings to make informed decisions

### 2.3 Market Opportunity

The wellness industry continues to grow, with increasing demand for personalized, location-based services. There's a gap between platforms that focus on gym/studio bookings and platforms that enable direct provider-client connections.

---

## 3. Solution Overview

Alyne serves as a location-based marketplace where:

- **Service Providers** create profiles, set availability, define service areas, and manage bookings
- **Clients** discover local providers, view profiles/reviews, book services, and manage appointments

The MVP will focus on core matching and booking functionality, with design inspiration from Handshake's clean, professional interface and Hungry's marketplace model.

---

## 4. Target Users

### 4.1 Primary Personas

#### Persona 1: Sarah - The Wellness Professional

- **Age:** 28-45
- **Occupation:** Certified personal trainer, yoga instructor, or nutritionist
- **Goals:** Find consistent clients, grow business, manage schedule efficiently
- **Tech Savviness:** High
- **Pain Points:** Client acquisition, time management, payment processing

#### Persona 2: Mike - The Client

- **Age:** 25-55
- **Occupation:** Professional with limited time
- **Goals:** Find convenient, qualified wellness services near home/work
- **Tech Savviness:** Medium to High
- **Pain Points:** Finding trustworthy providers, scheduling flexibility, price transparency

---

## 5. Core Features (MVP)

### 5.1 User Authentication & Onboarding

**Provider Onboarding:**

- Email/phone registration
- Profile creation (name, photo, bio, specialties)
- Credential verification (certifications, licenses)
- Service area definition (radius from location)
- Service offerings setup (fitness training, yoga, nutrition coaching, etc.)
- Pricing structure (per session, package deals)
- Availability calendar setup

**Client Onboarding:**

- Email/phone registration
- Basic profile (name, photo, preferences)
- Location permission for local matching
- Wellness goals/needs selection (optional)

**Requirements:**

- Email verification
- Phone number verification (SMS)
- Social login (Google, Apple) - Optional for MVP
- Profile completeness indicators

### 5.2 Discovery & Matching

**Provider Discovery (Client View):**

- Map view showing nearby providers
- List view with filters:
  - Service type (fitness, yoga, nutrition, etc.)
  - Distance radius (5, 10, 15, 20+ miles)
  - Price range
  - Rating (minimum 4+ stars)
  - Availability (now, this week, etc.)
- Provider cards showing:
  - Profile photo
  - Name and credentials
  - Specialties/tags
  - Distance from user
  - Starting price
  - Rating and review count
  - "Available Now" badge if applicable

**Search Functionality:**

- Text search (provider name, specialty keywords)
- Filter combinations
- Saved searches (future enhancement - out of MVP)

**Requirements:**

- Real-time location-based matching
- Geolocation services integration
- Distance calculation accuracy

### 5.3 Provider Profile & Details

**Profile Components:**

- Header with photo, name, verified badge
- Bio/About section
- Specialties and services offered
- Credentials and certifications (with verification badges)
- Pricing breakdown:
  - Individual session rates
  - Package deals (if offered)
  - Group session pricing (if applicable)
- Availability calendar
- Service area map
- Reviews and ratings (from past clients)
- Photo gallery (training photos, certifications)
- Response time indicator

**Requirements:**

- Professional, clean layout (Handshake-inspired)
- Easy-to-scan information hierarchy
- Call-to-action: "Book Session" or "Request Booking"

### 5.4 Booking System

**Booking Flow:**

1. Client selects provider
2. Chooses service type (if multiple offered)
3. Selects date and time from provider's availability
4. Option to add notes/requirements
5. Review booking summary (service, date, time, price, location)
6. Confirmation request sent to provider
7. Provider accepts/declines
8. Client receives confirmation/decline notification
9. Booking added to both parties' calendars

**Booking Management:**

- Upcoming appointments list
- Past appointments (for reviews)
- Ability to reschedule (with provider approval)
- Ability to cancel (with cancellation policy)
- Booking status indicators (pending, confirmed, completed, cancelled)

**Requirements:**

- Calendar integration (Google Calendar, Apple Calendar)
- Push notifications for booking updates
- Timezone handling
- Cancellation policy enforcement

### 5.5 Communication

**In-App Messaging:**

- Direct messaging between client and provider
- Message notifications
- Chat history per booking
- File sharing (photos, documents) - Optional for MVP

**Requirements:**

- Real-time messaging or near real-time
- Message read receipts (future enhancement)
- Spam/abuse reporting mechanism

### 5.6 Reviews & Ratings

**Review System:**

- Clients can rate providers (1-5 stars)
- Written review optional
- Review prompts after completed bookings
- Reviews visible on provider profile
- Provider can respond to reviews (future enhancement - optional for MVP)

**Requirements:**

- Review only after confirmed completed session
- Moderation system (flag inappropriate content)
- Aggregate rating display

### 5.7 Profile Management

**Provider Profile:**

- Edit profile information
- Update availability calendar
- Manage service offerings and pricing
- Upload photos
- View analytics (views, bookings, revenue) - Basic for MVP

**Client Profile:**

- Edit personal information
- Manage preferences
- Booking history
- Saved providers (future enhancement)

### 5.8 Payments (MVP - Basic)

**Payment Processing:**

- Payment method on file (credit card, debit card)
- Charge on booking confirmation (or after service completion)
- In-app payment processing (Stripe, PayPal, etc.)
- Receipt generation
- Basic transaction history

**Requirements:**

- Secure payment processing
- PCI compliance considerations
- Support for refunds (future enhancement - manual for MVP)

---

## 6. User Flows

### 6.1 Provider Onboarding Flow

1. Download app → Sign up → Choose "I'm a Provider"
2. Email/phone verification
3. Complete profile (name, photo, bio)
4. Add credentials (upload certifications)
5. Define services and pricing
6. Set availability calendar
7. Define service area (map selection or address)
8. Profile review (optional admin review)
9. Profile goes live

### 6.2 Client Booking Flow

1. Open app → See map/list of nearby providers
2. Filter/search for specific service
3. Tap provider card → View full profile
4. Review services, pricing, reviews
5. Tap "Book Session"
6. Select service type → Select date/time
7. Add notes → Confirm booking
8. Wait for provider confirmation
9. Receive confirmation notification
10. Appointment added to calendar

### 6.3 Post-Service Flow

1. Provider marks appointment as "Completed"
2. Client receives prompt to leave review
3. Client rates and reviews provider
4. Review appears on provider profile
5. Payment processed (if not already)

---

## 7. Technical Requirements

### 7.1 Platform

- **Native Mobile Apps:** iOS (Swift/SwiftUI) and Android (Kotlin/Jetpack Compose)
- **OR Cross-Platform:** React Native, Flutter, or similar
- **Backend:** Cloud-based API (Node.js, Python, or similar)
- **Database:** PostgreSQL or MongoDB
- **File Storage:** AWS S3 or similar for photos/documents

### 7.2 Key Integrations

- **Maps & Location:** Google Maps API or Apple MapKit
- **Geolocation:** Native device GPS
- **Push Notifications:** Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNs)
- **Payments:** Stripe, PayPal, or Square
- **Calendar:** Google Calendar API, Apple Calendar
- **Authentication:** Firebase Auth, Auth0, or custom solution
- **Messaging:** Real-time messaging service (Firebase, Socket.io, or similar)

### 7.3 Performance Requirements

- App launch time: < 3 seconds
- Search results loading: < 2 seconds
- Image loading: Optimized with caching
- Offline capabilities: Basic (cached profiles, offline message queue)

### 7.4 Security Requirements

- HTTPS for all API calls
- Secure authentication (JWT tokens)
- Data encryption at rest and in transit
- GDPR/Privacy compliance considerations
- Provider credential verification process

---

## 8. Design Guidelines & Inspiration

### 8.1 Design Philosophy

- **Clean & Professional:** Inspired by Handshake's interface
  - Minimal, uncluttered layouts
  - Clear typography hierarchy
  - Professional color palette
  - Card-based design for profiles and listings
- **Marketplace Feel:** Inspired by Hungry
  - Easy browsing and filtering
  - Visual service cards
  - Clear pricing display
  - Quick booking flow

### 8.2 UI Components

- **Profile Cards:** Similar to Handshake's profile cards (clean, scannable)
- **Search & Filters:** Prominent search bar with expandable filters
- **Map Integration:** Interactive map with provider pins
- **Booking Interface:** Step-by-step wizard with clear progress indicators
- **Messaging:** Clean chat interface (like Handshake's messaging)

### 8.3 Color Scheme & Branding

- Primary: Professional blue or green (wellness/health theme)
- Secondary: Complementary colors for accents
- Neutral: Grays for text and backgrounds
- Success: Green for confirmations
- Warning/Error: Red/Orange for alerts

### 8.4 Typography

- Sans-serif for readability
- Clear hierarchy (H1, H2, Body, Caption)
- Accessible font sizes (WCAG compliance)

---

## 9. MVP Scope & Out-of-Scope

### 9.1 In Scope (MVP)

- ✅ User authentication (email/phone)
- ✅ Provider profile creation and management
- ✅ Client profile creation
- ✅ Location-based provider discovery
- ✅ Search and filtering
- ✅ Booking system (request/accept/decline)
- ✅ In-app messaging
- ✅ Reviews and ratings
- ✅ Basic payment processing
- ✅ Push notifications
- ✅ Calendar integration

### 9.2 Out of Scope (Post-MVP)

- ❌ Video consultations/calls
- ❌ Group booking features
- ❌ Subscription plans (monthly/yearly packages)
- ❌ Advanced analytics dashboard
- ❌ Provider marketing tools
- ❌ Referral program
- ❌ Multi-language support
- ❌ Admin dashboard (basic moderation only)
- ❌ Provider scheduling optimization tools
- ❌ Client wellness goal tracking
- ❌ Social features (following, sharing)

---

## 10. Success Metrics (KPIs)

### 10.1 User Acquisition

- Number of provider sign-ups (target: 50-100 in first month)
- Number of client sign-ups (target: 500-1000 in first month)
- Provider profile completion rate (target: >80%)
- Client onboarding completion rate (target: >90%)

### 10.2 Engagement

- Daily Active Users (DAU)
- Weekly Active Users (WAU)
- Average session duration
- Search-to-booking conversion rate (target: >10%)
- Profile views per provider

### 10.3 Marketplace Health

- Number of bookings per week
- Booking completion rate (target: >85%)
- Average time to first booking (provider)
- Repeat booking rate (target: >30%)
- Average bookings per provider per month

### 10.4 Quality Metrics

- Average provider rating (target: >4.5 stars)
- Review submission rate (target: >60% of completed bookings)
- Provider response time to booking requests (target: <24 hours)
- Client-provider message response rate

---

## 11. Launch Strategy

### 11.1 Geographic Rollout

- **Phase 1 (MVP):** Launch in single city/town (e.g., Austin, TX or similar)
- **Phase 2:** Expand to 3-5 cities
- **Phase 3:** Regional expansion

### 11.2 Provider Acquisition (Pre-Launch)

- Direct outreach to local wellness professionals
- Partnerships with gyms, studios, wellness centers
- Social media marketing targeting providers
- Offer early adopter incentives (reduced platform fees)

### 11.3 Client Acquisition (Post-Launch)

- Social media advertising (Facebook, Instagram)
- Local SEO optimization
- Influencer partnerships (wellness influencers)
- Referral incentives (future enhancement)

---

## 12. Risk Assessment

### 12.1 Technical Risks

- **Geolocation accuracy:** Mitigate with fallback address-based matching
- **Payment processing delays:** Use established providers (Stripe)
- **Scalability:** Design backend for growth from day one

### 12.2 Market Risks

- **Chicken-and-egg problem:** Need both providers and clients
  - _Mitigation:_ Aggressive pre-launch provider acquisition, launch events
- **Competition:** Existing platforms (MindBody, ClassPass, etc.)
  - _Mitigation:_ Focus on direct provider-client model, better UX

### 12.3 Operational Risks

- **Trust & Safety:** Unverified providers, fraudulent bookings
  - _Mitigation:_ Credential verification, review system, reporting mechanism
- **Payment disputes:** Chargebacks, refunds
  - _Mitigation:_ Clear cancellation policy, customer support process

---

## 13. Timeline & Phases

### Phase 1: Discovery & Design (Weeks 1-4)

- User research and persona validation
- Wireframes and mockups
- Design system creation
- Technical architecture planning

### Phase 2: Development Sprint 1 (Weeks 5-10)

- Authentication system
- User profiles (provider & client)
- Basic discovery (list view)
- Provider profile pages

### Phase 3: Development Sprint 2 (Weeks 11-16)

- Booking system
- Messaging
- Reviews & ratings
- Payment integration

### Phase 4: Development Sprint 3 (Weeks 17-20)

- Map integration
- Advanced filtering
- Push notifications
- Calendar integration
- Bug fixes and polish

### Phase 5: Testing & Launch Prep (Weeks 21-24)

- Beta testing with limited users
- Provider onboarding (pre-launch)
- Marketing preparation
- App store submissions
- Soft launch

**Total MVP Timeline:** ~24 weeks (6 months)

---

## 14. Future Enhancements (Post-MVP)

- Group classes and workshops booking
- Subscription/membership plans
- Video call integration for virtual sessions
- Wellness goal tracking for clients
- Provider analytics dashboard
- Advanced search (AI-powered matching)
- Loyalty and rewards program
- Social features (provider portfolios, client stories)
- White-label options for wellness studios

---

## 15. Appendix

### 15.1 Competitive Analysis

**Direct Competitors:**

- MindBody (studio-focused, less direct provider-client)
- ClassPass (class booking, not individual providers)
- Thumbtack (general services, not wellness-focused)

**Indirect Competitors:**

- Instagram/Facebook (providers use for marketing)
- Google Search (clients search for providers)

**Differentiation:**

- Location-based matching for local providers
- Direct provider-client connection (no intermediaries)
- Wellness-focused (not general services)
- Handshake-inspired professional interface

### 15.2 User Stories

**As a Provider, I want to:**

- Create a professional profile that showcases my credentials
- Set my availability so clients know when I'm free
- Receive booking requests and manage them easily
- Get paid securely through the app
- See reviews from satisfied clients

**As a Client, I want to:**

- Find qualified wellness providers near me
- See provider reviews and credentials before booking
- Book appointments easily and quickly
- Message providers to ask questions
- Track my booking history

---

## Document Approval

**Prepared by:** Product Team  
**Reviewed by:** [Stakeholder Names]  
**Approved by:** [Decision Maker]  
**Last Updated:** December 2024

---

_This PRD is a living document and will be updated as the product evolves._
