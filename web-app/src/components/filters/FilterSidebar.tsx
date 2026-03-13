import { ChevronDown, ChevronRight } from 'lucide-react';
import { useState, ReactNode } from 'react';
import { PriceRange } from './PriceRange';
import styles from './FilterSidebar.module.css';

export interface RatingFilter {
  minRating: number | null;
}

export interface PriceFilter {
  min: number | null;
  max: number | null;
}

export interface DistanceFilter {
  maxMiles: number | null;
}

export interface ReviewFilter {
  sort: 'highest' | 'lowest' | null;
}

export interface DiscoveryFilters {
  rating: RatingFilter;
  price: PriceFilter;
  distance: DistanceFilter;
  reviews: ReviewFilter;
}

interface FilterSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

function FilterSection({ title, children, defaultOpen = true }: FilterSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={styles.section}>
      <button
        type="button"
        className={styles.sectionHeader}
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        <span>{title}</span>
      </button>
      {open && <div className={styles.sectionContent}>{children}</div>}
    </div>
  );
}

interface FilterSidebarProps {
  filters: DiscoveryFilters;
  onChange: (filters: DiscoveryFilters) => void;
  resultCount?: number;
}

const RATING_OPTIONS = [4, 4.5, 5] as const;
const DISTANCE_OPTIONS = [5, 10, 15, 20, 50] as const;

export function FilterSidebar({ filters, onChange, resultCount }: FilterSidebarProps) {
  const updateRating = (minRating: number | null) => {
    onChange({ ...filters, rating: { minRating } });
  };

  const updatePrice = (min: number | null, max: number | null) => {
    onChange({ ...filters, price: { min, max } });
  };

  const updateDistance = (maxMiles: number | null) => {
    onChange({ ...filters, distance: { maxMiles } });
  };

  const updateReviews = (sort: 'highest' | 'lowest' | null) => {
    onChange({ ...filters, reviews: { sort } });
  };

  return (
    <aside className={styles.sidebar}>
      {resultCount !== undefined && (
        <p className={styles.resultCount}>{resultCount} providers found</p>
      )}

      <FilterSection title="Rating">
        <div className={styles.checkboxGroup}>
          {RATING_OPTIONS.map((r) => (
            <label key={r} className={styles.checkbox}>
              <input
                type="radio"
                name="rating"
                checked={filters.rating.minRating === r}
                onChange={() => updateRating(r)}
              />
              <span>{r}+ stars</span>
            </label>
          ))}
          <label className={styles.checkbox}>
            <input
              type="radio"
              name="rating"
              checked={filters.rating.minRating === null}
              onChange={() => updateRating(null)}
            />
            <span>Any</span>
          </label>
        </div>
      </FilterSection>

      <FilterSection title="Price">
        <PriceRange
          min={filters.price.min}
          max={filters.price.max}
          onChange={updatePrice}
        />
      </FilterSection>

      <FilterSection title="Distance">
        <div className={styles.checkboxGroup}>
          {DISTANCE_OPTIONS.map((m) => (
            <label key={m} className={styles.checkbox}>
              <input
                type="radio"
                name="distance"
                checked={filters.distance.maxMiles === m}
                onChange={() => updateDistance(m)}
              />
              <span>Within {m} mi</span>
            </label>
          ))}
          <label className={styles.checkbox}>
            <input
              type="radio"
              name="distance"
              checked={filters.distance.maxMiles === null}
              onChange={() => updateDistance(null)}
            />
            <span>Any</span>
          </label>
        </div>
      </FilterSection>

      <FilterSection title="Reviews">
        <div className={styles.checkboxGroup}>
          <label className={styles.checkbox}>
            <input
              type="radio"
              name="reviews"
              checked={filters.reviews.sort === 'highest'}
              onChange={() => updateReviews('highest')}
            />
            <span>Most reviews</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="radio"
              name="reviews"
              checked={filters.reviews.sort === 'lowest'}
              onChange={() => updateReviews('lowest')}
            />
            <span>Fewest reviews</span>
          </label>
          <label className={styles.checkbox}>
            <input
              type="radio"
              name="reviews"
              checked={filters.reviews.sort === null}
              onChange={() => updateReviews(null)}
            />
            <span>Any</span>
          </label>
        </div>
      </FilterSection>
    </aside>
  );
}
