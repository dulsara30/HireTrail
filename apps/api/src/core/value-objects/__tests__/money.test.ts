import { describe, it, expect } from 'vitest';
import { Money } from '../money';

describe('Money Value Object', () => {
  it('creates money instance with minor unit integers and valid currency', () => {
    const money = new Money(500000, 'USD');
    expect(money.getAmount()).toBe(500000);
    expect(money.getCurrency()).toBe('USD');
  });

  it('rejects decimal amounts', () => {
    expect(() => new Money(123.45, 'USD')).toThrow(
      'Money amount must be an integer in minor units',
    );
  });

  it('rejects invalid currency codes', () => {
    expect(() => new Money(100, 'US')).toThrow('Invalid ISO 4217 currency code');
    expect(() => new Money(100, '123')).toThrow('Invalid ISO 4217 currency code');
  });

  it('adds money with the same currency', () => {
    const a = new Money(1000, 'EUR');
    const b = new Money(2500, 'EUR');
    const sum = a.add(b);
    expect(sum.getAmount()).toBe(3500);
    expect(sum.getCurrency()).toBe('EUR');
  });

  it('throws when adding money with different currencies', () => {
    const a = new Money(1000, 'USD');
    const b = new Money(1000, 'EUR');
    expect(() => a.add(b)).toThrow('Cannot add money in different currencies');
  });
});
