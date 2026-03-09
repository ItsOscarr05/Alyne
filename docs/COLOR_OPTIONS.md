# Card Background Color Options for Dark Mode

## Current Colors
- **Background**: `#0F172A` (very dark blue/slate)
- **Current Surface**: `#1E293B` (grey-blue/slate)

## Proposed Blue-Tinted Options

### Option 1: Subtle Blue-Grey (`#1E2A4A`)
- **Description**: A subtle blue-tinted slate, slightly lighter than background
- **Contrast**: Good contrast with white text
- **Feel**: Subtle, professional, maintains depth

### Option 2: Muted Blue (`#1E2F4F`)
- **Description**: A muted blue-grey with more blue presence
- **Contrast**: Excellent contrast with white text
- **Feel**: More blue-forward while still being subtle

### Option 3: Medium Blue-Grey (`#1E3A5F`)
- **Description**: A medium blue-grey, noticeably lighter
- **Contrast**: Very good contrast with white text
- **Feel**: More vibrant, clearer separation from background

### Option 4: Deep Blue (`#1E2B4F`)
- **Description**: A deep blue-tinted slate
- **Contrast**: Good contrast with white text
- **Feel**: Balanced between grey and blue

### Option 5: Rich Blue-Grey (`#1E3A6F`)
- **Description**: A richer blue-grey with stronger blue tones
- **Contrast**: Excellent contrast with white text
- **Feel**: More vibrant, modern feel

### Option 6: Soft Blue (`#1E2C50`)
- **Description**: A soft blue-tinted surface
- **Contrast**: Good contrast with white text
- **Feel**: Gentle, easy on the eyes

## Visual Comparison

```
Background:  #0F172A  ████████████████████ (very dark)
Current:     #1E293B  ████████████████     (grey-blue)
Option 1:    #1E2A4A  ████████████████     (subtle blue-grey)
Option 2:    #1E2F4F  ████████████████     (muted blue)
Option 3:    #1E3A5F  ████████████████     (medium blue-grey)
Option 4:    #1E2B4F  ████████████████     (deep blue)
Option 5:    #1E3A6F  ████████████████     (rich blue-grey)
Option 6:    #1E2C50  ████████████████     (soft blue)
```

## Recommendation

**Option 2 (`#1E2F4F`)** or **Option 3 (`#1E3A5F`)** would work best:
- Clear visual hierarchy (cards stand out from background)
- Good contrast for readability
- Maintains the blue theme without being too vibrant
- Professional appearance

## Implementation

To test, we can update `surface` in `ThemeContext.tsx`:
```typescript
surface: '#1E2F4F', // or your chosen option
```

