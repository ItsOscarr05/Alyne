import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../contexts/ThemeContext';
import { theme } from '../theme'; // Static theme for spacing, radii, etc.

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme: themeHook, themeMode, setThemeMode, isDark } = useTheme();

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [bookingReminders, setBookingReminders] = useState(true);

  return (
    <View style={[styles.container, { backgroundColor: themeHook.colors.background }]}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeHook.colors.text }]}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />
        {/* Notifications Section */}
        <View style={[styles.section, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.textSecondary }]}>Notifications</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={22} color={themeHook.colors.text} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: themeHook.colors.text }]}>Enable Notifications</Text>
                <Text style={[styles.settingDescription, { color: themeHook.colors.textSecondary }]}>
                  Receive notifications about bookings and messages
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: themeHook.colors.border, true: themeHook.colors.primary }}
              thumbColor={themeHook.colors.white}
            />
          </View>

          {notificationsEnabled && (
            <>
              <View style={[styles.itemDivider, { backgroundColor: themeHook.colors.border }]} />
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="mail-outline" size={22} color={themeHook.colors.text} />
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingLabel, { color: themeHook.colors.text }]}>Email Notifications</Text>
                    <Text style={[styles.settingDescription, { color: themeHook.colors.textSecondary }]}>Receive notifications via email</Text>
                  </View>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  trackColor={{ false: themeHook.colors.border, true: themeHook.colors.primary }}
                  thumbColor={themeHook.colors.white}
                />
              </View>

              <View style={[styles.itemDivider, { backgroundColor: themeHook.colors.border }]} />
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={22}
                    color={themeHook.colors.text}
                  />
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingLabel, { color: themeHook.colors.text }]}>Push Notifications</Text>
                    <Text style={[styles.settingDescription, { color: themeHook.colors.textSecondary }]}>
                      Receive push notifications on your device
                    </Text>
                  </View>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{ false: themeHook.colors.border, true: themeHook.colors.primary }}
                  thumbColor={themeHook.colors.white}
                />
              </View>

              <View style={[styles.itemDivider, { backgroundColor: themeHook.colors.border }]} />
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="calendar-outline" size={22} color={themeHook.colors.text} />
                  <View style={styles.settingTextContainer}>
                    <Text style={[styles.settingLabel, { color: themeHook.colors.text }]}>Booking Reminders</Text>
                    <Text style={[styles.settingDescription, { color: themeHook.colors.textSecondary }]}>
                      Get reminded about upcoming bookings
                    </Text>
                  </View>
                </View>
                <Switch
                  value={bookingReminders}
                  onValueChange={setBookingReminders}
                  trackColor={{ false: themeHook.colors.border, true: themeHook.colors.primary }}
                  thumbColor={themeHook.colors.white}
                />
              </View>
            </>
          )}
        </View>

        {/* Appearance Section */}
        <View style={[styles.section, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.textSecondary }]}>Appearance</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name={isDark ? 'moon' : 'sunny'} size={22} color={themeHook.colors.text} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: themeHook.colors.text }]}>Dark Mode</Text>
                <Text style={[styles.settingDescription, { color: themeHook.colors.textSecondary }]}>
                  {themeMode === 'system' ? 'System default' : isDark ? 'Enabled' : 'Disabled'}
                </Text>
              </View>
            </View>
            <Switch
              value={isDark}
              onValueChange={(value) => setThemeMode(value ? 'dark' : 'light')}
              trackColor={{ false: themeHook.colors.border, true: themeHook.colors.primary }}
              thumbColor={themeHook.colors.white}
            />
          </View>
        </View>

        {/* Privacy Section */}
        <View style={[styles.section, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.textSecondary }]}>Privacy</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/privacy-policy')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="lock-closed-outline" size={22} color={themeHook.colors.text} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: themeHook.colors.text }]}>Privacy Policy</Text>
                <Text style={[styles.settingDescription, { color: themeHook.colors.textSecondary }]}>View our privacy policy</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.itemDivider, { backgroundColor: themeHook.colors.border }]} />
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/data-security')}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={themeHook.colors.text}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: themeHook.colors.text }]}>Data & Security</Text>
                <Text style={[styles.settingDescription, { color: themeHook.colors.textSecondary }]}>
                  Manage your data and security settings
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={[styles.section, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.textSecondary }]}>Account</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => {
              if (user?.userType === 'PROVIDER') {
                router.push('/provider/edit-profile');
              } else {
                router.push('/settings/edit-profile');
              }
            }}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="person-outline" size={22} color={themeHook.colors.text} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: themeHook.colors.text }]}>Edit Profile</Text>
                <Text style={[styles.settingDescription, { color: themeHook.colors.textSecondary }]}>Update your personal information</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textSecondary} />
          </TouchableOpacity>

          <View style={[styles.itemDivider, { backgroundColor: themeHook.colors.border }]} />
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/change-password')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="key-outline" size={22} color={themeHook.colors.text} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: themeHook.colors.text }]}>Change Password</Text>
                <Text style={[styles.settingDescription, { color: themeHook.colors.textSecondary }]}>Update your account password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={[styles.section, { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary }]}>
          <Text style={[styles.sectionTitle, { color: themeHook.colors.textSecondary }]}>About</Text>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={themeHook.colors.text}
              />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: themeHook.colors.text }]}>App Version</Text>
                <Text style={[styles.settingDescription, { color: themeHook.colors.textSecondary }]}>Version 1.0.0</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={[styles.itemDivider, { backgroundColor: themeHook.colors.border }]} />
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/terms-of-service')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="document-text-outline" size={22} color={themeHook.colors.text} />
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingLabel, { color: themeHook.colors.text }]}>Terms of Service</Text>
                <Text style={[styles.settingDescription, { color: themeHook.colors.textSecondary }]}>Read our terms and conditions</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textSecondary} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
  },
  headerDivider: {
    height: 1,
    marginBottom: theme.spacing.lg,
    width: '95%',
    alignSelf: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    ...theme.typography.h1,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing['2xl'],
  },
  section: {
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderRadius: theme.radii.lg,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xs,
    marginHorizontal: theme.spacing.xl,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  itemDivider: {
    height: 1,
    width: '95%',
    alignSelf: 'center',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: theme.spacing.md,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: theme.spacing.xs,
  },
  settingDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
});
