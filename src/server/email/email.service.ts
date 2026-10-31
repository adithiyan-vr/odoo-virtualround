import nodemailer from 'nodemailer';
import prisma from '@/lib/db';
import { EmailStatus } from '@/lib/constants/enums';

export interface SendEmailOptions {
  to: string;
  subject: string;
  template: 'reset_password' | 'invoice' | 'quotation' | 'general';
  html: string;
}

export class EmailService {
  private static transporter: nodemailer.Transporter | null = null;

  private static getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });
      return this.transporter;
    }

    return null;
  }

  static async send(options: SendEmailOptions): Promise<{ id: string; status: EmailStatus }> {
    const transport = (process.env.EMAIL_TRANSPORT || 'db').toLowerCase();
    const from = process.env.EMAIL_FROM || 'Brightloop <no-reply@brightloop.io>';

    let status: EmailStatus = EmailStatus.SENT;
    let errorMessage: string | null = null;

    if (transport === 'smtp') {
      const transporter = this.getTransporter();
      if (transporter) {
        try {
          await transporter.sendMail({
            from,
            to: options.to,
            subject: options.subject,
            html: options.html,
          });
        } catch (err: unknown) {
          status = EmailStatus.FAILED;
          errorMessage = err instanceof Error ? err.message : String(err);
          console.error('[EmailService] SMTP send error:', err);
        }
      } else {
        status = EmailStatus.FAILED;
        errorMessage = 'SMTP configuration missing';
      }
    } else if (transport === 'console') {
      console.log('─────────────────── MOCKED EMAIL ───────────────────');
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Template: ${options.template}`);
      console.log(`Body:\n${options.html}`);
      console.log('────────────────────────────────────────────────────');
    }

    // Always log to database
    const emailLog = await prisma.emailLog.create({
      data: {
        toEmail: options.to,
        subject: options.subject,
        template: options.template,
        html: options.html,
        status,
        transport,
        error: errorMessage,
      },
    });

    return { id: emailLog.id, status };
  }

  static renderResetPasswordEmail(name: string, resetUrl: string): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a;">Reset Your Brightloop Password</h2>
        <p>Hello ${name},</p>
        <p>We received a request to reset your password. Click the button below to choose a new password. This link will expire in 30 minutes.</p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">If you did not request a password reset, you can safely ignore this email.</p>
        <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
          Brightloop Subscription Platform
        </p>
      </div>
    `;
  }
}
