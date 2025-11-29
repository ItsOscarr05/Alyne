import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { SearchBar } from '../../components/SearchBar';
import { ProviderCard, ProviderCardData } from '../../components/ProviderCard';
import { providerService, DiscoveryFilters } from '../../services/provider';
import { logger } from '../../utils/logger';
import { getUserFriendlyError } from '../../utils/errorMessages';

export default function DiscoverScreen() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [providers, setProviders] = useState<ProviderCardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    requestLocationPermission();
  }, []);

  useEffect(() => {
    loadProviders();
  }, [searchQuery, userLocation]);

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

  const loadProviders = async () => {
    setIsLoading(true);
    try {
      const filters: DiscoveryFilters = {
        radius: 20,
        search: searchQuery || undefined,
      };

      if (userLocation) {
        filters.lat = userLocation.lat;
        filters.lng = userLocation.lng;
      }

      const results = await providerService.discover(filters);
      setProviders(results);
    } catch (error: any) {
      logger.error('Error loading providers', error);
      // Fallback to mock data if API fails
      if (error.code === 'ERR_NETWORK' || error.code === 'ECONNREFUSED') {
        Alert.alert(
          'Connection Error',
          'Unable to connect to server. Using demo data.',
          [{ text: 'OK' }]
        );
        // Use mock data as fallback
        const { mockProviders } = await import('../../data/mockProviders');
        setProviders(mockProviders);
      } else {
        Alert.alert('Error', 'Failed to load providers');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderPress = (providerId: string) => {
    router.push(`/provider/${providerId}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discover Providers</Text>
        <Text style={styles.subtitle}>Find wellness professionals near you</Text>
      </View>

      <View style={styles.content}>
        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search by name or specialty..."
        />

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
            renderItem={({ item }) => (
              <ProviderCard
                provider={item}
                onPress={() => handleProviderPress(item.id)}
              />
            )}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshing={isLoading}
            onRefresh={loadProviders}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 24,
    paddingTop: 60,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1e293b',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  listContent: {
    paddingBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#64748b',
  },
});

