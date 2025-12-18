import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';

export default function TermsOfServiceScreen() {
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
          <Text style={styles.title}>Terms of Service</Text>
          <View style={styles.placeholder} />
        </View>
        <Text style={styles.lastUpdated}>Last updated: {new Date().toLocaleDateString()}</Text>

        <View style={styles.section}>
          <Text style={styles.introParagraph}>
            These Terms of Service ("Terms," "Agreement") constitute a legally binding agreement
            between you ("User," "you," or "your") and Alyne, Inc. ("Alyne," "we," "us," or "our")
            governing your access to and use of the Alyne mobile application, website, and related
            services (collectively, the "Service"). By accessing, downloading, installing, or using
            the Service, you acknowledge that you have read, understood, and agree to be bound by
            these Terms and our Privacy Policy, which is incorporated herein by reference. If you do
            not agree to these Terms, you must not access or use the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>1. Acceptance of Terms and Modifications</Text>
          <Text style={styles.paragraph}>
            By creating an account, accessing, or using the Service, you represent and warrant that
            (a) you are at least 18 years of age and have the legal capacity to enter into this
            Agreement, (b) you have the authority to bind yourself or the entity you represent to
            these Terms, (c) your use of the Service will not violate any applicable law, rule, or
            regulation, and (d) all information you provide is accurate, current, and complete.
          </Text>
          <Text style={styles.paragraph}>
            We reserve the right, in our sole discretion, to modify, update, or change these Terms
            at any time. Material changes will be effective immediately upon posting to the Service
            or upon notification to you via email or through the Service. Your continued use of the
            Service after such modifications constitutes your acceptance of the modified Terms. If
            you do not agree to the modified Terms, you must discontinue your use of the Service and
            may terminate your account as provided herein.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>2. Description of Service</Text>
          <Text style={styles.paragraph}>
            Alyne operates an online platform that connects clients seeking services with
            independent service providers ("Providers"). We facilitate the booking, scheduling, and
            payment processing for services, but we are not a party to any service agreement between
            clients and Providers. We act solely as an intermediary and do not provide, control,
            manage, operate, supply, or deliver any services offered by Providers.
          </Text>
          <Text style={styles.paragraph}>
            We reserve the right to modify, suspend, or discontinue any aspect of the Service at any
            time, with or without notice, and without liability to you or any third party. We do not
            guarantee that the Service will be available at all times or that it will be error-free,
            secure, or free from viruses or other harmful components.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>3. User Accounts and Registration</Text>
          <Text style={styles.subsectionTitle}>3.1 Account Creation</Text>
          <Text style={styles.paragraph}>
            To access certain features of the Service, you must register for an account by providing
            accurate, current, and complete information as prompted by the registration process. You
            agree to maintain and promptly update your account information to keep it accurate,
            current, and complete.
          </Text>

          <Text style={styles.subsectionTitle}>3.2 Account Security</Text>
          <Text style={styles.paragraph}>
            You are solely responsible for maintaining the confidentiality of your account
            credentials, including your username, password, and any other authentication
            information. You agree to accept full responsibility for all activities that occur under
            your account, whether authorized or unauthorized. You must immediately notify us of any
            unauthorized use of your account or any other breach of security. We will not be liable
            for any loss or damage arising from your failure to comply with this section.
          </Text>

          <Text style={styles.subsectionTitle}>3.3 Account Termination</Text>
          <Text style={styles.paragraph}>
            You may terminate your account at any time by contacting us or using the account
            deletion feature in the Service. We reserve the right to suspend or terminate your
            account, at our sole discretion, with or without notice, for any reason, including but
            not limited to: (a) violation of these Terms, (b) fraudulent, abusive, or illegal
            activity, (c) extended periods of inactivity, or (d) any other conduct that we
            determine, in our sole discretion, is harmful to other users, us, or third parties.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>4. Use License and Restrictions</Text>
          <Text style={styles.paragraph}>
            Subject to your compliance with these Terms, we grant you a limited, non-exclusive,
            non-transferable, non-sublicensable, revocable license to access and use the Service for
            your personal, non-commercial use in accordance with these Terms.
          </Text>
          <Text style={styles.paragraph}>You agree not to, and will not permit others to:</Text>
          <Text style={styles.bulletPoint}>
            • Copy, modify, adapt, alter, translate, or create derivative works of the Service or
            any portion thereof
          </Text>
          <Text style={styles.bulletPoint}>
            • Reverse engineer, disassemble, decompile, or otherwise attempt to derive the source
            code or underlying ideas or algorithms of the Service
          </Text>
          <Text style={styles.bulletPoint}>
            • Remove, alter, or obscure any proprietary notices, labels, or marks on the Service
          </Text>
          <Text style={styles.bulletPoint}>
            • Use the Service for any commercial purpose without our express written consent
          </Text>
          <Text style={styles.bulletPoint}>
            • Use the Service in any manner that could damage, disable, overburden, or impair our
            servers or networks
          </Text>
          <Text style={styles.bulletPoint}>
            • Attempt to gain unauthorized access to the Service, other accounts, computer systems,
            or networks connected to the Service
          </Text>
          <Text style={styles.bulletPoint}>
            • Use any robot, spider, scraper, or other automated means to access the Service for any
            purpose without our express written permission
          </Text>
          <Text style={styles.bulletPoint}>
            • Interfere with or disrupt the Service or servers or networks connected to the Service
          </Text>
          <Text style={styles.bulletPoint}>
            • Transmit any viruses, worms, defects, Trojan horses, or other items of a destructive
            nature
          </Text>
          <Text style={styles.bulletPoint}>
            • Use the Service to violate any applicable law, rule, or regulation, or to infringe
            upon the rights of any third party
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>5. Bookings and Payment Terms</Text>
          <Text style={styles.subsectionTitle}>5.1 Booking Process</Text>
          <Text style={styles.paragraph}>
            All bookings are subject to availability and confirmation by the Provider. We facilitate
            the booking process but do not guarantee that any booking request will be accepted.
            Providers retain the right to accept or decline booking requests at their sole
            discretion.
          </Text>

          <Text style={styles.subsectionTitle}>5.2 Payment Terms</Text>
          <Text style={styles.paragraph}>
            Payment for services must be made in full at the time of booking confirmation through
            our third-party payment processors. All prices are displayed in U.S. dollars unless
            otherwise indicated. You agree to pay all charges incurred by your account, including
            applicable taxes, fees, and surcharges. We reserve the right to change our pricing at
            any time, but such changes will not affect bookings that have already been confirmed.
          </Text>
          <Text style={styles.paragraph}>
            We charge a platform fee on all transactions, which is disclosed to you before you
            complete your booking. The platform fee is non-refundable except as required by law or
            as otherwise specified in our cancellation policy.
          </Text>

          <Text style={styles.subsectionTitle}>5.3 Cancellation and Refund Policy</Text>
          <Text style={styles.paragraph}>
            Cancellation and refund policies vary by Provider and are disclosed at the time of
            booking. Generally, cancellations made more than 24 hours before the scheduled service
            time may be eligible for a full or partial refund, subject to the Provider's specific
            cancellation policy. Cancellations made less than 24 hours before the scheduled service
            time may not be eligible for a refund. We reserve the right to modify our cancellation
            policy at any time, but such modifications will not affect bookings that have already
            been confirmed.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>6. Provider Responsibilities and Obligations</Text>
          <Text style={styles.paragraph}>If you are a Provider, you agree to:</Text>
          <Text style={styles.bulletPoint}>
            • Provide accurate, current, and complete information about your qualifications,
            credentials, licenses, certifications, and experience
          </Text>
          <Text style={styles.bulletPoint}>
            • Maintain all necessary licenses, certifications, insurance, and permits required to
            provide the services you offer
          </Text>
          <Text style={styles.bulletPoint}>
            • Deliver services in a professional, competent, and timely manner, consistent with the
            description provided in your service listings
          </Text>
          <Text style={styles.bulletPoint}>
            • Comply with all applicable laws, rules, and regulations, including but not limited to
            professional licensing requirements, tax obligations, and employment laws
          </Text>
          <Text style={styles.bulletPoint}>
            • Maintain appropriate insurance coverage for the services you provide
          </Text>
          <Text style={styles.bulletPoint}>
            • Respond promptly to booking requests and client communications
          </Text>
          <Text style={styles.bulletPoint}>
            • Honor all confirmed bookings unless cancellation is necessary due to circumstances
            beyond your reasonable control
          </Text>
          <Text style={styles.paragraph}>
            Providers are independent contractors and are not employees, agents, or representatives
            of Alyne. Providers are solely responsible for their own actions, conduct, and the
            quality of services they provide.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>7. Client Responsibilities</Text>
          <Text style={styles.paragraph}>If you are a Client, you agree to:</Text>
          <Text style={styles.bulletPoint}>
            • Provide accurate information when making booking requests
          </Text>
          <Text style={styles.bulletPoint}>
            • Arrive on time for scheduled services or provide reasonable notice of delays
          </Text>
          <Text style={styles.bulletPoint}>
            • Provide a safe and appropriate environment for service delivery when services are
            provided at your location
          </Text>
          <Text style={styles.bulletPoint}>• Treat Providers with respect and professionalism</Text>
          <Text style={styles.bulletPoint}>
            • Pay all charges in a timely manner as required by these Terms
          </Text>
          <Text style={styles.bulletPoint}>
            • Comply with all applicable laws and regulations when using the Service
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>8. Intellectual Property Rights</Text>
          <Text style={styles.paragraph}>
            The Service, including all content, features, functionality, software, text, graphics,
            logos, icons, images, audio clips, digital downloads, data compilations, and software,
            is the exclusive property of Alyne or its licensors and is protected by United States
            and international copyright, trademark, patent, trade secret, and other intellectual
            property laws.
          </Text>
          <Text style={styles.paragraph}>
            You acknowledge that the Service contains proprietary and confidential information that
            is protected by applicable intellectual property and other laws. You agree not to use
            such proprietary information in any way whatsoever except for use of the Service in
            compliance with these Terms.
          </Text>
          <Text style={styles.paragraph}>
            Any content you submit, post, or display on or through the Service (including reviews,
            ratings, messages, and profile information) remains your property. However, by
            submitting, posting, or displaying such content, you grant us a worldwide,
            non-exclusive, royalty-free, perpetual, irrevocable, and fully sublicensable license to
            use, reproduce, modify, adapt, publish, translate, create derivative works from,
            distribute, and display such content in any media, now known or hereafter developed, for
            the purpose of operating and promoting the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>9. Disclaimers and Limitation of Liability</Text>
          <Text style={styles.subsectionTitle}>9.1 Service Disclaimer</Text>
          <Text style={styles.paragraph}>
            THE SERVICE IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF
            PERFORMANCE. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR
            ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED.
          </Text>

          <Text style={styles.subsectionTitle}>9.2 Third-Party Services Disclaimer</Text>
          <Text style={styles.paragraph}>
            ALYNE ACTS SOLELY AS AN INTERMEDIARY PLATFORM CONNECTING CLIENTS AND PROVIDERS. WE DO
            NOT PROVIDE, CONTROL, MANAGE, OPERATE, SUPPLY, OR DELIVER ANY SERVICES OFFERED BY
            PROVIDERS. WE ARE NOT RESPONSIBLE OR LIABLE FOR THE QUALITY, SAFETY, LEGALITY, OR ANY
            OTHER ASPECT OF SERVICES PROVIDED BY THIRD-PARTY PROVIDERS. ANY TRANSACTION BETWEEN YOU
            AND A PROVIDER IS AT YOUR OWN RISK.
          </Text>

          <Text style={styles.subsectionTitle}>9.3 Limitation of Liability</Text>
          <Text style={styles.paragraph}>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ALYNE, ITS
            AFFILIATES, DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
            LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING
            FROM (A) YOUR USE OR INABILITY TO USE THE SERVICE, (B) ANY CONDUCT OR CONTENT OF THIRD
            PARTIES ON THE SERVICE, (C) ANY SERVICES OBTAINED THROUGH THE SERVICE, OR (D)
            UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.
          </Text>
          <Text style={styles.paragraph}>
            OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE USE OF OR
            INABILITY TO USE THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE
            (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO THE LIABILITY, OR ONE HUNDRED DOLLARS
            ($100), WHICHEVER IS GREATER.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>10. Indemnification</Text>
          <Text style={styles.paragraph}>
            You agree to defend, indemnify, and hold harmless Alyne, its affiliates, directors,
            officers, employees, agents, and licensors from and against any claims, actions, suits,
            proceedings, demands, losses, liabilities, damages, costs, and expenses (including
            reasonable attorneys' fees) arising out of or relating to: (a) your use of the Service,
            (b) your violation of these Terms, (c) your violation of any rights of another party,
            (d) your violation of any applicable law, rule, or regulation, or (e) any content you
            submit, post, or transmit through the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>11. Dispute Resolution and Arbitration</Text>
          <Text style={styles.subsectionTitle}>11.1 Informal Resolution</Text>
          <Text style={styles.paragraph}>
            Before filing a claim against Alyne, you agree to try to resolve the dispute informally
            by contacting us at legal@alyne.com. We will try to resolve the dispute informally by
            contacting you via email. If a dispute is not resolved within 30 days of submission, you
            or we may bring a formal proceeding.
          </Text>

          <Text style={styles.subsectionTitle}>11.2 Arbitration Agreement</Text>
          <Text style={styles.paragraph}>
            You and Alyne agree that any dispute, claim, or controversy arising out of or relating
            to these Terms or the Service shall be settled by binding arbitration, except that
            either party may bring claims in small claims court if they qualify. Arbitration will be
            conducted by the American Arbitration Association (AAA) under its Commercial Arbitration
            Rules. The arbitration will be conducted in the English language in the state where you
            reside or another mutually agreed location.
          </Text>
          <Text style={styles.paragraph}>
            YOU AND ALYNE AGREE TO WAIVE ANY RIGHT TO A JURY TRIAL AND TO BRING CLAIMS ONLY ON AN
            INDIVIDUAL BASIS AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR
            REPRESENTATIVE PROCEEDING.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>12. Governing Law and Jurisdiction</Text>
          <Text style={styles.paragraph}>
            These Terms shall be governed by and construed in accordance with the laws of the State
            of Virginia, United States, without regard to its conflict of law provisions. Any legal
            action or proceeding arising under these Terms will be brought exclusively in the
            federal or state courts located in Alexandria, VA, and you hereby irrevocably consent to
            the personal jurisdiction and venue of such courts.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>13. Severability and Waiver</Text>
          <Text style={styles.paragraph}>
            If any provision of these Terms is found to be unenforceable or invalid, that provision
            shall be limited or eliminated to the minimum extent necessary so that these Terms shall
            otherwise remain in full force and effect and enforceable. Our failure to enforce any
            right or provision of these Terms shall not constitute a waiver of such right or
            provision.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>14. Entire Agreement</Text>
          <Text style={styles.paragraph}>
            These Terms, together with our Privacy Policy and any other legal notices published by
            us on the Service, shall constitute the entire agreement between you and Alyne
            concerning the Service. These Terms supersede all prior agreements and understandings
            between you and Alyne regarding the Service.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>15. Contact Information</Text>
          <Text style={styles.paragraph}>
            If you have any questions, concerns, or complaints about these Terms of Service, please
            contact us at:
          </Text>
          <Text style={styles.paragraph}>
            Alyne, Inc.{'\n'}
            Email: legal@alyne.com{'\n'}
            Address: [Your Business Address]
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
  bulletPoint: {
    ...theme.typography.body,
    color: theme.colors.neutral[700],
    lineHeight: 24,
    marginLeft: theme.spacing.md,
    marginBottom: theme.spacing.xs,
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
});
