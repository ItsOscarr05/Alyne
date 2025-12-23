import nodemailer from 'nodemailer';
import { logger } from './logger';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = process.env.SMTP_PORT;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    // If SMTP is not configured, log a warning but don't fail
    if (!smtpHost || !smtpPort || !smtpUser || !smtpPass) {
      logger.warn('SMTP configuration not found. Email sending will be disabled.');
      logger.warn('To enable email, set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS in .env');
      return;
    }

    // Special handling for different email providers
    const isSendGrid = smtpHost.includes('sendgrid');
    const isResend = smtpHost.includes('resend.com');
    const isBrevo = smtpHost.includes('brevo.com') || smtpHost.includes('sendinblue.com');
    const isMailgun = smtpHost.includes('mailgun.org');
    
    const transportConfig: any = {
      host: smtpHost,
      port: parseInt(smtpPort, 10),
      secure: smtpPort === '465', // true for 465, false for other ports
      auth: {
        user: isSendGrid ? 'apikey' : (isResend ? 'resend' : smtpUser),
        pass: smtpPass,
      },
    };

    this.transporter = nodemailer.createTransport(transportConfig);

    // Verify connection (async, don't block server startup)
    // Use setTimeout to make it non-blocking
    setTimeout(() => {
      this.transporter?.verify((error) => {
        if (error) {
          logger.error('SMTP connection error:', error);
          if (error.message?.includes('Maximum credits exceeded') || error.responseCode === 451) {
            logger.error('SendGrid quota exceeded. Check your SendGrid account or upgrade your plan.');
            logger.warn('Email sending will be disabled until SMTP is properly configured.');
            this.transporter = null; // Disable email service
          } else if (error.code === 'EAUTH') {
            logger.error('SMTP authentication failed. Check your SMTP_USER and SMTP_PASS in .env');
            logger.warn('Email sending will be disabled until SMTP credentials are fixed.');
            this.transporter = null; // Disable email service
          }
        } else {
          logger.info('SMTP server connection verified');
          if (smtpHost.includes('gmail')) {
            logger.warn('Gmail SMTP detected: Emails will be sent from your Gmail account.');
            logger.warn('To send from noreply@alyne.com, use Resend, Brevo, Mailgun, or Google Workspace with custom domain.');
          } else if (isResend) {
            logger.info('Resend SMTP detected.');
            if (emailFrom?.includes('resend.dev')) {
              logger.info('Using Resend test domain (onboarding@resend.dev). Emails may be delayed or require verification.');
            } else {
              logger.info('Make sure you have verified your domain in Resend dashboard for production use.');
            }
          } else if (isBrevo) {
            logger.info('Brevo (Sendinblue) SMTP detected. Free tier: 300 emails/day.');
          } else if (isMailgun) {
            logger.info('Mailgun SMTP detected. Free tier: 1,000 emails/month after trial.');
          }
        }
      });
    }, 0);
  }

  async sendEmail(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      logger.warn('Email service not configured. Skipping email send.');
      logger.warn(`Would have sent email to: ${options.to}, Subject: ${options.subject}`);
      return;
    }

    const emailFrom = process.env.EMAIL_FROM || 'noreply@alyne.com';
    // Format: "Display Name <email@domain.com>" - Gmail will use the display name
    const from = `Alyne <${emailFrom}>`;

    try {
      logger.info(`Attempting to send email to ${options.to} from ${emailFrom}`);
      
      const info = await this.transporter.sendMail({
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text || options.html.replace(/<[^>]*>/g, ''), // Strip HTML tags for text version
      });

      logger.info(`Email sent successfully to ${options.to}`, {
        messageId: info.messageId,
        response: info.response,
        accepted: info.accepted,
        rejected: info.rejected,
        pending: info.pending,
      });

      // Log warning if email was rejected
      if (info.rejected && info.rejected.length > 0) {
        logger.warn(`Email was rejected for: ${info.rejected.join(', ')}`);
      }
    } catch (error: any) {
      logger.error('Error sending email:', {
        message: error.message,
        code: error.code,
        response: error.response,
        responseCode: error.responseCode,
        command: error.command,
      });
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = process.env.FRONTEND_URL 
      ? `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
      : `Reset token: ${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset Request</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #4F46E5; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="color: white; margin: 0;">Alyne</h1>
          </div>
          <div style="background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px;">
            <h2 style="color: #111827; margin-top: 0;">Password Reset Request</h2>
            <p>You requested to reset your password for your Alyne account.</p>
            <p>Use the following code to reset your password:</p>
            <div style="background-color: #ffffff; border: 2px solid #4F46E5; border-radius: 6px; padding: 20px; margin: 20px 0; text-align: center;">
              <code style="font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 8px; font-family: 'Courier New', monospace;">${resetToken}</code>
            </div>
            <p style="margin-top: 30px;">This code will expire in 15 minutes.</p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
              If you didn't request this password reset, please ignore this email or contact support if you have concerns.
            </p>
          </div>
          <div style="text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} Alyne. All rights reserved.</p>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: email,
      subject: 'Password Reset Request - Alyne',
      html,
    });
  }
}

export const emailService = new EmailService();

