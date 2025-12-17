import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../hooks/useAuth';
import { theme } from '../../theme';

export default function TabsLayout() {
  const { user, isLoading } = useAuth();
  const isProvider = user?.userType === 'PROVIDER';

  // Build options objects conditionally
  const indexOptions: any = {
    title: 'Discover',
    tabBarIcon: ({ color, size, focused }: any) => (
      <Ionicons
        name={focused ? 'search' : 'search-outline'}
        size={size}
        color={color}
      />
    ),
  };
  
  // Hide Discover tab for providers
  if (!isLoading && isProvider) {
    indexOptions.href = null;
  }

  const dashboardOptions: any = {
    title: 'Dashboard',
    tabBarIcon: ({ color, size, focused }: any) => (
      <Ionicons
        name={focused ? 'stats-chart' : 'stats-chart-outline'}
        size={size}
        color={color}
      />
    ),
  };
  
  // Hide Dashboard tab for clients
  if (!isLoading && !isProvider) {
    dashboardOptions.href = null;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary[500],
        tabBarInactiveTintColor: theme.colors.neutral[500],
        tabBarStyle: {
          borderTopColor: theme.colors.neutral[200],
          backgroundColor: theme.colors.white,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={indexOptions}
      />
      <Tabs.Screen
        name="dashboard"
        options={dashboardOptions}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? 'calendar' : 'calendar-outline'}
              size={size}
              color={color}
            />
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
            <Ionicons
              name={focused ? 'person' : 'person-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}

