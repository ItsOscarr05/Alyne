feat: enhance discover filters, update platform fee, and refine UI components

## Discover Tab Filter System Overhaul

- Refactor filter bar to single-row layout with All, Rating, Price, Distance, and Reviews filters
- Add interactive dropdown modals for each filter with selection options:
  - Rating: 1-5 stars & above options
  - Price: Ascending/Descending sort options
  - Distance: ≤ 1/5/10/15 Miles, ≥ 20 Miles (using proper mathematical symbols)
  - Reviews: Highest/Lowest sort options
- Implement "Clear filters" button on far right of filter row (only visible when filters are active)
- Update filter pills to display selected options with visual indicators
- Fix price sorting to use `startingPrice` field correctly
- Improve filter state management and real-time provider list updates

## Platform Fee Update

- Change platform fee from 10% to 7.5% in backend payment service
- Update frontend fallback calculation from 10% to 7.5%
- Update documentation comments with new fee examples

## Help & Support Page

- Remove live chat and phone support options
- Keep only email support for streamlined contact method
- Update section description to reflect email-only support

## UI/UX Improvements

- Add chevron icons to filter pills to indicate dropdown availability
- Improve filter pill active states and visual feedback
- Enhance dropdown modal styling with proper spacing and dividers
- Update filter pill text to show abbreviated selected options (e.g., "5★+", "Price (↑)", "5mi")

## Technical Improvements

- Refactor filter state management for better maintainability
- Improve client-side sorting logic for price, rating, and reviews
- Add proper TypeScript types for filter options
- Optimize filter dropdown rendering and state updates
