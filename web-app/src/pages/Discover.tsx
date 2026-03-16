import { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ProviderCard } from '../components/cards/ProviderCard';
import { FilterSidebar, type DiscoveryFilters } from '../components/filters/FilterSidebar';
import { ActiveFilters, type ActiveFilterItem } from '../components/filters/ActiveFilters';
import { SortDropdown, type SortOption } from '../components/filters/SortDropdown';
import { providerService } from '../services/provider';
import { getUserFriendlyError } from '../utils/errorMessages';
import type { ProviderCardData } from '../components/cards/ProviderCard';
import styles from './Discover.module.css';

const DEFAULT_FILTERS: DiscoveryFilters = {
  rating: { minRating: null },
  price: { min: null, max: null },
  distance: { maxMiles: null },
  reviews: { sort: null },
};

function sortProviders(providers: ProviderCardData[], sort: SortOption | null): ProviderCardData[] {
  const s = sort ?? 'rating';
  const result = [...providers];
  if (s === 'rating') result.sort((a, b) => b.rating - a.rating);
  else if (s === 'price_asc') result.sort((a, b) => a.startingPrice - b.startingPrice);
  else if (s === 'price_desc') result.sort((a, b) => b.startingPrice - a.startingPrice);
  else if (s === 'distance') result.sort((a, b) => a.distance - b.distance);
  else if (s === 'reviews') result.sort((a, b) => b.reviewCount - a.reviewCount);
  return result;
}

function filtersToActive(filters: DiscoveryFilters): ActiveFilterItem[] {
  const items: ActiveFilterItem[] = [];
  if (filters.rating.minRating != null) {
    items.push({ key: 'rating', label: `${filters.rating.minRating}+ stars` });
  }
  if (filters.price.min != null || filters.price.max != null) {
    const min = filters.price.min ?? 0;
    const max = filters.price.max ?? '∞';
    items.push({ key: 'price', label: `$${min}–${max}` });
  }
  if (filters.distance.maxMiles != null) {
    items.push({ key: 'distance', label: `Within ${filters.distance.maxMiles} mi` });
  }
  return items;
}

export function Discover() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get('q') ?? '';

  const [filters, setFilters] = useState<DiscoveryFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<SortOption | null>('rating');
  const [providers, setProviders] = useState<ProviderCardData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setLocation(null),
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 60000 }
    );
  }, []);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const apiFilters = {
        search: searchQuery.trim() || undefined,
        minRating: filters.rating.minRating ?? undefined,
        minPrice: filters.price.min ?? undefined,
        maxPrice: filters.price.max ?? undefined,
        radius: filters.distance.maxMiles ?? undefined,
        lat: location?.lat,
        lng: location?.lng,
      };
      const result = await providerService.discover(apiFilters);
      setProviders(result.data);
    } catch (err: unknown) {
      setError(getUserFriendlyError(err));
      setProviders([]);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filters.rating.minRating, filters.price.min, filters.price.max, filters.distance.maxMiles, location]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const sortedProviders = useMemo(() => sortProviders(providers, sort), [providers, sort]);
  const activeFilters = useMemo(() => filtersToActive(filters), [filters]);

  const removeFilter = (key: string) => {
    if (key === 'rating') setFilters((f) => ({ ...f, rating: { minRating: null } }));
    if (key === 'price') setFilters((f) => ({ ...f, price: { min: null, max: null } }));
    if (key === 'distance') setFilters((f) => ({ ...f, distance: { maxMiles: null } }));
  };

  const clearAllFilters = () => setFilters(DEFAULT_FILTERS);

  const handleProviderPress = (providerId: string) => {
    navigate(`/providers/${providerId}`);
  };

  return (
    <div className={styles.page}>
      <FilterSidebar
        filters={filters}
        onChange={setFilters}
        resultCount={providers.length}
      />

      <div className={styles.main}>
        <div className={styles.toolbar}>
          <ActiveFilters
            filters={activeFilters}
            onRemove={removeFilter}
            onClearAll={clearAllFilters}
          />
          <SortDropdown
            value={sort}
            onChange={(v) => setSort(v)}
          />
        </div>

        {error && (
          <div className={styles.empty} role="alert">
            <p>{error}</p>
            <button type="button" onClick={fetchProviders} className={styles.clearLink}>
              Try again
            </button>
          </div>
        )}

        {!error && loading && (
          <div className={styles.empty}>
            <p>Loading providers…</p>
          </div>
        )}

        {!error && !loading && sortedProviders.length > 0 && (
          <div className={styles.grid}>
            {sortedProviders.map((provider) => (
              <ProviderCard
                key={provider.id}
                provider={provider}
                onPress={() => handleProviderPress(provider.id)}
              />
            ))}
          </div>
        )}

        {!error && !loading && sortedProviders.length === 0 && (
          <div className={styles.empty}>
            <p>No providers match your filters.</p>
            <button type="button" onClick={clearAllFilters} className={styles.clearLink}>
              Clear all filters
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
