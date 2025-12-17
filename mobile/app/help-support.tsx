import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { theme } from '../theme';

interface FAQItem {
  question: string;
  answer: string;
}

export default function HelpSupportScreen() {
  const router = useRouter();
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);

  const faqs: FAQItem[] = [
    {
      question: 'How do I book a session?',
      answer: 'Browse providers on the Discover tab, select a provider, choose a service, pick a date and time, then confirm your booking. You\'ll receive a confirmation once the provider accepts.',
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

  const toggleFAQ = (index: number) => {
    setExpandedFAQ(expandedFAQ === index ? null : index);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color={theme.colors.neutral[900]} />
        </TouchableOpacity>
        <Text style={styles.title}>Help & Support</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Contact Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Get in Touch</Text>
          <Text style={styles.sectionDescription}>
            We're here to help! Reach out to us via email.
          </Text>
          
          {contactMethods.map((method, index) => (
            <TouchableOpacity
              key={index}
              style={styles.contactCard}
              onPress={method.action}
              activeOpacity={0.8}
            >
              <View style={styles.contactIconContainer}>
                <Ionicons name={method.icon as any} size={24} color={theme.colors.primary[500]} />
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactTitle}>{method.title}</Text>
                <Text style={styles.contactDescription}>{method.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[500]} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Frequently Asked Questions</Text>
          <Text style={styles.sectionDescription}>
            Find answers to common questions about using Alyne.
          </Text>

          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={styles.faqCard}
              onPress={() => toggleFAQ(index)}
              activeOpacity={0.8}
            >
              <View style={styles.faqHeader}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Ionicons
                  name={expandedFAQ === index ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={theme.colors.neutral[500]}
                />
              </View>
              {expandedFAQ === index && (
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Links Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Links</Text>
          
          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => router.push('/settings/privacy-policy')}
          >
            <Ionicons name="lock-closed-outline" size={20} color={theme.colors.neutral[900]} />
            <Text style={styles.linkText}>Privacy Policy</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[500]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => router.push('/settings/terms-of-service')}
          >
            <Ionicons name="document-text-outline" size={20} color={theme.colors.neutral[900]} />
            <Text style={styles.linkText}>Terms of Service</Text>
            <Ionicons name="chevron-forward" size={20} color={theme.colors.neutral[500]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkCard}
            onPress={() => router.push('/settings/data-security')}
          >
            <Ionicons name="shield-checkmark-outline" size={20} color={theme.colors.neutral[900]} />
            <Text style={styles.linkText}>Data & Security</Text>
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
    backgroundColor: theme.colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.xl,
    paddingTop: theme.spacing['2xl'],
    paddingBottom: theme.spacing.xl,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.neutral[200],
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
    padding: theme.spacing.xl,
  },
  section: {
    marginBottom: theme.spacing['2xl'],
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.sm,
  },
  sectionDescription: {
    ...theme.typography.body,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.lg,
    lineHeight: 22,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
    ...theme.shadows.card,
  },
  contactIconContainer: {
    width: 48,
    height: 48,
    borderRadius: theme.radii.md,
    backgroundColor: theme.colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    ...theme.typography.h2,
    fontSize: 16,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.xs,
  },
  contactDescription: {
    ...theme.typography.caption,
    color: theme.colors.neutral[500],
  },
  faqCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.md,
    ...theme.shadows.card,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: theme.spacing.md,
  },
  faqQuestion: {
    ...theme.typography.body,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    flex: 1,
  },
  faqAnswer: {
    ...theme.typography.body,
    color: theme.colors.neutral[700],
    marginTop: theme.spacing.md,
    lineHeight: 22,
  },
  linkCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: theme.radii.md,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.neutral[200],
    marginBottom: theme.spacing.md,
    gap: theme.spacing.md,
  },
  linkText: {
    ...theme.typography.body,
    color: theme.colors.neutral[900],
    flex: 1,
  },
});

