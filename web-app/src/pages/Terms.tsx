import { Link } from 'react-router-dom';
import styles from './PolicyPage.module.css';

export function Terms() {
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
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: {new Date().toLocaleDateString()}</p>
        <div className={styles.content}>
          <p style={{ fontStyle: 'italic' }}>
            These Terms of Service (&quot;Terms,&quot; &quot;Agreement&quot;) constitute a legally binding agreement
            between you (&quot;User,&quot; &quot;you,&quot; or &quot;your&quot;) and Alyne, Inc. (&quot;Alyne,&quot; &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;)
            governing your access to and use of the Alyne mobile application, website, and related
            services (collectively, the &quot;Service&quot;). By accessing, downloading, installing, or using
            the Service, you acknowledge that you have read, understood, and agree to be bound by
            these Terms and our Privacy Policy, which is incorporated herein by reference. If you do
            not agree to these Terms, you must not access or use the Service.
          </p>

          <h2>1. Acceptance of Terms and Modifications</h2>
          <p>
            By creating an account, accessing, or using the Service, you represent and warrant that
            (a) you are at least 18 years of age and have the legal capacity to enter into this
            Agreement, (b) you have the authority to bind yourself or the entity you represent to
            these Terms, (c) your use of the Service will not violate any applicable law, rule, or
            regulation, and (d) all information you provide is accurate, current, and complete.
          </p>
          <p>
            We reserve the right, in our sole discretion, to modify, update, or change these Terms
            at any time. Material changes will be effective immediately upon posting to the Service
            or upon notification to you via email or through the Service. Your continued use of the
            Service after such modifications constitutes your acceptance of the modified Terms. If
            you do not agree to the modified Terms, you must discontinue your use of the Service and
            may terminate your account as provided herein.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            Alyne operates an online platform that connects clients seeking services with
            independent service providers (&quot;Providers&quot;). We facilitate the booking, scheduling, and
            payment processing for services, but we are not a party to any service agreement between
            clients and Providers. We act solely as an intermediary and do not provide, control,
            manage, operate, supply, or deliver any services offered by Providers.
          </p>
          <p>
            We reserve the right to modify, suspend, or discontinue any aspect of the Service at any
            time, with or without notice, and without liability to you or any third party. We do not
            guarantee that the Service will be available at all times or that it will be error-free,
            secure, or free from viruses or other harmful components.
          </p>

          <h2>3. User Accounts and Registration</h2>
          <h3>3.1 Account Creation</h3>
          <p>
            To access certain features of the Service, you must register for an account by providing
            accurate, current, and complete information as prompted by the registration process. You
            agree to maintain and promptly update your account information to keep it accurate,
            current, and complete.
          </p>

          <h3>3.2 Account Security</h3>
          <p>
            You are solely responsible for maintaining the confidentiality of your account
            credentials, including your username, password, and any other authentication
            information. You agree to accept full responsibility for all activities that occur under
            your account, whether authorized or unauthorized. You must immediately notify us of any
            unauthorized use of your account or any other breach of security. We will not be liable
            for any loss or damage arising from your failure to comply with this section.
          </p>

          <h3>3.3 Account Termination</h3>
          <p>
            You may terminate your account at any time by contacting us or using the account
            deletion feature in the Service. We reserve the right to suspend or terminate your
            account, at our sole discretion, with or without notice, for any reason, including but
            not limited to: (a) violation of these Terms, (b) fraudulent, abusive, or illegal
            activity, (c) extended periods of inactivity, or (d) any other conduct that we
            determine, in our sole discretion, is harmful to other users, us, or third parties.
          </p>

          <h2>4. Use License and Restrictions</h2>
          <p>
            Subject to your compliance with these Terms, we grant you a limited, non-exclusive,
            non-transferable, non-sublicensable, revocable license to access and use the Service for
            your personal, non-commercial use in accordance with these Terms.
          </p>
          <p>You agree not to, and will not permit others to:</p>
          <ul>
            <li>Copy, modify, adapt, alter, translate, or create derivative works of the Service or
            any portion thereof</li>
            <li>Reverse engineer, disassemble, decompile, or otherwise attempt to derive the source
            code or underlying ideas or algorithms of the Service</li>
            <li>Remove, alter, or obscure any proprietary notices, labels, or marks on the Service</li>
            <li>Use the Service for any commercial purpose without our express written consent</li>
            <li>Use the Service in any manner that could damage, disable, overburden, or impair our
            servers or networks</li>
            <li>Attempt to gain unauthorized access to the Service, other accounts, computer systems,
            or networks connected to the Service</li>
            <li>Use any robot, spider, scraper, or other automated means to access the Service for any
            purpose without our express written permission</li>
            <li>Interfere with or disrupt the Service or servers or networks connected to the Service</li>
            <li>Transmit any viruses, worms, defects, Trojan horses, or other items of a destructive
            nature</li>
            <li>Use the Service to violate any applicable law, rule, or regulation, or to infringe
            upon the rights of any third party</li>
          </ul>

          <h2>5. Bookings and Payment Terms</h2>
          <h3>5.1 Booking Process</h3>
          <p>
            All bookings are subject to availability. When you book a session, it is confirmed
            automatically. Providers may still cancel or decline in accordance with our policies.
          </p>

          <h3>5.2 Payment Terms</h3>
          <p>
            Payment for services must be made in full at the time of booking confirmation through
            our third-party payment processors. All prices are displayed in U.S. dollars unless
            otherwise indicated. You agree to pay all charges incurred by your account, including
            applicable taxes, fees, and surcharges. We reserve the right to change our pricing at
            any time, but such changes will not affect bookings that have already been confirmed.
          </p>
          <p>
            We charge a platform fee on all transactions, which is disclosed to you before you
            complete your booking. The platform fee is non-refundable except as required by law or
            as otherwise specified in our cancellation policy.
          </p>

          <h3>5.3 Cancellation and Refund Policy</h3>
          <p>
            Cancellation and refund policies vary by Provider and are disclosed at the time of
            booking. Generally, cancellations made more than 24 hours before the scheduled service
            time may be eligible for a full or partial refund, subject to the Provider&apos;s specific
            cancellation policy. Cancellations made less than 24 hours before the scheduled service
            time may not be eligible for a refund. We reserve the right to modify our cancellation
            policy at any time, but such modifications will not affect bookings that have already
            been confirmed.
          </p>

          <h2>6. Provider Responsibilities and Obligations</h2>
          <p>If you are a Provider, you agree to:</p>
          <ul>
            <li>Provide accurate, current, and complete information about your qualifications,
            credentials, licenses, certifications, and experience</li>
            <li>Maintain all necessary licenses, certifications, insurance, and permits required to
            provide the services you offer</li>
            <li>Deliver services in a professional, competent, and timely manner, consistent with the
            description provided in your service listings</li>
            <li>Comply with all applicable laws, rules, and regulations, including but not limited to
            professional licensing requirements, tax obligations, and employment laws</li>
            <li>Maintain appropriate insurance coverage for the services you provide</li>
            <li>Respond promptly to booking requests and client communications</li>
            <li>Honor all confirmed bookings unless cancellation is necessary due to circumstances
            beyond your reasonable control</li>
          </ul>
          <p>
            Providers are independent contractors and are not employees, agents, or representatives
            of Alyne. Providers are solely responsible for their own actions, conduct, and the
            quality of services they provide.
          </p>

          <h2>7. Client Responsibilities</h2>
          <p>If you are a Client, you agree to:</p>
          <ul>
            <li>Provide accurate information when making booking requests</li>
            <li>Arrive on time for scheduled services or provide reasonable notice of delays</li>
            <li>Provide a safe and appropriate environment for service delivery when services are
            provided at your location</li>
            <li>Treat Providers with respect and professionalism</li>
            <li>Pay all charges in a timely manner as required by these Terms</li>
            <li>Comply with all applicable laws and regulations when using the Service</li>
          </ul>

          <h2>8. Intellectual Property Rights</h2>
          <p>
            The Service, including all content, features, functionality, software, text, graphics,
            logos, icons, images, audio clips, digital downloads, data compilations, and software,
            is the exclusive property of Alyne or its licensors and is protected by United States
            and international copyright, trademark, patent, trade secret, and other intellectual
            property laws.
          </p>
          <p>
            You acknowledge that the Service contains proprietary and confidential information that
            is protected by applicable intellectual property and other laws. You agree not to use
            such proprietary information in any way whatsoever except for use of the Service in
            compliance with these Terms.
          </p>
          <p>
            Any content you submit, post, or display on or through the Service (including reviews,
            ratings, messages, and profile information) remains your property. However, by
            submitting, posting, or displaying such content, you grant us a worldwide,
            non-exclusive, royalty-free, perpetual, irrevocable, and fully sublicensable license to
            use, reproduce, modify, adapt, publish, translate, create derivative works from,
            distribute, and display such content in any media, now known or hereafter developed, for
            the purpose of operating and promoting the Service.
          </p>

          <h2>9. Disclaimers and Limitation of Liability</h2>
          <h3>9.1 Service Disclaimer</h3>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED, INCLUDING, BUT NOT LIMITED TO, IMPLIED WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, NON-INFRINGEMENT, OR COURSE OF
            PERFORMANCE. WE DO NOT WARRANT THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR
            ERROR-FREE, OR THAT DEFECTS WILL BE CORRECTED.
          </p>

          <h3>9.2 Third-Party Services Disclaimer</h3>
          <p>
            ALYNE ACTS SOLELY AS AN INTERMEDIARY PLATFORM CONNECTING CLIENTS AND PROVIDERS. WE DO
            NOT PROVIDE, CONTROL, MANAGE, OPERATE, SUPPLY, OR DELIVER ANY SERVICES OFFERED BY
            PROVIDERS. WE ARE NOT RESPONSIBLE OR LIABLE FOR THE QUALITY, SAFETY, LEGALITY, OR ANY
            OTHER ASPECT OF SERVICES PROVIDED BY THIRD-PARTY PROVIDERS. ANY TRANSACTION BETWEEN YOU
            AND A PROVIDER IS AT YOUR OWN RISK.
          </p>

          <h3>9.3 Limitation of Liability</h3>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL ALYNE, ITS
            AFFILIATES, DIRECTORS, OFFICERS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY
            INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT
            LIMITED TO LOSS OF PROFITS, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES, RESULTING
            FROM (A) YOUR USE OR INABILITY TO USE THE SERVICE, (B) ANY CONDUCT OR CONTENT OF THIRD
            PARTIES ON THE SERVICE, (C) ANY SERVICES OBTAINED THROUGH THE SERVICE, OR (D)
            UNAUTHORIZED ACCESS, USE, OR ALTERATION OF YOUR TRANSMISSIONS OR CONTENT.
          </p>
          <p>
            OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO THE USE OF OR
            INABILITY TO USE THE SERVICE SHALL NOT EXCEED THE AMOUNT YOU PAID TO US IN THE TWELVE
            (12) MONTHS PRIOR TO THE EVENT GIVING RISE TO THE LIABILITY, OR ONE HUNDRED DOLLARS
            ($100), WHICHEVER IS GREATER.
          </p>

          <h2>10. Indemnification</h2>
          <p>
            You agree to defend, indemnify, and hold harmless Alyne, its affiliates, directors,
            officers, employees, agents, and licensors from and against any claims, actions, suits,
            proceedings, demands, losses, liabilities, damages, costs, and expenses (including
            reasonable attorneys&apos; fees) arising out of or relating to: (a) your use of the Service,
            (b) your violation of these Terms, (c) your violation of any rights of another party,
            (d) your violation of any applicable law, rule, or regulation, or (e) any content you
            submit, post, or transmit through the Service.
          </p>

          <h2>11. Dispute Resolution and Arbitration</h2>
          <h3>11.1 Informal Resolution</h3>
          <p>
            Before filing a claim against Alyne, you agree to try to resolve the dispute informally
            by contacting us at legal@alyne.com. We will try to resolve the dispute informally by
            contacting you via email. If a dispute is not resolved within 30 days of submission, you
            or we may bring a formal proceeding.
          </p>

          <h3>11.2 Arbitration Agreement</h3>
          <p>
            You and Alyne agree that any dispute, claim, or controversy arising out of or relating
            to these Terms or the Service shall be settled by binding arbitration, except that
            either party may bring claims in small claims court if they qualify. Arbitration will be
            conducted by the American Arbitration Association (AAA) under its Commercial Arbitration
            Rules. The arbitration will be conducted in the English language in the state where you
            reside or another mutually agreed location.
          </p>
          <p>
            YOU AND ALYNE AGREE TO WAIVE ANY RIGHT TO A JURY TRIAL AND TO BRING CLAIMS ONLY ON AN
            INDIVIDUAL BASIS AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR
            REPRESENTATIVE PROCEEDING.
          </p>

          <h2>12. Governing Law and Jurisdiction</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State
            of Virginia, United States, without regard to its conflict of law provisions. Any legal
            action or proceeding arising under these Terms will be brought exclusively in the
            federal or state courts located in Alexandria, VA, and you hereby irrevocably consent to
            the personal jurisdiction and venue of such courts.
          </p>

          <h2>13. Severability and Waiver</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid, that provision
            shall be limited or eliminated to the minimum extent necessary so that these Terms shall
            otherwise remain in full force and effect and enforceable. Our failure to enforce any
            right or provision of these Terms shall not constitute a waiver of such right or
            provision.
          </p>

          <h2>14. Entire Agreement</h2>
          <p>
            These Terms, together with our Privacy Policy and any other legal notices published by
            us on the Service, shall constitute the entire agreement between you and Alyne
            concerning the Service. These Terms supersede all prior agreements and understandings
            between you and Alyne regarding the Service.
          </p>

          <h2>15. Contact Information</h2>
          <p>
            If you have any questions, concerns, or complaints about these Terms of Service, please
            contact us at:
          </p>
          <p>
            Alyne, Inc.<br />
            Email: legal@alyne.com<br />
            Address: [Your Business Address]
          </p>
        </div>
      </main>
    </div>
  );
}
