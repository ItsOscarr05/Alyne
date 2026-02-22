import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../theme';
import { useTheme } from '../contexts/ThemeContext';

interface FAQItem {
  question: string;
  answer: string;
}

export default function HelpSupportScreen() {
  const router = useRouter();
  const { theme: themeHook } = useTheme();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const animatedHeights = useRef<{ [key: number]: Animated.Value }>({});
  const animatedOpacities = useRef<{ [key: number]: Animated.Value }>({});
  const animatedRotations = useRef<{ [key: number]: Animated.Value }>({});

  const faqs: FAQItem[] = [
    {
      question: 'How do I book a session?',
      answer: 'Browse providers on the Discover tab, select a provider, choose a service, pick a date and time, then confirm your booking. Your booking is confirmed immediately.',
    },
    {
      question: 'How do I pay for a booking?',
      answer: 'After a booking is confirmed, you\'ll see a "Pay Now" button in your Bookings tab. Click it to securely process your payment through our integrated payment system.',
    },
    {
      question: 'Can I cancel a booking?',
      answer: 'Yes, you can cancel bookings from your Bookings tab. Cancellation policies vary by provider, and refunds are processed according to the provider\'s cancellation policy.',
    },
    {
      question: 'How do I message a provider?',
      answer: 'Go to the Messages tab and select a conversation, or start a new conversation by visiting a provider\'s profile and using the message feature.',
    },
    {
      question: 'How do I leave a review?',
      answer: 'After a completed booking, you\'ll see a "Write a Review" button in your Past bookings. Click it to rate and review your experience with the provider.',
    },
    {
      question: 'What if I have a problem with a provider?',
      answer: 'Contact our support team immediately. You can also flag inappropriate reviews or report issues through the provider\'s profile page.',
    },
  ];

  const contactMethods = [
    {
      icon: 'mail-outline',
      title: 'Email Support',
      description: 'support@alyne.com',
      action: () => Linking.openURL('mailto:support@alyne.com'),
    },
  ];


  // Initialize animation values for each FAQ
  useEffect(() => {
    faqs.forEach((_, index) => {
      if (!animatedHeights.current[index]) {
        animatedHeights.current[index] = new Animated.Value(0);
        animatedOpacities.current[index] = new Animated.Value(0);
        animatedRotations.current[index] = new Animated.Value(0);
      }
    });
  }, []);

  const toggleFAQ = (index: number) => {
    const isExpanding = expandedFAQ !== index;
    
    // Initialize if not already initialized
    if (!animatedHeights.current[index]) {
      animatedHeights.current[index] = new Animated.Value(0);
      animatedOpacities.current[index] = new Animated.Value(0);
      animatedRotations.current[index] = new Animated.Value(0);
    }
    
    // Close previously expanded FAQ
    if (expandedFAQ !== null && expandedFAQ !== index) {
      const prevIndex = expandedFAQ;
      if (animatedHeights.current[prevIndex]) {
        Animated.parallel([
          Animated.timing(animatedHeights.current[prevIndex], {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
          }),
          Animated.timing(animatedOpacities.current[prevIndex], {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(animatedRotations.current[prevIndex], {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }

    // Animate current FAQ
    if (isExpanding) {
      animatedHeights.current[index].setValue(0);
      animatedOpacities.current[index].setValue(0);
      
      Animated.parallel([
        Animated.timing(animatedHeights.current[index], {
          toValue: 1,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(animatedOpacities.current[index], {
          toValue: 1,
          duration: 300,
          delay: 50,
          useNativeDriver: true,
        }),
        Animated.timing(animatedRotations.current[index], {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animatedHeights.current[index], {
          toValue: 0,
          duration: 300,
          useNativeDriver: false,
        }),
        Animated.timing(animatedOpacities.current[index], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(animatedRotations.current[index], {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }

    setExpandedFAQ(isExpanding ? index : null);
  };

  const dynamicStyles = useMemo(() => StyleSheet.create({
    section: {
      marginBottom: themeHook.spacing['2xl'],
    },
    sectionTitle: {
      ...theme.typography.h2,
      color: themeHook.colors.text,
      marginBottom: themeHook.spacing.sm,
    },
    sectionDescription: {
      ...theme.typography.body,
      color: themeHook.colors.textSecondary,
      marginBottom: themeHook.spacing.lg,
      lineHeight: 22,
    },
    contactCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeHook.colors.surface,
      borderRadius: theme.radii.md,
      padding: themeHook.spacing.lg,
      borderWidth: 1,
      borderColor: themeHook.colors.border,
      marginBottom: themeHook.spacing.md,
      gap: themeHook.spacing.md,
      ...theme.shadows.card,
    },
    contactIconContainer: {
      width: 48,
      height: 48,
      borderRadius: theme.radii.md,
      backgroundColor: themeHook.colors.primaryLight,
      justifyContent: 'center',
      alignItems: 'center',
    },
    contactTitle: {
      ...theme.typography.h2,
      fontSize: 16,
      color: themeHook.colors.text,
      marginBottom: themeHook.spacing.xs,
    },
    contactDescription: {
      ...theme.typography.caption,
      color: themeHook.colors.textSecondary,
    },
    faqCard: {
      backgroundColor: themeHook.colors.surface,
      borderRadius: theme.radii.md,
      padding: themeHook.spacing.lg,
      borderWidth: 1,
      borderColor: themeHook.colors.border,
      marginBottom: themeHook.spacing.md,
      ...theme.shadows.card,
    },
    faqQuestion: {
      ...theme.typography.body,
      fontWeight: '600',
      color: themeHook.colors.text,
      flex: 1,
    },
    faqAnswer: {
      ...theme.typography.body,
      color: themeHook.colors.textSecondary,
      marginTop: themeHook.spacing.md,
      lineHeight: 22,
    },
    linkCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: themeHook.colors.surface,
      borderRadius: theme.radii.md,
      padding: themeHook.spacing.lg,
      borderWidth: 1,
      borderColor: themeHook.colors.border,
      marginBottom: themeHook.spacing.md,
      gap: themeHook.spacing.md,
    },
    linkText: {
      ...theme.typography.body,
      color: themeHook.colors.text,
      flex: 1,
    },
  }), [themeHook]);

  return (
    <View style={[styles.container, { backgroundColor: themeHook.colors.background, paddingTop: insets.top }]}>
      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, theme.spacing['2xl']) }]}>
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={24} color={themeHook.colors.text} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: themeHook.colors.text }]}>Help & Support</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={[styles.headerDivider, { backgroundColor: themeHook.colors.border }]} />
        {/* Contact Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Get in Touch</Text>
          <Text style={dynamicStyles.sectionDescription}>
            We're here to help! Reach out to us via email.
          </Text>
          
          {contactMethods.map((method, index) => (
            <TouchableOpacity
              key={index}
              style={dynamicStyles.contactCard}
              onPress={method.action}
              activeOpacity={0.8}
            >
              <View style={dynamicStyles.contactIconContainer}>
                <Ionicons name={method.icon as any} size={24} color={themeHook.colors.primary} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={dynamicStyles.contactTitle}>{method.title}</Text>
                <Text style={dynamicStyles.contactDescription}>{method.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Frequently Asked Questions</Text>
          <Text style={dynamicStyles.sectionDescription}>
            Find answers to common questions about using Alyne.
          </Text>

          {faqs.map((faq, index) => {
            const isExpanded = expandedFAQ === index;
            const heightAnim = animatedHeights.current[index] || new Animated.Value(0);
            const opacityAnim = animatedOpacities.current[index] || new Animated.Value(0);
            const rotationAnim = animatedRotations.current[index] || new Animated.Value(0);

            const rotateInterpolate = rotationAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0deg', '180deg'],
            });

            const maxHeight = heightAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 200], // Adjust based on content height
            });

            return (
              <TouchableOpacity
                key={index}
                style={[dynamicStyles.faqCard, isExpanded && { borderColor: themeHook.colors.primary, borderWidth: 2 }]}
                onPress={() => toggleFAQ(index)}
                activeOpacity={0.8}
              >
                <View style={styles.faqHeader}>
                  <Text style={dynamicStyles.faqQuestion}>{faq.question}</Text>
                  <Animated.View
                    style={{
                      transform: [{ rotate: rotateInterpolate }],
                    }}
                  >
                    <Ionicons
                      name="chevron-down"
                      size={20}
                      color={themeHook.colors.textTertiary}
                    />
                  </Animated.View>
                </View>
                <Animated.View
                  style={{
                    maxHeight: maxHeight,
                    opacity: opacityAnim,
                    overflow: 'hidden',
                  }}
                >
                  <Text style={dynamicStyles.faqAnswer}>{faq.answer}</Text>
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Quick Links Section */}
        <View style={dynamicStyles.section}>
          <Text style={dynamicStyles.sectionTitle}>Quick Links</Text>
          
          <TouchableOpacity
            style={dynamicStyles.linkCard}
            onPress={() => router.push('/settings/privacy-policy')}
          >
            <Ionicons name="lock-closed-outline" size={20} color={themeHook.colors.text} />
            <Text style={dynamicStyles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.linkCard}
            onPress={() => router.push('/settings/terms-of-service')}
          >
            <Ionicons name="document-text-outline" size={20} color={themeHook.colors.text} />
            <Text style={dynamicStyles.linkText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textTertiary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={dynamicStyles.linkCard}
            onPress={() => router.push('/settings/data-security')}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={themeHook.colors.text} />
            <Text style={dynamicStyles.linkText}>Data & Security</Text>
            <Ionicons name="chevron-forward" size={20} color={themeHook.colors.textTertiary} />
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
    paddingBottom: theme.spacing.xl,
  },
  contactInfo: {
    flex: 1,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
});
