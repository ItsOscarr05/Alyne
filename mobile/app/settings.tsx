import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { theme } from '../theme';

export default function SettingsScreen() {
  const router = useRouter();
  const { user } = useAuth();

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [bookingReminders, setBookingReminders] = useState(true);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.neutral[900]} />
          </TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.headerDivider} />
        {/* Notifications Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notifications</Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons name="notifications-outline" size={22} color={theme.colors.neutral[900]} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Enable Notifications</Text>
                <Text style={styles.settingDescription}>
                  Receive notifications about bookings and messages
                </Text>
              </View>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[500] }}
              thumbColor={theme.colors.white}
            />
          </View>

          {notificationsEnabled && (
            <>
              <View style={styles.itemDivider} />
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="mail-outline" size={22} color={theme.colors.neutral[900]} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Email Notifications</Text>
                    <Text style={styles.settingDescription}>Receive notifications via email</Text>
                  </View>
                </View>
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                  trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[500] }}
                  thumbColor={theme.colors.white}
                />
              </View>

              <View style={styles.itemDivider} />
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons
                    name="phone-portrait-outline"
                    size={22}
                    color={theme.colors.neutral[900]}
                  />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Push Notifications</Text>
                    <Text style={styles.settingDescription}>
                      Receive push notifications on your device
                    </Text>
                  </View>
                </View>
                <Switch
                  value={pushNotifications}
                  onValueChange={setPushNotifications}
                  trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[500] }}
                  thumbColor={theme.colors.white}
                />
              </View>

              <View style={styles.itemDivider} />
              <View style={styles.settingItem}>
                <View style={styles.settingInfo}>
                  <Ionicons name="calendar-outline" size={22} color={theme.colors.neutral[900]} />
                  <View style={styles.settingTextContainer}>
                    <Text style={styles.settingLabel}>Booking Reminders</Text>
                    <Text style={styles.settingDescription}>
                      Get reminded about upcoming bookings
                    </Text>
                  </View>
                </View>
                <Switch
                  value={bookingReminders}
                  onValueChange={setBookingReminders}
                  trackColor={{ false: theme.colors.neutral[200], true: theme.colors.primary[500] }}
                  thumbColor={theme.colors.white}
                />
              </View>
            </>
          )}
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/privacy-policy')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="lock-closed-outline" size={22} color={theme.colors.neutral[900]} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Privacy Policy</Text>
                <Text style={styles.settingDescription}>View our privacy policy</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[500]} />
          </TouchableOpacity>

          <View style={styles.itemDivider} />
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/data-security')}
          >
            <View style={styles.settingInfo}>
              <Ionicons
                name="shield-checkmark-outline"
                size={22}
                color={theme.colors.neutral[900]}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Data & Security</Text>
                <Text style={styles.settingDescription}>
                  Manage your data and security settings
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[500]} />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/edit-profile')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="person-outline" size={22} color={theme.colors.neutral[900]} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Edit Profile</Text>
                <Text style={styles.settingDescription}>Update your personal information</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[500]} />
          </TouchableOpacity>

          <View style={styles.itemDivider} />
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/change-password')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="key-outline" size={22} color={theme.colors.neutral[900]} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Change Password</Text>
                <Text style={styles.settingDescription}>Update your account password</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[500]} />
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Ionicons
                name="information-circle-outline"
                size={22}
                color={theme.colors.neutral[900]}
              />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>App Version</Text>
                <Text style={styles.settingDescription}>Version 1.0.0</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.itemDivider} />
          <TouchableOpacity
            style={styles.settingItem}
            onPress={() => router.push('/settings/terms-of-service')}
          >
            <View style={styles.settingInfo}>
              <Ionicons name="document-text-outline" size={22} color={theme.colors.neutral[900]} />
              <View style={styles.settingTextContainer}>
                <Text style={styles.settingLabel}>Terms of Service</Text>
                <Text style={styles.settingDescription}>Read our terms and conditions</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[500]} />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.neutral[50],
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
    backgroundColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.lg,
    width: '95%',
    alignSelf: 'center',
  },
  backButton: {
    padding: theme.spacing.xs,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.neutral[900],
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
    backgroundColor: theme.colors.white,
    marginTop: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
    borderRadius: theme.radii.lg,
    paddingHorizontal: 0,
    overflow: 'hidden',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.neutral[500],
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
    backgroundColor: theme.colors.neutral[200],
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
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs,
  },
  settingDescription: {
    fontSize: 13,
    color: theme.colors.neutral[500],
    lineHeight: 18,
  },
});
