import { Mailer, SendEmailOptions } from '../../core/ports/mailer.port';
import { logger } from '../../core/logger/logger';

export class ConsoleMailer implements Mailer {
  async send(options: SendEmailOptions): Promise<void> {
    logger.info(
      {
        to: options.to,
        subject: options.subject,
        text: options.text,
      },
      '[ConsoleMailer] Email sent in development mode',
    );
  }
}
