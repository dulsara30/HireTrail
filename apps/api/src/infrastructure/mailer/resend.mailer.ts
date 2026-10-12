import { Resend } from 'resend';
import { Mailer, SendEmailOptions } from '../../core/ports/mailer.port';
import { logger } from '../../core/logger/logger';

export class ResendMailer implements Mailer {
  private readonly resend: Resend;

  constructor(
    apiKey: string,
    private readonly defaultFrom: string,
  ) {
    this.resend = new Resend(apiKey);
  }

  async send(options: SendEmailOptions): Promise<void> {
    try {
      await this.resend.emails.send({
        from: this.defaultFrom,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
    } catch (err) {
      logger.error({ err, to: options.to }, 'Failed to send email via Resend');
      throw err;
    }
  }
}
