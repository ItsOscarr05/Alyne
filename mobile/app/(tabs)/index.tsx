import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal as RNModal,
} from 'react-native';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { SearchBar } from '../../components/SearchBar';
import { ProviderCard, ProviderCardData } from '../../components/ProviderCard';
import { ProviderDetailModal } from '../../components/ProviderDetailModal';
import { providerService, DiscoveryFilters } from '../../services/provider';
import { useAuth } from '../../hooks/useAuth';
import { logger } from '../../utils/logger';
import { getUserFriendlyError } from '../../utils/errorMessages';
import { theme } from '../../theme';
import { mockProviders } from '../../data/mockProviders';

export default function DiscoverScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState<ProviderCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [activeFilter, setActiveFilter] = useState<
    'all' | 'rating' | 'price' | 'distance' | 'reviews'
  >('all');
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownFilter, setDropdownFilter] = useState<
    'rating' | 'price' | 'distance' | 'reviews' | null
  >(null);

  // Filter option states
  const [ratingOption, setRatingOption] = useState<number | null>(null); // 1-5 stars
  const [priceOption, setPriceOption] = useState<'asc' | 'desc' | null>(null);
  const [distanceOption, setDistanceOption] = useState<number | null>(null); // miles: 1, 5, 10, 15, 20+
  const [reviewsOption, setReviewsOption] = useState<'highest' | 'lowest' | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(null);
  const [isProviderModalVisible, setIsProviderModalVisible] = useState(false);

  // Redirect providers to dashboard
  useEffect(() => {
    // Wait a tick to ensure router is mounted
    const timer = setTimeout(() => {
      if (user?.userType === 'PROVIDER') {
        router.replace('/(tabs)/dashboard');
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [user, router]);

  useEffect(() => {
    if (user?.userType !== 'PROVIDER') {
      requestLocationPermission();
    }
  }, [user]);

  const loadProviders = useCallback(async () => {
    setIsLoading(true);
    try {
      const filters: DiscoveryFilters = {
        search: searchQuery || undefined,
      };

      // Apply rating filter
      if (ratingOption !== null) {
        filters.minRating = ratingOption;
      }

      // Apply distance filter
      if (distanceOption !== null) {
        // Convert miles to km (approximate)
        filters.radius = distanceOption === 20 ? 50 : distanceOption * 1.60934;
      } else {
        filters.radius = 50;
      }

      if (userLocation) {
        filters.lat = userLocation.lat;
        filters.lng = userLocation.lng;
      }

      let results = await providerService.discover(filters);

      // Apply client-side sorting based on active filter and options
      if (activeFilter === 'rating' && ratingOption !== null) {
        results = results.sort((a, b) => (b.rating || 0) - (a.rating || 0));
      } else if (activeFilter === 'price' && priceOption !== null) {
        // Sort by starting price based on option
        results = results.sort((a, b) => {
          const aPrice = a.startingPrice || 0;
          const bPrice = b.startingPrice || 0;
          if (priceOption === 'desc') {
            return bPrice - aPrice;
          } else {
            return aPrice - bPrice; // ascending
          }
        });
      } else if (activeFilter === 'distance') {
        // Distance sorting is already handled by the backend when lat/lng are provided
        // Keep results as-is
      } else if (activeFilter === 'reviews' && reviewsOption !== null) {
        // Sort by review count based on option
        if (reviewsOption === 'lowest') {
          results = results.sort((a, b) => (a.reviewCount || 0) - (b.reviewCount || 0));
        } else {
          results = results.sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0)); // highest
        }
      }
      // 'all' filter doesn't need sorting

      setProviders(results);
    } catch (error: any) {
      logger.error('Error loading providers', error);
      // Fallback to mock data if API fails
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        Alert.alert('Connection Error', 'Unable to connect to server. Using demo data.', [
          { text: 'OK' },
        ]);
        // Use mock data as fallback
        setProviders(mockProviders);
      } else {
        Alert.alert('Error', 'Failed to load providers');
      }
    } finally {
      setIsLoading(false);
    }
  }, [
    searchQuery,
    userLocation,
    activeFilter,
    ratingOption,
    priceOption,
    distanceOption,
    reviewsOption,
  ]);

  useEffect(() => {
    if (user?.userType !== 'PROVIDER') {
      loadProviders();
    }
  }, [loadProviders, user]);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({});
        setUserLocation({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });
      }
    } catch (error) {
      logger.error('Error getting location', error);
    }
  };

  const handleProviderPress = (providerId: string) => {
    setSelectedProviderId(providerId);
    setIsProviderModalVisible(true);
  };

  const handleFilterPress = (filter: 'all' | 'rating' | 'price' | 'distance' | 'reviews') => {
    if (filter === 'all') {
      setActiveFilter('all');
      // Reset all filter options
      setRatingOption(null);
      setPriceOption(null);
      setDistanceOption(null);
      setReviewsOption(null);
      setShowDropdown(false);
    } else {
      setActiveFilter(filter);
      setDropdownFilter(filter);
      setShowDropdown(true);
    }
  };

  const handleOptionSelect = (option: any) => {
    if (dropdownFilter === 'rating') {
      setRatingOption(option);
      setActiveFilter('rating');
    } else if (dropdownFilter === 'price') {
      setPriceOption(option);
      setActiveFilter('price');
    } else if (dropdownFilter === 'distance') {
      setDistanceOption(option);
      setActiveFilter('distance');
    } else if (dropdownFilter === 'reviews') {
      setReviewsOption(option);
      setActiveFilter('reviews');
    }
    setShowDropdown(false);
    setDropdownFilter(null);
  };

  const handleClearFilters = () => {
    setRatingOption(null);
    setPriceOption(null);
    setDistanceOption(null);
    setReviewsOption(null);
    setActiveFilter('all');
    setShowDropdown(false);
    setDropdownFilter(null);
  };

  // Don't render discover screen for providers (but all hooks must still be called)
  if (user?.userType === 'PROVIDER') {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or specialty..."
        />
        <View style={styles.filtersContainer}>
          <View style={styles.filterRow}>
            <View style={styles.filterPillsContainer}>
              <TouchableOpacity
                style={[styles.filterPill, activeFilter === 'all' && styles.filterPillActive]}
                onPress={() => handleFilterPress('all')}
                activeOpacity={0.8}
              >
                <Text
                  style={
                    activeFilter === 'all' ? styles.filterPillTextActive : styles.filterPillText
                  }
                >
                  All
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  (activeFilter === 'rating' || ratingOption !== null) && styles.filterPillActive,
                ]}
                onPress={() => handleFilterPress('rating')}
                activeOpacity={0.8}
              >
                <Text
                  style={
                    activeFilter === 'rating' || ratingOption !== null
                      ? styles.filterPillTextActive
                      : styles.filterPillText
                  }
                  numberOfLines={1}
                >
                  {ratingOption !== null ? `${ratingOption}★+` : 'Rating'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={
                    activeFilter === 'rating' || ratingOption !== null
                      ? theme.colors.neutral[900]
                      : theme.colors.neutral[500]
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  (activeFilter === 'price' || priceOption !== null) && styles.filterPillActive,
                ]}
                onPress={() => handleFilterPress('price')}
                activeOpacity={0.8}
              >
                <Text
                  style={
                    activeFilter === 'price' || priceOption !== null
                      ? styles.filterPillTextActive
                      : styles.filterPillText
                  }
                  numberOfLines={1}
                >
                  {priceOption !== null ? `Price (${priceOption === 'asc' ? '↑' : '↓'})` : 'Price'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={
                    activeFilter === 'price' || priceOption !== null
                      ? theme.colors.neutral[900]
                      : theme.colors.neutral[500]
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  (activeFilter === 'distance' || distanceOption !== null) &&
                    styles.filterPillActive,
                ]}
                onPress={() => handleFilterPress('distance')}
                activeOpacity={0.8}
              >
                <Text
                  style={
                    activeFilter === 'distance' || distanceOption !== null
                      ? styles.filterPillTextActive
                      : styles.filterPillText
                  }
                  numberOfLines={1}
                >
                  {distanceOption !== null
                    ? `${distanceOption === 20 ? '20+' : distanceOption}mi`
                    : 'Distance'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={
                    activeFilter === 'distance' || distanceOption !== null
                      ? theme.colors.neutral[900]
                      : theme.colors.neutral[500]
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.filterPill,
                  (activeFilter === 'reviews' || reviewsOption !== null) && styles.filterPillActive,
                ]}
                onPress={() => handleFilterPress('reviews')}
                activeOpacity={0.8}
              >
                <Text
                  style={
                    activeFilter === 'reviews' || reviewsOption !== null
                      ? styles.filterPillTextActive
                      : styles.filterPillText
                  }
                  numberOfLines={1}
                >
                  {reviewsOption !== null
                    ? `Reviews (${reviewsOption === 'highest' ? '↑' : '↓'})`
                    : 'Reviews'}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={14}
                  color={
                    activeFilter === 'reviews' || reviewsOption !== null
                      ? theme.colors.neutral[900]
                      : theme.colors.neutral[500]
                  }
                />
              </TouchableOpacity>
            </View>
            {(ratingOption !== null ||
              priceOption !== null ||
              distanceOption !== null ||
              reviewsOption !== null) && (
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={handleClearFilters}
                activeOpacity={0.8}
              >
                <Ionicons name="close-circle-outline" size={16} color={theme.colors.neutral[500]} />
                <Text style={styles.clearFiltersText}>Clear filters</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {isLoading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.emptyText}>Loading providers...</Text>
          </View>
        ) : providers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No providers found</Text>
            <Text style={styles.emptySubtext}>Try adjusting your search</Text>
          </View>
        ) : (
          <FlatList
            data={providers}
            keyExtractor={(item) => item.id}
            numColumns={2}
            renderItem={({ item, index }) => (
              <View style={styles.cardWrapper}>
                <ProviderCard provider={item} onPress={() => handleProviderPress(item.id)} />
              </View>
            )}
            ListHeaderComponent={
              <>
                <View style={styles.header}>
                  <Text style={styles.title}>Discover Providers</Text>
                  <Text style={styles.subtitle}>Find wellness professionals near you</Text>
                </View>
                <View style={styles.headerDivider} />
              </>
            }
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={isLoading}
            onRefresh={loadProviders}
          />
        )}
      </View>

      {/* Provider Detail Modal */}
      <ProviderDetailModal
        visible={isProviderModalVisible}
        providerId={selectedProviderId}
        onClose={() => {
          setIsProviderModalVisible(false);
          setSelectedProviderId(null);
        }}
      />

      {/* Filter Dropdown Modal */}
      <RNModal
        visible={showDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowDropdown(false);
          setDropdownFilter(null);
        }}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => {
            setShowDropdown(false);
            setDropdownFilter(null);
          }}
        >
          <View style={styles.dropdownContainer}>
            {dropdownFilter === 'rating' && (
              <>
                {[1, 2, 3, 4, 5].map((stars) => (
                  <TouchableOpacity
                    key={stars}
                    style={[
                      styles.dropdownOption,
                      ratingOption === stars && styles.dropdownOptionActive,
                    ]}
                    onPress={() => handleOptionSelect(stars)}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        ratingOption === stars && styles.dropdownOptionTextActive,
                      ]}
                    >
                      {stars} star{stars > 1 ? 's' : ''} & above
                    </Text>
                    {ratingOption === stars && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {dropdownFilter === 'price' && (
              <>
                <TouchableOpacity
                  style={[
                    styles.dropdownOption,
                    priceOption === 'asc' && styles.dropdownOptionActive,
                  ]}
                  onPress={() => handleOptionSelect('asc')}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      priceOption === 'asc' && styles.dropdownOptionTextActive,
                    ]}
                  >
                    Ascending
                  </Text>
                  {priceOption === 'asc' && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary[500]} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dropdownOption,
                    priceOption === 'desc' && styles.dropdownOptionActive,
                  ]}
                  onPress={() => handleOptionSelect('desc')}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      priceOption === 'desc' && styles.dropdownOptionTextActive,
                    ]}
                  >
                    Descending
                  </Text>
                  {priceOption === 'desc' && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary[500]} />
                  )}
                </TouchableOpacity>
              </>
            )}

            {dropdownFilter === 'distance' && (
              <>
                {[1, 5, 10, 15, 20].map((miles) => (
                  <TouchableOpacity
                    key={miles}
                    style={[
                      styles.dropdownOption,
                      distanceOption === miles && styles.dropdownOptionActive,
                    ]}
                    onPress={() => handleOptionSelect(miles)}
                  >
                    <Text
                      style={[
                        styles.dropdownOptionText,
                        distanceOption === miles && styles.dropdownOptionTextActive,
                      ]}
                    >
                      {miles === 20 ? '≥ 20 Miles' : `≤ ${miles} Miles`}
                    </Text>
                    {distanceOption === miles && (
                      <Ionicons name="checkmark" size={20} color={theme.colors.primary[500]} />
                    )}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {dropdownFilter === 'reviews' && (
              <>
                <TouchableOpacity
                  style={[
                    styles.dropdownOption,
                    reviewsOption === 'highest' && styles.dropdownOptionActive,
                  ]}
                  onPress={() => handleOptionSelect('highest')}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      reviewsOption === 'highest' && styles.dropdownOptionTextActive,
                    ]}
                  >
                    Highest
                  </Text>
                  {reviewsOption === 'highest' && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary[500]} />
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dropdownOption,
                    reviewsOption === 'lowest' && styles.dropdownOptionActive,
                  ]}
                  onPress={() => handleOptionSelect('lowest')}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      reviewsOption === 'lowest' && styles.dropdownOptionTextActive,
                    ]}
                  >
                    Lowest
                  </Text>
                  {reviewsOption === 'lowest' && (
                    <Ionicons name="checkmark" size={20} color={theme.colors.primary[500]} />
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </RNModal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
  },
  header: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerDivider: {
    height: 1,
    backgroundColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.lg,
    width: '95%',
    alignSelf: 'center',
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.neutral[500],
  },
  content: {
    flex: 1,
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
  },
  filtersContainer: {
    marginBottom: theme.spacing.lg,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: theme.spacing.sm,
  },
  filterPillsContainer: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
    flexWrap: 'wrap',
    flex: 1,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    borderRadius: theme.radii.full,
    backgroundColor: theme.colors.neutral[50],
  },
  filterPillActive: {
    backgroundColor: theme.colors.white,
    ...theme.shadows.card,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.colors.neutral[500],
  },
  filterPillTextActive: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.neutral[900],
  },
  listContent: {
    paddingBottom: theme.spacing.xl,
  },
  cardWrapper: {
    flex: 1,
    paddingHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.lg,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: theme.spacing['2xl'],
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.sm,
  },
  emptySubtext: {
    fontSize: 14,
    color: theme.colors.neutral[500],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdownContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.sm,
    minWidth: 200,
    maxWidth: 300,
    ...theme.shadows.card,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderRadius: theme.radii.md,
    marginBottom: theme.spacing.xs,
  },
  dropdownOptionActive: {
    backgroundColor: theme.colors.primary[50],
  },
  dropdownOptionText: {
    ...theme.typography.body,
    color: theme.colors.neutral[700],
  },
  dropdownOptionTextActive: {
    color: theme.colors.primary[500],
    fontWeight: '600',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
  },
  clearFiltersText: {
    ...theme.typography.body,
    fontSize: 13,
    color: theme.colors.neutral[500],
    fontWeight: '500',
  },
});
