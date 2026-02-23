import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { theme } from '../../theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const themeHook = useTheme();

  const features = [
    {
      icon: 'search-outline',
      title: 'Discover Providers',
      description: 'Find trusted wellness professionals near you',
    },
    {
      icon: 'calendar-outline',
      title: 'Book Sessions',
      description: 'Schedule appointments that work for you',
    },
    {
      icon: 'chatbubbles-outline',
      title: 'Stay Connected',
      description: 'Message providers directly and securely',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: themeHook.colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <Image
              source={require('../../assets/image-removebg-preview_dark.png')}
              style={styles.logoImage}
              contentFit="contain"
            />
          </View>
          <Text style={[styles.title, { color: themeHook.colors.text }]}>Welcome to Alyne</Text>
          <Text style={[styles.subtitle, { color: themeHook.colors.textSecondary }]}>
            Connect with wellness professionals in your area
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          {features.map((feature, index) => (
            <View
              key={index}
              style={[
                styles.featureCard,
                {
                  backgroundColor: themeHook.colors.surface,
                  borderColor: themeHook.colors.primary,
                },
              ]}
            >
              <View
                style={[
                  styles.featureIconContainer,
                  { backgroundColor: themeHook.colors.primaryLight },
                ]}
              >
                <Ionicons name={feature.icon as any} size={28} color={themeHook.colors.primary} />
              </View>
              <Text style={[styles.featureTitle, { color: themeHook.colors.text }]}>
                {feature.title}
              </Text>
              <Text style={[styles.featureDescription, { color: themeHook.colors.textSecondary }]}>
                {feature.description}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.buttonContainer, { backgroundColor: themeHook.colors.background }]}>
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: themeHook.colors.primary }]}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={themeHook.colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            { backgroundColor: themeHook.colors.surface, borderColor: themeHook.colors.primary },
          ]}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={[styles.secondaryButtonText, { color: themeHook.colors.primary }]}>
            Sign In
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: theme.spacing['2xl'],
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: theme.spacing['2xl'] * 2,
    paddingBottom: theme.spacing['2xl'],
    paddingHorizontal: theme.spacing.xl,
  },
  logoContainer: {
    marginBottom: theme.spacing.xl,
  },
  logoImage: {
    width: 120,
    height: 120,
  },
  title: {
    ...theme.typography.display,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    textAlign: 'center',
    paddingHorizontal: theme.spacing.xl,
    lineHeight: 24,
  },
  featuresSection: {
    paddingHorizontal: theme.spacing.xl,
    marginTop: theme.spacing['2xl'],
    flexDirection: 'row',
    gap: theme.spacing.md,
  },
  featureCard: {
    flex: 1,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    ...theme.shadows.card,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  featureTitle: {
    ...theme.typography.h2,
    fontSize: 16,
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  featureDescription: {
    ...theme.typography.caption,
    lineHeight: 18,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  primaryButton: {
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: theme.spacing.sm,
    ...theme.shadows.card,
  },
  primaryButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.white,
  },
  secondaryButton: {
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  secondaryButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
  },
});
