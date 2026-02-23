import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Platform,
  Animated,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { theme } from '../../theme';
import { ANIMATION_DURATIONS, ANIMATION_EASING } from '../../utils/animations';
import { useTheme } from '../../contexts/ThemeContext';
import { US_CITIES } from '../../data/usCities';
import { US_STATES } from '../../data/usStates';

export interface LocationSuggestion {
  city: string;
  state: string;
  displayName: string;
  lat: number;
  lng: number;
}

interface LocationAutocompleteProps {
  city: string;
  state: string;
  onCityChange: (city: string) => void;
  onStateChange: (state: string) => void;
  onCoordinatesSelect?: (lat: number, lng: number) => void;
  cityPlaceholder?: string;
  statePlaceholder?: string;
}

const DEBOUNCE_MS = 150;

function getAllCitiesAlphabetical(): LocationSuggestion[] {
  return [...US_CITIES]
    .map(([city, state, stateAbbr, lat, lng]) => ({
      city,
      state,
      displayName: `${city}, ${stateAbbr}`,
      lat,
      lng,
    }))
    .sort((a, b) => a.city.localeCompare(b.city, undefined, { sensitivity: 'base' }));
}

function filterLocalCities(query: string): LocationSuggestion[] {
  if (!query.trim()) return ALL_CITIES;
  const q = query.trim().toLowerCase();
  return US_CITIES
    .filter(([city]) => city.toLowerCase().startsWith(q))
    .map(([city, state, stateAbbr, lat, lng]) => ({
      city,
      state,
      displayName: `${city}, ${stateAbbr}`,
      lat,
      lng,
    }))
    .slice(0, 15);
}

const ALL_CITIES = getAllCitiesAlphabetical();

