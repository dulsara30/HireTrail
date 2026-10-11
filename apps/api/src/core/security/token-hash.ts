import crypto from 'node:crypto';

export class TokenHash {
  public static hash(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  public static generateSecureToken(bytes = 32): string {
    return crypto.randomBytes(bytes).toString('hex');
  }
}
