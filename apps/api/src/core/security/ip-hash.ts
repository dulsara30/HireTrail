import crypto from 'node:crypto';

export class IpHash {
  public static hash(ip: string, salt: string): string {
    return crypto.createHmac('sha256', salt).update(ip).digest('hex');
  }
}

export const hashIp = IpHash.hash;