function filterStates(query: string): { name: string; abbr: string }[] {
  if (!query.trim()) return US_STATES.map(([name, abbr]) => ({ name, abbr }));
  const q = query.trim().toLowerCase();
  return US_STATES
    .filter(
      ([name, abbr]) =>
        name.toLowerCase().startsWith(q) || abbr.toLowerCase().startsWith(q)
    )
    .map(([name, abbr]) => ({ name, abbr }))
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

const ALL_STATES = US_STATES.map(([name, abbr]) => ({ name, abbr }));


export const LocationAutocomplete: React.FC<LocationAutocompleteProps> = ({
  city,
  state,
  onCityChange,
  onStateChange,
  onCoordinatesSelect,
  cityPlaceholder = 'Enter city',
  statePlaceholder = 'Enter state',
}) => {
  const { theme: themeHook } = useTheme();
  const [cityFocused, setCityFocused] = useState(false);
  const [stateFocused, setStateFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showingAllCities, setShowingAllCities] = useState(false);
  const [stateSuggestions, setStateSuggestions] = useState<{ name: string; abbr: string }[]>([]);
  const [showStateDropdown, setShowStateDropdown] = useState(false);
  const [showingAllStates, setShowingAllStates] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stateDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cityBorderWidthAnim = useRef(new Animated.Value(1)).current;
  const stateBorderWidthAnim = useRef(new Animated.Value(1)).current;

  const loadSuggestions = useCallback((query: string) => {
    setShowDropdown(true);
    const items = filterLocalCities(query);
    setSuggestions(items);
    setShowingAllCities(!query.trim());
  }, []);

  const handleCityChange = (text: string) => {
    onCityChange(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text.trim()) {
      setSuggestions(ALL_CITIES);
      setShowingAllCities(true);
      return;
    }
    setShowingAllCities(false);
    // Instant filter for local list — no API, no loading
    debounceRef.current = setTimeout(() => {
      loadSuggestions(text);
    }, DEBOUNCE_MS);
  };

  const handleCityFocus = () => {
    setCityFocused(true);
    setShowDropdown(true);
    if (!city.trim()) {
      setSuggestions(ALL_CITIES);
      setShowingAllCities(true);
    } else {
      loadSuggestions(city);
    }
  };

  const handleSelectSuggestion = (item: LocationSuggestion) => {
    onCityChange(item.city);
    onStateChange(item.state);
    if (onCoordinatesSelect && item.lat && item.lng) {
      onCoordinatesSelect(item.lat, item.lng);
    }
    setSuggestions([]);
    setShowDropdown(false);
  };

  const handleCityBlur = () => {
    setCityFocused(false);
    setTimeout(() => setShowDropdown(false), 200);
  };

  const handleStateChange = (text: string) => {
    onStateChange(text);
    if (stateDebounceRef.current) clearTimeout(stateDebounceRef.current);
    if (!text.trim()) {
      setStateSuggestions(ALL_STATES);
      setShowingAllStates(true);
      return;
    }
    setShowingAllStates(false);
    stateDebounceRef.current = setTimeout(() => {
      const items = filterStates(text);
      setStateSuggestions(items);
    }, DEBOUNCE_MS);
  };

  const handleStateFocus = () => {
    setStateFocused(true);
    setShowStateDropdown(true);
    if (!state.trim()) {
      setStateSuggestions(ALL_STATES);
      setShowingAllStates(true);
    } else {
      const items = filterStates(state);
      setStateSuggestions(items);
      setShowingAllStates(false);
    }
  };

  const handleStateBlur = () => {
    setStateFocused(false);
    setTimeout(() => setShowStateDropdown(false), 200);
  };

  const handleSelectState = (item: { name: string; abbr: string }) => {
    onStateChange(item.name);
    setStateSuggestions([]);
    setShowStateDropdown(false);
  };

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (stateDebounceRef.current) clearTimeout(stateDebounceRef.current);
    };
  }, []);

  useEffect(() => {
    Animated.timing(cityBorderWidthAnim, {
      toValue: cityFocused ? 2 : 1,
      duration: ANIMATION_DURATIONS.FAST,
      easing: ANIMATION_EASING.easeInOut,
      useNativeDriver: false,
    }).start();
  }, [cityFocused, cityBorderWidthAnim]);

  useEffect(() => {
    Animated.timing(stateBorderWidthAnim, {
      toValue: stateFocused ? 2 : 1,
      duration: ANIMATION_DURATIONS.FAST,
      easing: ANIMATION_EASING.easeInOut,
      useNativeDriver: false,
    }).start();
  }, [stateFocused, stateBorderWidthAnim]);

  const cityBorderColor = cityFocused ? themeHook.colors.primary : themeHook.colors.border;
  const stateBorderColor = stateFocused ? themeHook.colors.primary : themeHook.colors.border;

  return (
    <View style={styles.container}>
      {/* City label + input - stays fully above dropdown */}
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: themeHook.colors.text }]}>City</Text>
        <View style={styles.inputWrapper}>
          <Animated.View
            style={[
              styles.animatedBorder,
              {
                borderWidth: cityBorderWidthAnim,
                borderColor: cityBorderColor,
              },
            ]}
            pointerEvents="none"
          />
          <TextInput
            style={[styles.input, { borderWidth: 0, backgroundColor: themeHook.colors.surface, color: themeHook.colors.text }]}
            placeholder={cityPlaceholder}
            value={city}
            onChangeText={handleCityChange}
            onFocus={handleCityFocus}
            onBlur={handleCityBlur}
            autoCapitalize="words"
            placeholderTextColor={themeHook.colors.textTertiary}
            autoComplete="off"
          />
        </View>
      </View>

      {/* Dropdown rendered in-flow below city, above state - no overlap */}
      {showDropdown && suggestions.length > 0 && (
        <View
          style={[
            styles.dropdown,
            {
              backgroundColor: themeHook.colors.surface,
              borderColor: themeHook.colors.border,
            },
          ]}
        >
          {showingAllCities && (
            <View style={[styles.dropdownSectionHeader, { borderBottomColor: themeHook.colors.border }]}>
              <Text style={[styles.dropdownSectionLabel, { color: themeHook.colors.textSecondary }]}>
                All cities (A–Z)
              </Text>
            </View>
          )}
          <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.dropdownScroll}
            >
              {suggestions.map((item, index) => (
                <TouchableOpacity
                  key={`${item.city}-${item.state}-${index}`}
                  style={[
                    styles.dropdownItem,
                    index < suggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: themeHook.colors.border },
                  ]}
                  onPress={() => handleSelectSuggestion(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownItemText, { color: themeHook.colors.text }]}>
                    {item.displayName}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
        </View>
      )}

      {/* State label + input - with dropdown for manual entry */}
      <View style={styles.inputContainer}>
        <Text style={[styles.label, { color: themeHook.colors.text }]}>State</Text>
        <View style={styles.inputWrapper}>
          <Animated.View
            style={[
              styles.animatedBorder,
              {
                borderWidth: stateBorderWidthAnim,
                borderColor: stateBorderColor,
              },
            ]}
            pointerEvents="none"
          />
          <TextInput
            style={[styles.input, { borderWidth: 0, backgroundColor: themeHook.colors.surface, color: themeHook.colors.text }]}
            placeholder={statePlaceholder}
            value={state}
            onChangeText={handleStateChange}
            onFocus={handleStateFocus}
            onBlur={handleStateBlur}
            autoCapitalize="words"
            placeholderTextColor={themeHook.colors.textTertiary}
            autoComplete="off"
          />
        </View>

        {showStateDropdown && stateSuggestions.length > 0 && (
          <View
            style={[
              styles.dropdown,
              {
                backgroundColor: themeHook.colors.surface,
                borderColor: themeHook.colors.border,
              },
            ]}
          >
            {showingAllStates && (
              <View style={[styles.dropdownSectionHeader, { borderBottomColor: themeHook.colors.border }]}>
                <Text style={[styles.dropdownSectionLabel, { color: themeHook.colors.textSecondary }]}>
                  All states (A–Z)
                </Text>
              </View>
            )}
            <ScrollView
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              style={styles.dropdownScroll}
            >
              {stateSuggestions.map((item, index) => (
                <TouchableOpacity
                  key={`${item.name}-${item.abbr}`}
                  style={[
                    styles.dropdownItem,
                    index < stateSuggestions.length - 1 && { borderBottomWidth: 1, borderBottomColor: themeHook.colors.border },
                  ]}
                  onPress={() => handleSelectState(item)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dropdownItemText, { color: themeHook.colors.text }]}>
                    {item.name} ({item.abbr})
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {},
  inputContainer: {},
  inputWrapper: {
    position: 'relative',
  },
  animatedBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: theme.radii.md,
    pointerEvents: 'none',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: theme.spacing.sm,
  },
  input: {
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
    fontSize: 16,
    ...(Platform.OS === 'web' && {
      outlineStyle: 'none',
    }),
  },
  dropdown: {
    marginTop: theme.spacing.sm,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    maxHeight: 220,
    zIndex: 9999,
    elevation: 9999,
    ...(Platform.OS === 'web' && {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    }),
  },
  dropdownScroll: {
    maxHeight: 220,
  },
  dropdownSectionHeader: {
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.lg,
    borderBottomWidth: 1,
  },
  dropdownSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dropdownLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
  },
  dropdownLoadingText: {
    fontSize: 14,
  },
  dropdownItem: {
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  dropdownItemText: {
    fontSize: 15,
  },
});
