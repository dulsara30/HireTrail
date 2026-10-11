import { generateKeyBetween } from 'fractional-indexing';

export class FractionalOrder {
  public static between(
    beforeOrder: string | null | undefined,
    afterOrder: string | null | undefined,
  ): string {
    const a = beforeOrder ? beforeOrder : null;
    const b = afterOrder ? afterOrder : null;
    return generateKeyBetween(a, b);
  }

  public static compare(orderA: string, orderB: string): number {
    if (orderA === orderB) return 0;
    return orderA < orderB ? -1 : 1;
  }
}
