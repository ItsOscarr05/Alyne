import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export default function PrivacyPolicyScreen() {
  const router = useRouter();

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
          <Text style={styles.title}>Privacy Policy</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.headerDivider} />
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>

        <View style={styles.section}>
          <Text style={styles.introParagraph}>
            This Privacy Policy ("Policy") describes how Alyne, Inc. ("Alyne," "we," "us," or "our")
            collects, uses, discloses, and protects your personal information when you access or use
            our mobile application, website, and related services (collectively, the "Service"). By
            using the Service, you consent to the data practices described in this Policy. If you do
            not agree with the terms of this Policy, please do not use the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Information We Collect</Text>
          <Text style={styles.subsectionTitle}>1.1 Information You Provide Directly</Text>
          <Text style={styles.paragraph}>
            We collect information that you voluntarily provide to us when you register for an
            account, create a profile, make a booking, communicate with other users, or otherwise
            interact with the Service. This information may include, but is not limited to:
          </Text>
          <Text style={styles.bulletPoint}>
            • Personal identification information, including your full name, email address,
            telephone number, date of birth, and government-issued identification numbers when
            required for verification purposes
          </Text>
          <Text style={styles.bulletPoint}>
            • Profile information, including photographs, biographical information, professional
            credentials, certifications, licenses, and qualifications
          </Text>
          <Text style={styles.bulletPoint}>
            • Payment information, including credit card numbers, bank account details, and billing
            addresses processed through our third-party payment processors
          </Text>
          <Text style={styles.bulletPoint}>
            • Location data, including physical addresses, geographic coordinates, and
            location-based preferences
          </Text>
          <Text style={styles.bulletPoint}>
            • Communications and content, including messages exchanged through the Service, reviews,
            ratings, feedback, and any other content you submit
          </Text>

          <Text style={styles.subsectionTitle}>1.2 Automatically Collected Information</Text>
          <Text style={styles.paragraph}>
            When you access or use the Service, we automatically collect certain information about
            your device and usage patterns, including:
          </Text>
          <Text style={styles.bulletPoint}>
            • Device information, including device type, operating system, unique device
            identifiers, mobile network information, and device settings
          </Text>
          <Text style={styles.bulletPoint}>
            • Log data, including IP addresses, access times, pages viewed, features used, and other
            system activity
          </Text>
          <Text style={styles.bulletPoint}>
            • Usage information, including booking history, search queries, interaction patterns,
            and preferences
          </Text>
          <Text style={styles.bulletPoint}>
            • Cookies and similar tracking technologies, as further described in Section 7 below
          </Text>

          <Text style={styles.subsectionTitle}>1.3 Information from Third Parties</Text>
          <Text style={styles.paragraph}>
            We may receive information about you from third-party sources, including payment
            processors, identity verification services, background check providers, social media
            platforms (when you choose to connect your account), and other service providers that
            assist us in operating the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
          <Text style={styles.paragraph}>
            We use the information we collect for the following business and commercial purposes:
          </Text>
          <Text style={styles.bulletPoint}>
            • To provide, operate, maintain, and improve the Service, including facilitating
            bookings, processing payments, and enabling communications between users
          </Text>
          <Text style={styles.bulletPoint}>
            • To authenticate your identity, verify your credentials, and ensure compliance with our
            Terms of Service
          </Text>
          <Text style={styles.bulletPoint}>
            • To send you administrative communications, including service updates, security alerts,
            and account notifications
          </Text>
          <Text style={styles.bulletPoint}>
            • To personalize your experience, including recommending providers, services, and
            content that may be of interest to you
          </Text>
          <Text style={styles.bulletPoint}>
            • To detect, prevent, and address fraud, abuse, security issues, and other harmful or
            illegal activities
          </Text>
          <Text style={styles.bulletPoint}>
            • To comply with legal obligations, respond to legal process, enforce our agreements,
            and protect our rights and the rights of our users
          </Text>
          <Text style={styles.bulletPoint}>
            • To conduct research, analytics, and data analysis to improve our Service and develop
            new features
          </Text>
          <Text style={styles.bulletPoint}>
            • To communicate with you about promotions, marketing materials, and other information
            that may be of interest (you may opt out at any time as described in Section 5)
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Information Sharing and Disclosure</Text>
          <Text style={styles.subsectionTitle}>3.1 Service Providers and Business Partners</Text>
          <Text style={styles.paragraph}>
            We may share your information with third-party service providers, contractors, and
            business partners who perform services on our behalf, including payment processing, data
            storage, analytics, customer support, identity verification, background checks, and
            marketing. These entities are contractually obligated to use your information solely for
            the purposes for which it was disclosed and in accordance with this Policy.
          </Text>

          <Text style={styles.subsectionTitle}>3.2 Other Users</Text>
          <Text style={styles.paragraph}>
            When you create a profile or make a booking, certain information will be visible to
            other users of the Service, including your name, profile photo, ratings, reviews, and
            service listings. Messages exchanged through the Service are visible to the intended
            recipients.
          </Text>

          <Text style={styles.subsectionTitle}>
            3.3 Legal Requirements and Protection of Rights
          </Text>
          <Text style={styles.paragraph}>
            We may disclose your information if required to do so by law or in response to valid
            requests by public authorities (e.g., court orders, subpoenas, or government
            investigations). We may also disclose information when we believe in good faith that
            disclosure is necessary to protect our rights, protect your safety or the safety of
            others, investigate fraud or security issues, or respond to government requests.
          </Text>

          <Text style={styles.subsectionTitle}>3.4 Business Transfers</Text>
          <Text style={styles.paragraph}>
            In the event of a merger, acquisition, reorganization, bankruptcy, or sale of all or
            substantially all of our assets, your information may be transferred to the acquiring
            entity or successor organization, subject to the same privacy protections set forth in
            this Policy.
          </Text>

          <Text style={styles.subsectionTitle}>3.5 With Your Consent</Text>
          <Text style={styles.paragraph}>
            We may share your information with third parties when you have provided explicit consent
            for such sharing, including when you authorize connections to third-party services or
            applications.
          </Text>

          <Text style={styles.paragraph}>
            We do not sell, rent, or lease your personal information to third parties for their
            marketing purposes without your explicit consent.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Security</Text>
          <Text style={styles.paragraph}>
            We implement industry-standard technical, administrative, and organizational security
            measures designed to protect your personal information against unauthorized access,
            alteration, disclosure, or destruction. These measures include, but are not limited to:
          </Text>
          <Text style={styles.bulletPoint}>
            • Encryption of data in transit using Transport Layer Security (TLS) and Secure Sockets
            Layer (SSL) protocols
          </Text>
          <Text style={styles.bulletPoint}>
            • Encryption of sensitive data at rest using industry-standard encryption algorithms
          </Text>
          <Text style={styles.bulletPoint}>
            • Regular security assessments, vulnerability testing, and penetration testing
          </Text>
          <Text style={styles.bulletPoint}>
            • Access controls and authentication mechanisms to limit access to personal information
            to authorized personnel only
          </Text>
          <Text style={styles.bulletPoint}>
            • Employee training on data security and privacy best practices
          </Text>
          <Text style={styles.paragraph}>
            However, no method of transmission over the Internet or method of electronic storage is
            100% secure. While we strive to use commercially acceptable means to protect your
            personal information, we cannot guarantee absolute security. You acknowledge and agree
            that you provide your information at your own risk.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Your Rights and Choices</Text>
          <Text style={styles.paragraph}>
            Depending on your jurisdiction, you may have certain rights regarding your personal
            information, including:
          </Text>
          <Text style={styles.bulletPoint}>
            • Right of Access: You may request access to the personal information we hold about you
            and receive a copy of such information
          </Text>
          <Text style={styles.bulletPoint}>
            • Right of Rectification: You may request correction of inaccurate or incomplete
            personal information
          </Text>
          <Text style={styles.bulletPoint}>
            • Right of Erasure: You may request deletion of your personal information, subject to
            certain exceptions for legal compliance and legitimate business interests
          </Text>
          <Text style={styles.bulletPoint}>
            • Right to Restrict Processing: You may request that we limit how we use your personal
            information in certain circumstances
          </Text>
          <Text style={styles.bulletPoint}>
            • Right to Data Portability: You may request a copy of your personal information in a
            structured, machine-readable format
          </Text>
          <Text style={styles.bulletPoint}>
            • Right to Object: You may object to certain processing activities, including direct
            marketing and processing based on legitimate interests
          </Text>
          <Text style={styles.bulletPoint}>
            • Right to Withdraw Consent: Where processing is based on consent, you may withdraw your
            consent at any time
          </Text>
          <Text style={styles.paragraph}>
            To exercise these rights, please contact us at privacy@alyne.com. We will respond to
            your request within a reasonable timeframe and in accordance with applicable law. We may
            require verification of your identity before processing certain requests.
          </Text>
          <Text style={styles.paragraph}>
            You may also opt out of marketing communications by following the unsubscribe
            instructions in our emails or by adjusting your account settings within the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Data Retention</Text>
          <Text style={styles.paragraph}>
            We retain your personal information for as long as necessary to fulfill the purposes
            outlined in this Policy, unless a longer retention period is required or permitted by
            law. When determining retention periods, we consider the amount, nature, and sensitivity
            of the information, the potential risk of harm from unauthorized use or disclosure, the
            purposes for which we process the information, and applicable legal requirements.
          </Text>
          <Text style={styles.paragraph}>
            When personal information is no longer needed, we will securely delete or anonymize it
            in accordance with our data retention policies and applicable law. However, we may
            retain certain information for longer periods when required by law, to resolve disputes,
            enforce our agreements, or protect our legitimate business interests.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Cookies and Tracking Technologies</Text>
          <Text style={styles.paragraph}>
            We use cookies, web beacons, pixel tags, and similar tracking technologies to collect
            information about your interactions with the Service. These technologies help us analyze
            usage patterns, personalize content, and improve the Service. You can control cookies
            through your browser settings, though disabling cookies may limit your ability to use
            certain features of the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Children's Privacy</Text>
          <Text style={styles.paragraph}>
            The Service is not intended for individuals under the age of 18. We do not knowingly
            collect personal information from children under 18. If we become aware that we have
            collected personal information from a child under 18, we will take steps to delete such
            information promptly. If you believe we have collected information from a child under
            18, please contact us immediately at privacy@alyne.com.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. International Data Transfers</Text>
          <Text style={styles.paragraph}>
            Your information may be transferred to, and maintained on, computers located outside of
            your state, province, country, or other governmental jurisdiction where data protection
            laws may differ from those in your jurisdiction. By using the Service, you consent to
            the transfer of your information to facilities located outside your jurisdiction. We
            will take appropriate measures to ensure that your information receives an adequate
            level of protection in accordance with this Policy and applicable law.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. California Privacy Rights</Text>
          <Text style={styles.paragraph}>
            If you are a California resident, you have additional rights under the California
            Consumer Privacy Act (CCPA), including the right to know what personal information we
            collect, the right to delete personal information, the right to opt out of the sale of
            personal information (we do not sell personal information), and the right to
            non-discrimination for exercising your privacy rights. To exercise these rights, please
            contact us at privacy@alyne.com.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Changes to This Privacy Policy</Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify this Privacy Policy at any time. We will notify you of
            any material changes by posting the updated Policy on the Service and updating the "Last
            updated" date. Your continued use of the Service after such modifications constitutes
            your acceptance of the updated Policy. We encourage you to review this Policy
            periodically to stay informed about how we collect, use, and protect your information.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our
            data practices, please contact us at:
          </Text>
          <Text style={styles.paragraph}>
            Alyne, Inc.{'\n'}
            Email: privacy@alyne.com{'\n'}
            Address: [Your Business Address]
          </Text>
          <Text style={styles.paragraph}>
            For users in the European Economic Area (EEA), you also have the right to lodge a
            complaint with your local data protection authority if you believe we have not
            adequately addressed your concerns.
          </Text>
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
    paddingBottom: theme.spacing.xl,
  },
  lastUpdated: {
    ...theme.typography.caption,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.xl,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
  },
  paragraph: {
    ...theme.typography.body,
    color: theme.colors.neutral[700],
    lineHeight: 24,
    marginBottom: theme.spacing.sm,
  },
  introParagraph: {
    ...theme.typography.body,
    color: theme.colors.neutral[700],
    lineHeight: 24,
    marginBottom: theme.spacing.lg,
    fontStyle: 'italic',
  },
  subsectionTitle: {
    ...theme.typography.body,
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.neutral[900],
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  bulletPoint: {
    ...theme.typography.body,
    color: theme.colors.neutral[700],
    lineHeight: 24,
    marginLeft: theme.spacing.md,
    marginBottom: theme.spacing.xs,
  },
});
