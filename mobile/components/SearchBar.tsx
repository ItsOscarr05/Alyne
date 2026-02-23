import { View, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFilterPress?: () => void;
}

export function SearchBar({ value, onChangeText, placeholder = 'Search providers...', onFilterPress }: SearchBarProps) {
  const { theme: themeHook } = useTheme();
  
  return (
    <View style={styles.container}>
      <View style={[styles.searchContainer, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.border }]}>
        <Ionicons name="search" size={20} color={themeHook.colors.textTertiary} style={styles.searchIcon} />
        <TextInput
          style={[styles.input, { color: themeHook.colors.text }]}
          placeholder={placeholder}
          placeholderTextColor={themeHook.colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
        />
        {value.length > 0 && (
          <TouchableOpacity onPress={() => onChangeText('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color={themeHook.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>
      {onFilterPress && (
        <TouchableOpacity style={[styles.filterButton, { backgroundColor: themeHook.colors.primaryLight, borderColor: themeHook.colors.primaryLight }]} onPress={onFilterPress}>
          <Ionicons name="options-outline" size={20} color={themeHook.isDark ? themeHook.colors.white : themeHook.colors.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginBottom: theme.spacing.lg,
  },
  searchContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: theme.radii.md,
    borderWidth: 1,
  },
  searchIcon: {
    marginLeft: theme.spacing.md,
  },
  input: {
    flex: 1,
    minWidth: 0,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    paddingRight: theme.spacing.md,
    fontSize: 16,
  },
  clearButton: {
    padding: theme.spacing.sm,
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
});

