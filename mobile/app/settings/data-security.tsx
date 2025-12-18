import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export default function DataSecurityScreen() {
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
          <Text style={styles.title}>Data & Security</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.headerDivider} />
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>

        <View style={styles.section}>
          <Text style={styles.introParagraph}>
            This Data & Security Policy ("Security Policy") describes the comprehensive security measures,
            data protection practices, and security protocols implemented by Alyne, Inc. ("Alyne," "we,"
            "us," or "our") to safeguard your personal information, protect your account, and ensure the
            integrity and confidentiality of data transmitted through our mobile application, website, and
            related services (collectively, the "Service"). This Security Policy supplements our Privacy
            Policy and Terms of Service and outlines our commitment to maintaining the highest standards
            of data security and protection.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Data Protection and Encryption</Text>
          <Text style={styles.subsectionTitle}>1.1 Encryption Standards</Text>
          <Text style={styles.paragraph}>
            We employ industry-standard encryption technologies to protect your data both in transit and
            at rest. All data transmitted between your device and our servers is encrypted using Transport
            Layer Security (TLS) 1.2 or higher protocols, ensuring that your information cannot be
            intercepted or accessed by unauthorized parties during transmission.
          </Text>
          <Text style={styles.paragraph}>
            Data stored on our servers is encrypted at rest using Advanced Encryption Standard (AES-256),
            which is the same encryption standard used by financial institutions and government agencies.
            This ensures that even in the unlikely event of unauthorized access to our storage systems,
            your data remains protected and unreadable.
          </Text>
          <Text style={styles.subsectionTitle}>1.2 Security Infrastructure</Text>
          <Text style={styles.paragraph}>
            Our security infrastructure is designed with multiple layers of protection, including:
          </Text>
          <Text style={styles.bulletPoint}>
            • Firewall protection and intrusion detection systems that monitor and block unauthorized
            access attempts
          </Text>
          <Text style={styles.bulletPoint}>
            • Regular security audits and vulnerability assessments conducted by independent third-party
            security firms
          </Text>
          <Text style={styles.bulletPoint}>
            • Secure data centers with physical access controls, 24/7 monitoring, and environmental
            safeguards
          </Text>
          <Text style={styles.bulletPoint}>
            • Automated security monitoring and threat detection systems that identify and respond to
            potential security incidents in real-time
          </Text>
          <Text style={styles.bulletPoint}>
            • Regular security patches and updates to address newly discovered vulnerabilities
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Account Security</Text>
          <Text style={styles.subsectionTitle}>2.1 Password Requirements</Text>
          <Text style={styles.paragraph}>
            We require strong, unique passwords for all user accounts. Your password must meet the
            following minimum requirements:
          </Text>
          <Text style={styles.bulletPoint}>
            • At least 8 characters in length (we recommend 12 or more characters)
          </Text>
          <Text style={styles.bulletPoint}>
            • A combination of uppercase and lowercase letters, numbers, and special characters
          </Text>
          <Text style={styles.bulletPoint}>
            • Not be a password you use for other accounts or services
          </Text>
          <Text style={styles.paragraph}>
            Passwords are stored using one-way cryptographic hashing algorithms (bcrypt) with salt,
            meaning we cannot retrieve your original password. If you forget your password, you must
            reset it through our secure password recovery process.
          </Text>
          <Text style={styles.subsectionTitle}>2.2 Two-Factor Authentication</Text>
          <Text style={styles.paragraph}>
            We strongly recommend enabling two-factor authentication (2FA) for your account when
            available. Two-factor authentication adds an additional layer of security by requiring a
            second form of verification (such as a code sent to your mobile device) in addition to your
            password. This significantly reduces the risk of unauthorized access even if your password is
            compromised.
          </Text>
          <Text style={styles.subsectionTitle}>2.3 Account Activity Monitoring</Text>
          <Text style={styles.paragraph}>
            We monitor account activity for signs of unauthorized access, including:
          </Text>
          <Text style={styles.bulletPoint}>
            • Login attempts from new devices or locations
          </Text>
          <Text style={styles.bulletPoint}>
            • Multiple failed login attempts
          </Text>
          <Text style={styles.bulletPoint}>
            • Unusual patterns of activity or transactions
          </Text>
          <Text style={styles.paragraph}>
            If we detect suspicious activity, we may temporarily suspend your account and notify you
            immediately to verify the activity. You are responsible for maintaining the confidentiality
            of your account credentials and for all activities that occur under your account.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. Payment Security</Text>
          <Text style={styles.subsectionTitle}>3.1 PCI DSS Compliance</Text>
          <Text style={styles.paragraph}>
            All payment transactions are processed through secure, Payment Card Industry Data Security
            Standard (PCI DSS) Level 1 compliant payment processors. We do not store, process, or
            transmit full credit card numbers, card verification values (CVV), or other sensitive payment
            card data on our servers. All payment information is handled exclusively by our certified
            payment processing partners, who maintain the highest levels of security and compliance.
          </Text>
          <Text style={styles.subsectionTitle}>3.2 Payment Data Handling</Text>
          <Text style={styles.paragraph}>
            When you make a payment through our Service:
          </Text>
          <Text style={styles.bulletPoint}>
            • Payment information is transmitted directly to our PCI-compliant payment processors using
            encrypted connections
          </Text>
          <Text style={styles.bulletPoint}>
            • We only store tokenized payment references and the last four digits of your payment card
            for identification and transaction history purposes
          </Text>
          <Text style={styles.bulletPoint}>
            • Full payment card details are never stored on our servers or accessible to our employees
          </Text>
          <Text style={styles.bulletPoint}>
            • All payment transactions are logged and monitored for fraudulent activity
          </Text>
          <Text style={styles.subsectionTitle}>3.3 Fraud Prevention</Text>
          <Text style={styles.paragraph}>
            We employ advanced fraud detection and prevention systems that analyze transaction patterns,
            device information, and behavioral indicators to identify and prevent fraudulent transactions.
            Suspicious transactions may be flagged for manual review or declined to protect both you and
            our platform from fraud.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Data Retention and Deletion</Text>
          <Text style={styles.subsectionTitle}>4.1 Retention Periods</Text>
          <Text style={styles.paragraph}>
            We retain your personal information only for as long as necessary to:
          </Text>
          <Text style={styles.bulletPoint}>
            • Provide our services and fulfill our contractual obligations to you
          </Text>
          <Text style={styles.bulletPoint}>
            • Comply with legal, regulatory, and tax obligations
          </Text>
          <Text style={styles.bulletPoint}>
            • Resolve disputes and enforce our agreements
          </Text>
          <Text style={styles.bulletPoint}>
            • Maintain accurate business records as required by law
          </Text>
          <Text style={styles.paragraph}>
            The specific retention period varies depending on the type of data and applicable legal
            requirements. For example, transaction records may be retained for up to 7 years to comply
            with tax and accounting regulations, while account information may be retained until you
            request deletion or your account is terminated.
          </Text>
          <Text style={styles.subsectionTitle}>4.2 Data Deletion</Text>
          <Text style={styles.paragraph}>
            You have the right to request deletion of your personal information at any time, subject to
            certain legal and contractual limitations. Upon receiving a valid deletion request, we will:
          </Text>
          <Text style={styles.bulletPoint}>
            • Delete or anonymize your personal information from our active systems within 30 days
          </Text>
          <Text style={styles.bulletPoint}>
            • Remove your data from our backup systems during the next scheduled backup cycle
          </Text>
          <Text style={styles.bulletPoint}>
            • Retain only the minimum information necessary to comply with legal obligations or resolve
            disputes
          </Text>
          <Text style={styles.paragraph}>
            Please note that some information may be retained in anonymized or aggregated form for
            analytical purposes, and we may be required to retain certain information to comply with
            legal obligations, resolve disputes, or enforce our agreements.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Your Data Rights and Control</Text>
          <Text style={styles.subsectionTitle}>5.1 Access and Portability</Text>
          <Text style={styles.paragraph}>
            You have the right to access, review, and obtain a copy of your personal information held by
            us. You can access most of your information directly through your account settings. For
            additional information or to request a complete copy of your data, please contact us using
            the information provided in Section 8.
          </Text>
          <Text style={styles.subsectionTitle}>5.2 Correction and Updates</Text>
          <Text style={styles.paragraph}>
            You can update most of your personal information directly through your account settings. We
            encourage you to keep your information accurate and up-to-date. If you need assistance
            updating information or believe that any information we hold about you is inaccurate or
            incomplete, please contact us immediately.
          </Text>
          <Text style={styles.subsectionTitle}>5.3 Account Settings and Preferences</Text>
          <Text style={styles.paragraph}>
            Through your account settings, you can:
          </Text>
          <Text style={styles.bulletPoint}>
            • Update your profile information, contact details, and preferences
          </Text>
          <Text style={styles.bulletPoint}>
            • Manage your notification preferences and communication settings
          </Text>
          <Text style={styles.bulletPoint}>
            • View and manage your connected payment methods
          </Text>
          <Text style={styles.bulletPoint}>
            • Control privacy settings and data sharing preferences
          </Text>
          <Text style={styles.bulletPoint}>
            • Request data deletion or account termination
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Security Incident Response</Text>
          <Text style={styles.subsectionTitle}>6.1 Incident Detection and Response</Text>
          <Text style={styles.paragraph}>
            We maintain a comprehensive security incident response plan that outlines procedures for
            detecting, investigating, and responding to security incidents. Our security team monitors
            our systems 24/7 and is trained to respond quickly to potential security threats.
          </Text>
          <Text style={styles.subsectionTitle}>6.2 Breach Notification</Text>
          <Text style={styles.paragraph}>
            In the unlikely event of a data breach that compromises your personal information, we will:
          </Text>
          <Text style={styles.bulletPoint}>
            • Investigate the incident immediately and take steps to contain and remediate the breach
          </Text>
          <Text style={styles.bulletPoint}>
            • Notify affected users and relevant authorities as required by applicable law, typically
            within 72 hours of discovering the breach
          </Text>
          <Text style={styles.bulletPoint}>
            • Provide clear information about what happened, what information was affected, and what
            steps we are taking to address the issue
          </Text>
          <Text style={styles.bulletPoint}>
            • Offer guidance on steps you can take to protect yourself, such as changing passwords or
            monitoring your accounts
          </Text>
          <Text style={styles.subsectionTitle}>6.3 Continuous Improvement</Text>
          <Text style={styles.paragraph}>
            We continuously review and improve our security practices based on industry best practices,
            emerging threats, and lessons learned from security incidents. Our security measures are
            regularly updated to address new vulnerabilities and adapt to evolving security threats.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Third-Party Security</Text>
          <Text style={styles.subsectionTitle}>7.1 Service Provider Security</Text>
          <Text style={styles.paragraph}>
            We work with third-party service providers who assist us in operating the Service, including
            cloud hosting providers, payment processors, analytics services, and customer support
            platforms. We carefully vet all third-party service providers and require them to maintain
            security standards that meet or exceed our own. All third-party service providers are
            contractually obligated to:
          </Text>
          <Text style={styles.bulletPoint}>
            • Implement appropriate security measures to protect your information
          </Text>
          <Text style={styles.bulletPoint}>
            • Use your information only for the purposes specified in our agreements
          </Text>
          <Text style={styles.bulletPoint}>
            • Comply with applicable data protection laws and regulations
          </Text>
          <Text style={styles.bulletPoint}>
            • Notify us immediately of any security incidents or breaches
          </Text>
          <Text style={styles.subsectionTitle}>7.2 Security Audits and Certifications</Text>
          <Text style={styles.paragraph}>
            Our third-party service providers undergo regular security audits and maintain industry
            certifications, including SOC 2 Type II, ISO 27001, and PCI DSS compliance, as applicable to
            their services.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Reporting Security Issues</Text>
          <Text style={styles.subsectionTitle}>8.1 Responsible Disclosure</Text>
          <Text style={styles.paragraph}>
            If you discover a security vulnerability in our Service, we encourage you to report it to
            us through our responsible disclosure program. Please email security@alyne.com with the
            following information:
          </Text>
          <Text style={styles.bulletPoint}>
            • A detailed description of the vulnerability
          </Text>
          <Text style={styles.bulletPoint}>
            • Steps to reproduce the issue
          </Text>
          <Text style={styles.bulletPoint}>
            • The potential impact of the vulnerability
          </Text>
          <Text style={styles.bulletPoint}>
            • Any suggested remediation steps
          </Text>
          <Text style={styles.paragraph}>
            We take all security reports seriously and will investigate them promptly. We ask that you
            give us reasonable time to address the issue before publicly disclosing the vulnerability.
            We appreciate your cooperation in helping us maintain a secure platform.
          </Text>
          <Text style={styles.subsectionTitle}>8.2 Security Contact Information</Text>
          <Text style={styles.paragraph}>
            For security-related inquiries, concerns, or to report a security issue, please contact us at:
          </Text>
          <Text style={styles.paragraph}>
            Email: security@alyne.com{'\n'}
            Subject: Security Inquiry
          </Text>
          <Text style={styles.paragraph}>
            We aim to respond to all security inquiries within 48 hours. For urgent security matters,
            please include "URGENT" in the subject line.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Compliance and Legal Obligations</Text>
          <Text style={styles.subsectionTitle}>9.1 Regulatory Compliance</Text>
          <Text style={styles.paragraph}>
            We comply with applicable data protection and privacy laws, including but not limited to:
          </Text>
          <Text style={styles.bulletPoint}>
            • General Data Protection Regulation (GDPR) for users in the European Union
          </Text>
          <Text style={styles.bulletPoint}>
            • California Consumer Privacy Act (CCPA) for users in California
          </Text>
          <Text style={styles.bulletPoint}>
            • Health Insurance Portability and Accountability Act (HIPAA) requirements, where applicable
          </Text>
          <Text style={styles.bulletPoint}>
            • Other applicable federal, state, and local data protection laws
          </Text>
          <Text style={styles.subsectionTitle}>9.2 Law Enforcement and Legal Requests</Text>
          <Text style={styles.paragraph}>
            We may be required to disclose your information in response to valid legal requests, such as
            court orders, subpoenas, or search warrants. We will only disclose information when legally
            required and will notify you of such requests when permitted by law, unless doing so would
            compromise an ongoing investigation or violate a court order.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Changes to This Security Policy</Text>
          <Text style={styles.paragraph}>
            We may update this Security Policy from time to time to reflect changes in our security
            practices, legal requirements, or the Service. Material changes will be effective
            immediately upon posting to the Service or upon notification to you via email or through the
            Service. We encourage you to review this Security Policy periodically to stay informed about
            how we protect your information.
          </Text>
          <Text style={styles.paragraph}>
            Your continued use of the Service after changes to this Security Policy constitutes your
            acceptance of the updated policy. If you do not agree with the changes, you may discontinue
            your use of the Service and request deletion of your account as provided in Section 4.2.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Contact Us</Text>
          <Text style={styles.paragraph}>
            If you have questions, concerns, or requests regarding this Security Policy or our security
            practices, please contact us at:
          </Text>
          <Text style={styles.paragraph}>
            Alyne, Inc.{'\n'}
            Email: security@alyne.com{'\n'}
            Address: [Your Business Address]
          </Text>
          <Text style={styles.paragraph}>
            We are committed to addressing your security concerns and will respond to your inquiry as
            soon as possible.
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
  section: {
    marginBottom: theme.spacing.xl,
  },
  lastUpdated: {
    ...theme.typography.caption,
    color: theme.colors.neutral[500],
    marginBottom: theme.spacing.xl,
    fontStyle: 'italic',
  },
  sectionTitle: {
    ...theme.typography.h2,
    color: theme.colors.neutral[900],
    marginBottom: theme.spacing.md,
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
  paragraph: {
    ...theme.typography.body,
    color: theme.colors.neutral[700],
    lineHeight: 24,
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

