export class EmailAddress {
  private readonly address: string;

  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  constructor(email: string) {
    if (!email || typeof email !== 'string') {
      throw new Error('Email address must be a non-empty string');
    }

    const normalized = email.trim().toLowerCase();
    if (!EmailAddress.EMAIL_REGEX.test(normalized)) {
      throw new Error(`Invalid email address: ${email}`);
    }

    this.address = normalized;
  }

  public value(): string {
    return this.address;
  }

  public equals(other: EmailAddress): boolean {
    return this.address === other.address;
  }

  public toString(): string {
    return this.address;
  }
}
