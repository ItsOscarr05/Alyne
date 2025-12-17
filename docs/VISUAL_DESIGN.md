## Alyne Visual Design & UI Enhancement Plan

### 1. Design Goals & Inspiration

- **Product vibe**
  - Calm, welcoming, and trustworthy (wellness + light fintech feel).
  - Clean, minimal UI with clear hierarchy and lots of white space.
  - Frictionless and modern, similar in polish to **Handshake** (smooth cards, gentle shadows, soft colors, friendly typography).

- **Experience principles**
  - **Clarity first**: at any point, it should be obvious what the primary action is.
  - **Consistency**: one button style, one input style, one card language across web + mobile.
  - **Calm motion**: subtle animations only where they help understanding (no flashy transitions).
  - **Accessibility**: sufficient contrast, legible font sizes, large tap targets.

---

### 2. Visual Language & Tokens

#### 2.1 Color System

- **Primary**
  - `primary/500`: #2563EB (Alyne blue – main action)
  - `primary/600`: #1D4ED8 (hover / pressed)
  - `primary/50`:  #EFF6FF (subtle backgrounds / highlights)

- **Neutrals**
  - `neutral/900`: #0F172A (headlines)
  - `neutral/700`: #334155 (body text)
  - `neutral/500`: #64748B (secondary text, placeholders)
  - `neutral/200`: #E2E8F0 (borders, dividers)
  - `neutral/50`:  #F8FAFC (page background)

- **Semantic**
  - `success/500`: #16A34A
  - `error/500`:   #DC2626
  - `warning/500`: #F97316
  - `info/500`:    #0EA5E9

- **Usage notes (Handshake-inspired)**
  - Mostly white / very light backgrounds, with **primary/500** reserved for core CTA buttons.
  - Cards and sections on `neutral/50` backgrounds, similar to Handshake’s neutral canvas.
  - Rare use of strong semantic colors; mostly for badges, toasts, and form validation.

#### 2.2 Typography

- **Font family**
  - Sans-serif, clean and friendly (e.g. `Inter`, `SF Pro`, or system fallback stack).

- **Type scale**
  - `display`: 32–36, bold (page titles like “Discover Providers”)
  - `h1`: 24, semi-bold
  - `h2`: 20, semi-bold
  - `body`: 16, regular (primary reading size)
  - `caption`: 13–14, regular (labels, helper text)

- **Patterns (Handshake-like)**
  - Strong, left-aligned headings; supportive, lighter subtitles beneath.
  - High line-height (1.4–1.5) to keep text airy and readable.

#### 2.3 Layout, Spacing & Radii

- **Spacing scale**
  - `xs`: 4
  - `sm`: 8
  - `md`: 12
  - `lg`: 16
  - `xl`: 24
  - `2xl`: 32

- **Border radius**
  - `sm`: 6 (chips, small elements)
  - `md`: 10 (buttons, inputs)
  - `lg`: 16 (cards, featured sections – Handshake-like rounded cards)

- **Shadows (web)**
  - `card`: soft, medium blur, low opacity (e.g. `0 10px 30px rgba(15,23,42,0.06)`)
  - `elevated`: slightly stronger for modals and floating elements.

---

### 3. Core Components (Shared Patterns)

We’ll define these components/styles once and then apply them consistently across screens.

- **Buttons**
  - Variants: `primary`, `secondary`, `ghost`.
  - Full-width on mobile where appropriate; medium width on web (Handshake-style CTAs).
  - Rounded (`radius: md`), medium height (44–48px), bold label, clear hover/pressed states.

- **Inputs (text, email, password, search)**
  - Floating or strong labels above inputs (no placeholders as labels).
  - Subtle border + `neutral/200`, focus ring in `primary/500`.
  - Error state: border + label in `error/500`, with small helper text.

- **Cards**
  - Used for providers, bookings, and key summaries.
  - White background, `radius: lg`, `card` shadow, internal padding `xl`.
  - Layout similar to Handshake cards: avatar + key text on the left, action(s) on the right.

- **Navigation (bottom tabs / top bar)**
  - Clean, icon + label, clear active state in primary color.
  - Safe touch area (min 44x44).

- **Badges & Chips**
  - Used for specialties, statuses (e.g., “Yoga”, “Verified”, “New”). Soft backgrounds using `primary/50` or neutral tones.

- **Alerts & Toasts**
  - Simple, left-aligned, with icon + message, full-width on mobile; non-intrusive.

---

### 4. Screen-by-Screen Priorities

We’ll apply the system in phases, starting with the highest-impact journeys.

#### 4.1 Phase 1 – First Impression & Discovery

- **Auth (Login / Sign Up)**
  - Apply new typography scale and spacing.
  - Use standardized `Button` and `Input` components.
  - Centered, welcoming layout with light background illustration or soft gradient (optional).

- **Discover Providers (list)**
  - Provider cards using the new card component (photo, name, specialties, rating, price).
  - Clear search bar with icon and hint text (Handshake-like search ergonomics).
  - Empty state with icon + helpful copy (“No providers found. Try adjusting your search.”).

#### 4.2 Phase 2 – Provider Details & Booking

- **Provider Detail**
  - Hero section with provider photo, name, specialties, rating, and primary CTA (“Book Session”).
  - Sectioned layout: About, Services, Reviews, Location.
  - Use chips for specialties and verified status.

- **Booking Flow**
  - Step-by-step layout with clear progress (date/time → details → review).
  - Use consistent form elements and primary CTA at the bottom (fixed on mobile).

#### 4.3 Phase 3 – Payments, Messages, Profile

- **Checkout / Payment**
  - Clean order summary card (service, provider, date/time, price breakdown).
  - Emphasis on security/trust cues near the “Pay Now” button.

- **Messages**
  - Chat-style bubbles with clear timestamp and avatar.
  - Sticky input area with consistent input & send button styling.

- **Profile & Settings**
  - Sections grouped into cards (account info, payment methods, preferences).

---

### 5. Implementation Plan

#### 5.1 Shared Theme & Tokens

- Create a shared **theme module** for both web and mobile:
  - `colors`, `spacing`, `radii`, `typography`, `shadows`.
  - Export these tokens so components can consume them (e.g. `theme.colors.primary[500]`).

#### 5.2 Core Components

- Implement or refactor:
  - `Button` (variants + loading state).
  - `TextInput` / `FormField` (label, error text, icons).
  - `Card` (container with padding, radius, and shadow).
  - `SectionHeader` (title + optional subtitle).

#### 5.3 Screen Refactors (per phase)

- **Phase 1**
  - Update login/signup screens to use new components and tokens.
  - Update Discover tab (provider list + empty states).

- **Phase 2**
  - Refactor provider detail and booking screens around the new layout and components.

- **Phase 3**
  - Apply to checkout, messages, and profile.

---

### 6. Review & Iteration

- After each phase:
  - Capture before/after screenshots.
  - Verify consistency with the design system (colors, spacing, typography).
  - Adjust tokens (e.g., tweak primary shade, radii, or shadow strength) based on how it feels in real usage.

This document is the guiding reference for all visual polish work going forward. Next steps: define the concrete theme file and core Button/Input/Card components, then start by applying them to the auth and Discover screens.


