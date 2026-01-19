import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../../theme';

export default function TabsLayout() {
  const { user, isLoading } = useAuth();
  const { theme: themeHook } = useTheme();
  const insets = useSafeAreaInsets();
  const isProvider = user?.userType === 'PROVIDER';

  // Build options objects conditionally
  const indexOptions: any = {
    title: 'Discover',
    tabBarIcon: ({ color, size, focused }: any) => (
      <Ionicons name={focused ? 'search' : 'search-outline'} size={size} color={color} />
    ),
  };

  // Hide Discover tab for providers
  if (!isLoading && isProvider) {
    indexOptions.href = null;
  }

  const dashboardOptions: any = {
    title: 'Dashboard',
    tabBarIcon: ({ color, size, focused }: any) => (
      <Ionicons name={focused ? 'stats-chart' : 'stats-chart-outline'} size={size} color={color} />
    ),
  };

  // Hide Dashboard tab for clients
  if (!isLoading && !isProvider) {
    dashboardOptions.href = null;
  }

  // Set initial route - default to dashboard
  // The dashboard screen will redirect clients to discover (same pattern as discover redirects providers to dashboard)
  // This way providers see dashboard immediately, just like clients see discover immediately
  const initialRouteName = 'dashboard';

  return (
    <Tabs
      initialRouteName={initialRouteName}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: themeHook.colors.primary,
        tabBarInactiveTintColor: themeHook.colors.textSecondary,
        tabBarStyle: {
          borderTopColor: themeHook.colors.primary,
          borderTopWidth: 2,
          backgroundColor: themeHook.colors.surface,
          paddingBottom: Math.max(insets.bottom, 8),
          height: 60 + Math.max(insets.bottom, 8),
        },
      }}
    >
      <Tabs.Screen name="index" options={indexOptions} />
      <Tabs.Screen name="dashboard" options={dashboardOptions} />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: 'Messages',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'chatbubbles' : 'chatbubbles-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
