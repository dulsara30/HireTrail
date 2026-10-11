export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface Mailer {
  send(options: SendEmailOptions): Promise<void>;
}
