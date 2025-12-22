import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

// US States list
const US_STATES = [
  'Alabama',
  'Alaska',
  'Arizona',
  'Arkansas',
  'California',
  'Colorado',
  'Connecticut',
  'Delaware',
  'Florida',
  'Georgia',
  'Hawaii',
  'Idaho',
  'Illinois',
  'Indiana',
  'Iowa',
  'Kansas',
  'Kentucky',
  'Louisiana',
  'Maine',
  'Maryland',
  'Massachusetts',
  'Michigan',
  'Minnesota',
  'Mississippi',
  'Missouri',
  'Montana',
  'Nebraska',
  'Nevada',
  'New Hampshire',
  'New Jersey',
  'New Mexico',
  'New York',
  'North Carolina',
  'North Dakota',
  'Ohio',
  'Oklahoma',
  'Oregon',
  'Pennsylvania',
  'Rhode Island',
  'South Carolina',
  'South Dakota',
  'Tennessee',
  'Texas',
  'Utah',
  'Vermont',
  'Virginia',
  'Washington',
  'West Virginia',
  'Wisconsin',
  'Wyoming',
];

// Popular US cities (can be expanded)
const POPULAR_CITIES = [
  'New York',
  'Los Angeles',
  'Chicago',
  'Houston',
  'Phoenix',
  'Philadelphia',
  'San Antonio',
  'San Diego',
  'Dallas',
  'San Jose',
  'Austin',
  'Jacksonville',
  'Fort Worth',
  'Columbus',
  'Charlotte',
  'San Francisco',
  'Indianapolis',
  'Seattle',
  'Denver',
  'Washington',
  'Boston',
  'El Paso',
  'Detroit',
  'Nashville',
  'Portland',
  'Oklahoma City',
  'Las Vegas',
  'Memphis',
  'Louisville',
  'Baltimore',
  'Milwaukee',
  'Albuquerque',
  'Tucson',
  'Fresno',
  'Sacramento',
  'Kansas City',
  'Mesa',
  'Atlanta',
  'Omaha',
  'Colorado Springs',
  'Raleigh',
  'Virginia Beach',
  'Miami',
  'Oakland',
  'Minneapolis',
  'Tulsa',
  'Cleveland',
  'Wichita',
  'Arlington',
  'Tampa',
];

interface LocationAutocompleteProps {
  city: string;
  state: string;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  cityPlaceholder?: string;
  statePlaceholder?: string;
}

export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  city,
  state,
  onCityChange,
  onStateChange,
  cityPlaceholder = 'Enter city',
  statePlaceholder = 'Enter state',
}) => {
  const [showCityDropdown, setShowCityDropdown] = useState(false);
  const [showStateDropdown, setShowStateDropdown] = useState(false);

  // Filter cities based on input
  const filteredCities = useMemo(() => {
    if (!city || city.length < 2) {
      return POPULAR_CITIES.slice(0, 10); // Show top 10 popular cities when empty
    }
    const lowerCity = city.toLowerCase();
    return POPULAR_CITIES.filter((c) => c.toLowerCase().includes(lowerCity)).slice(0, 10);
  }, [city]);

  // Filter states based on input
  const filteredStates = useMemo(() => {
    if (!state || state.length < 1) {
      return US_STATES;
    }
    const lowerState = state.toLowerCase();
    return US_STATES.filter((s) => s.toLowerCase().startsWith(lowerState));
  }, [state]);

  const handleCitySelect = (selectedCity: string) => {
    onCityChange(selectedCity);
    setShowCityDropdown(false);
  };

  const handleStateSelect = (selectedState: string) => {
    onStateChange(selectedState);
    setShowStateDropdown(false);
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          showCityDropdown && styles.inputContainerActive,
          { marginBottom: theme.spacing.lg },
        ]}
      >
        <Text style={styles.label}>City</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={cityPlaceholder}
            value={city}
            onChangeText={(text) => {
              onCityChange(text);
              setShowCityDropdown(text.length > 0);
            }}
            onFocus={() => setShowCityDropdown(city.length > 0 || filteredCities.length > 0)}
            onBlur={() => setTimeout(() => setShowCityDropdown(false), 200)}
            autoCapitalize="words"
          />
          {city && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                onCityChange('');
                setShowCityDropdown(false);
              }}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
          )}
        </View>
        {showCityDropdown && filteredCities.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleCitySelect(item)}
                >
                  <Ionicons name="location-outline" size={16} color={theme.colors.primary[500]} />
                  <Text style={[styles.dropdownItemText, { marginLeft: theme.spacing.sm }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.dropdownList}
              nestedScrollEnabled
            />
          </View>
        )}
      </View>

      <View style={[styles.inputContainer, showStateDropdown && styles.inputContainerActive]}>
        <Text style={styles.label}>State</Text>
        <View style={styles.inputWrapper}>
          <TextInput
            style={styles.input}
            placeholder={statePlaceholder}
            value={state}
            onChangeText={(text) => {
              onStateChange(text);
              setShowStateDropdown(text.length > 0);
            }}
            onFocus={() => setShowStateDropdown(state.length > 0 || filteredStates.length > 0)}
            onBlur={() => setTimeout(() => setShowStateDropdown(false), 200)}
            autoCapitalize="words"
          />
          {state && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => {
                onStateChange('');
                setShowStateDropdown(false);
              }}
            >
              <Ionicons name="close-circle" size={20} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
          )}
        </View>
        {showStateDropdown && filteredStates.length > 0 && (
          <View style={styles.dropdown}>
            <FlatList
              data={filteredStates}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.dropdownItem}
                  onPress={() => handleStateSelect(item)}
                >
                  <Ionicons name="location-outline" size={16} color={theme.colors.primary[500]} />
                  <Text style={[styles.dropdownItemText, { marginLeft: theme.spacing.sm }]}>
                    {item}
                  </Text>
                </TouchableOpacity>
              )}
              style={styles.dropdownList}
              nestedScrollEnabled
            />
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // gap replaced with marginBottom on first input container
  },
  inputContainer: {
    position: 'relative',
    zIndex: 10,
  },
  inputContainerActive: {
    zIndex: 10000,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.sm,
  },
  inputWrapper: {
    position: 'relative',
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
    backgroundColor: theme.colors.white,
    color: theme.colors.neutral[900],
  },
  clearButton: {
    position: 'absolute',
    right: theme.spacing.md,
    padding: theme.spacing.xs,
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginTop: theme.spacing.xs,
    maxHeight: 200,
    zIndex: 9999,
    elevation: 10, // For Android
    ...theme.shadows.card,
  },
  dropdownList: {
    maxHeight: 200,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[50],
  },
  dropdownItemText: {
    fontSize: 16,
    color: theme.colors.neutral[900],
  },
});

