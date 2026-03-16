import { Link } from 'react-router-dom';
import styles from './PolicyPage.module.css';

export function Privacy() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link to="/" className={styles.logo}>
          <img src="/logo.png" alt="Alyne" className={styles.logoImg} />
        </Link>
        <Link to="/" className={styles.backLink}>
          Back to home
        </Link>
      </header>
      <main className={styles.main}>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: {new Date().toLocaleDateString()}</p>
        <div className={styles.content}>
          <p style={{ fontStyle: 'italic' }}>
            This Privacy Policy (&quot;Policy&quot;) describes how Alyne, Inc. (&quot;Alyne,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
            collects, uses, discloses, and protects your personal information when you access or use
            our mobile application, website, and related services (collectively, the &quot;Service&quot;). By
            using the Service, you consent to the data practices described in this Policy. If you do
            not agree with the terms of this Policy, please do not use the Service.
          </p>

          <h2>1. Information We Collect</h2>
          <h3>1.1 Information You Provide Directly</h3>
          <p>
            We collect information that you voluntarily provide to us when you register for an
            account, create a profile, make a booking, communicate with other users, or otherwise
            interact with the Service. This information may include, but is not limited to:
          </p>
          <ul>
            <li>Personal identification information, including your full name, email address,
            telephone number, date of birth, and government-issued identification numbers when
            required for verification purposes</li>
            <li>Profile information, including photographs, biographical information, professional
            credentials, certifications, licenses, and qualifications</li>
            <li>Payment information, including credit card numbers, bank account details, and billing
            addresses processed through our third-party payment processors</li>
            <li>Location data, including physical addresses, geographic coordinates, and
            location-based preferences</li>
            <li>Communications and content, including messages exchanged through the Service, reviews,
            ratings, feedback, and any other content you submit</li>
          </ul>

          <h3>1.2 Automatically Collected Information</h3>
          <p>
            When you access or use the Service, we automatically collect certain information about
            your device and usage patterns, including:
          </p>
          <ul>
            <li>Device information, including device type, operating system, unique device
            identifiers, mobile network information, and device settings</li>
            <li>Log data, including IP addresses, access times, pages viewed, features used, and other
            system activity</li>
            <li>Usage information, including booking history, search queries, interaction patterns,
            and preferences</li>
            <li>Cookies and similar tracking technologies, as further described in Section 7 below</li>
          </ul>

          <h3>1.3 Information from Third Parties</h3>
          <p>
            We may receive information about you from third-party sources, including payment
            processors, identity verification services, background check providers, social media
            platforms (when you choose to connect your account), and other service providers that
            assist us in operating the Service.
          </p>

          <h2>2. How We Use Your Information</h2>
          <p>
            We use the information we collect for the following business and commercial purposes:
          </p>
          <ul>
            <li>To provide, operate, maintain, and improve the Service, including facilitating
            bookings, processing payments, and enabling communications between users</li>
            <li>To authenticate your identity, verify your credentials, and ensure compliance with our
            Terms of Service</li>
            <li>To send you administrative communications, including service updates, security alerts,
            and account notifications</li>
            <li>To personalize your experience, including recommending providers, services, and
            content that may be of interest to you</li>
            <li>To detect, prevent, and address fraud, abuse, security issues, and other harmful or
            illegal activities</li>
            <li>To comply with legal obligations, respond to legal process, enforce our agreements,
            and protect our rights and the rights of our users</li>
            <li>To conduct research, analytics, and data analysis to improve our Service and develop
            new features</li>
            <li>To communicate with you about promotions, marketing materials, and other information
            that may be of interest (you may opt out at any time as described in Section 5)</li>
          </ul>

          <h2>3. Information Sharing and Disclosure</h2>
          <h3>3.1 Service Providers and Business Partners</h3>
          <p>
            We may share your information with third-party service providers, contractors, and
            business partners who perform services on our behalf, including payment processing, data
            storage, analytics, customer support, identity verification, background checks, and
            marketing. These entities are contractually obligated to use your information solely for
            the purposes for which it was disclosed and in accordance with this Policy.
          </p>

          <h3>3.2 Other Users</h3>
          <p>
            When you create a profile or make a booking, certain information will be visible to
            other users of the Service, including your name, profile photo, ratings, reviews, and
            service listings. Messages exchanged through the Service are visible to the intended
            recipients.
          </p>

          <h3>3.3 Legal Requirements and Protection of Rights</h3>
          <p>
            We may disclose your information if required to do so by law or in response to valid
            requests by public authorities (e.g., court orders, subpoenas, or government
            investigations). We may also disclose information when we believe in good faith that
            disclosure is necessary to protect our rights, protect your safety or the safety of
            others, investigate fraud or security issues, or respond to government requests.
          </p>

          <h3>3.4 Business Transfers</h3>
          <p>
            In the event of a merger, acquisition, reorganization, bankruptcy, or sale of all or
            substantially all of our assets, your information may be transferred to the acquiring
            entity or successor organization, subject to the same privacy protections set forth in
            this Policy.
          </p>

          <h3>3.5 With Your Consent</h3>
          <p>
            We may share your information with third parties when you have provided explicit consent
            for such sharing, including when you authorize connections to third-party services or
            applications.
          </p>

          <p>
            We do not sell, rent, or lease your personal information to third parties for their
            marketing purposes without your explicit consent.
          </p>

          <h2>4. Data Security</h2>
          <p>
            We implement industry-standard technical, administrative, and organizational security
            measures designed to protect your personal information against unauthorized access,
            alteration, disclosure, or destruction. These measures include, but are not limited to:
          </p>
          <ul>
            <li>Encryption of data in transit using Transport Layer Security (TLS) and Secure Sockets
            Layer (SSL) protocols</li>
            <li>Encryption of sensitive data at rest using industry-standard encryption algorithms</li>
            <li>Regular security assessments, vulnerability testing, and penetration testing</li>
            <li>Access controls and authentication mechanisms to limit access to personal information
            to authorized personnel only</li>
            <li>Employee training on data security and privacy best practices</li>
          </ul>
          <p>
            However, no method of transmission over the Internet or method of electronic storage is
            100% secure. While we strive to use commercially acceptable means to protect your
            personal information, we cannot guarantee absolute security. You acknowledge and agree
            that you provide your information at your own risk.
          </p>

          <h2>5. Your Rights and Choices</h2>
          <p>
            Depending on your jurisdiction, you may have certain rights regarding your personal
            information, including:
          </p>
          <ul>
            <li><strong>Right of Access:</strong> You may request access to the personal information we hold about you
            and receive a copy of such information</li>
            <li><strong>Right of Rectification:</strong> You may request correction of inaccurate or incomplete
            personal information</li>
            <li><strong>Right of Erasure:</strong> You may request deletion of your personal information, subject to
            certain exceptions for legal compliance and legitimate business interests</li>
            <li><strong>Right to Restrict Processing:</strong> You may request that we limit how we use your personal
            information in certain circumstances</li>
            <li><strong>Right to Data Portability:</strong> You may request a copy of your personal information in a
            structured, machine-readable format</li>
            <li><strong>Right to Object:</strong> You may object to certain processing activities, including direct
            marketing and processing based on legitimate interests</li>
            <li><strong>Right to Withdraw Consent:</strong> Where processing is based on consent, you may withdraw your
            consent at any time</li>
          </ul>
          <p>
            To exercise these rights, please contact us at privacy@alyne.com. We will respond to
            your request within a reasonable timeframe and in accordance with applicable law. We may
            require verification of your identity before processing certain requests.
          </p>
          <p>
            You may also opt out of marketing communications by following the unsubscribe
            instructions in our emails or by adjusting your account settings within the Service.
          </p>

          <h2>6. Data Retention</h2>
          <p>
            We retain your personal information for as long as necessary to fulfill the purposes
            outlined in this Policy, unless a longer retention period is required or permitted by
            law. When determining retention periods, we consider the amount, nature, and sensitivity
            of the information, the potential risk of harm from unauthorized use or disclosure, the
            purposes for which we process the information, and applicable legal requirements.
          </p>
          <p>
            When personal information is no longer needed, we will securely delete or anonymize it
            in accordance with our data retention policies and applicable law. However, we may
            retain certain information for longer periods when required by law, to resolve disputes,
            enforce our agreements, or protect our legitimate business interests.
          </p>

          <h2>7. Cookies and Tracking Technologies</h2>
          <p>
            We use cookies, web beacons, pixel tags, and similar tracking technologies to collect
            information about your interactions with the Service. These technologies help us analyze
            usage patterns, personalize content, and improve the Service. You can control cookies
            through your browser settings, though disabling cookies may limit your ability to use
            certain features of the Service.
          </p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>
            The Service is not intended for individuals under the age of 18. We do not knowingly
            collect personal information from children under 18. If we become aware that we have
            collected personal information from a child under 18, we will take steps to delete such
            information promptly. If you believe we have collected information from a child under
            18, please contact us immediately at privacy@alyne.com.
          </p>

          <h2>9. International Data Transfers</h2>
          <p>
            Your information may be transferred to, and maintained on, computers located outside of
            your state, province, country, or other governmental jurisdiction where data protection
            laws may differ from those in your jurisdiction. By using the Service, you consent to
            the transfer of your information to facilities located outside your jurisdiction. We
            will take appropriate measures to ensure that your information receives an adequate
            level of protection in accordance with this Policy and applicable law.
          </p>

          <h2>10. California Privacy Rights</h2>
          <p>
            If you are a California resident, you have additional rights under the California
            Consumer Privacy Act (CCPA), including the right to know what personal information we
            collect, the right to delete personal information, the right to opt out of the sale of
            personal information (we do not sell personal information), and the right to
            non-discrimination for exercising your privacy rights. To exercise these rights, please
            contact us at privacy@alyne.com.
          </p>

          <h2>11. Changes to This Privacy Policy</h2>
          <p>
            We reserve the right to modify this Privacy Policy at any time. We will notify you of
            any material changes by posting the updated Policy on the Service and updating the &quot;Last
            updated&quot; date. Your continued use of the Service after such modifications constitutes
            your acceptance of the updated Policy. We encourage you to review this Policy
            periodically to stay informed about how we collect, use, and protect your information.
          </p>

          <h2>12. Contact Us</h2>
          <p>
            If you have any questions, concerns, or requests regarding this Privacy Policy or our
            data practices, please contact us at:
          </p>
          <p>
            Alyne, Inc.<br />
            Email: privacy@alyne.com<br />
            Address: [Your Business Address]
          </p>
          <p>
            For users in the European Economic Area (EEA), you also have the right to lodge a
            complaint with your local data protection authority if you believe we have not
            adequately addressed your concerns.
          </p>
        </div>
      </main>
    </div>
  );
}
