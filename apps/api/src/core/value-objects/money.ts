export class Money {
  private readonly amount: number; // in minor units (e.g. cents)
  private readonly currency: string;

  constructor(amount: number, currency = 'USD') {
    if (!Number.isInteger(amount)) {
      throw new Error(`Money amount must be an integer in minor units, received ${amount}`);
    }
    const cleanCurrency = currency.trim().toUpperCase();
    if (!/^[A-Z]{3}$/.test(cleanCurrency)) {
      throw new Error(`Invalid ISO 4217 currency code: ${currency}`);
    }

    this.amount = amount;
    this.currency = cleanCurrency;
  }

  public getAmount(): number {
    return this.amount;
  }

  public getCurrency(): string {
    return this.currency;
  }

  public add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error(
        `Cannot add money in different currencies: ${this.currency} and ${other.currency}`,
      );
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  public equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  public toJSON(): { amount: number; currency: string } {
    return {
      amount: this.amount,
      currency: this.currency,
    };
  }
}
