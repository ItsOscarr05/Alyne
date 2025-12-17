import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export default function WelcomeScreen() {
  const router = useRouter();

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
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.logoContainer}>
            <View style={styles.logoCircle}>
              <Ionicons name="heart" size={48} color={theme.colors.white} />
            </View>
          </View>
          <Text style={styles.title}>Welcome to Alyne</Text>
          <Text style={styles.subtitle}>
            Connect with wellness professionals in your area
          </Text>
        </View>

        {/* Features Section */}
        <View style={styles.featuresSection}>
          {features.map((feature, index) => (
            <View key={index} style={styles.featureCard}>
              <View style={styles.featureIconContainer}>
                <Ionicons
                  name={feature.icon as any}
                  size={28}
                  color={theme.colors.primary[500]}
                />
              </View>
              <Text style={styles.featureTitle}>{feature.title}</Text>
              <Text style={styles.featureDescription}>{feature.description}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => router.push('/(auth)/register')}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryButtonText}>Get Started</Text>
          <Ionicons name="arrow-forward" size={20} color={theme.colors.white} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.push('/(auth)/login')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
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
  logoCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.primary[500],
    justifyContent: 'center',
    alignItems: 'center',
    ...theme.shadows.card,
  },
  title: {
    ...theme.typography.display,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.neutral[500],
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
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    ...theme.shadows.card,
    alignItems: 'center',
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  featureTitle: {
    ...theme.typography.h2,
    fontSize: 16,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs,
    textAlign: 'center',
  },
  featureDescription: {
    ...theme.typography.caption,
    color: theme.colors.neutral[500],
    lineHeight: 18,
    textAlign: 'center',
  },
  buttonContainer: {
    paddingHorizontal: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
    paddingTop: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    gap: theme.spacing.md,
  },
  primaryButton: {
    backgroundColor: theme.colors.primary[500],
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
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.md,
    paddingVertical: theme.spacing.lg,
    paddingHorizontal: theme.spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.colors.primary[500],
  },
  secondaryButtonText: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.primary[500],
  },
});

