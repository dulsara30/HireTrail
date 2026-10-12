import argon2 from 'argon2';
import { PasswordHasher } from '../../core/ports/password-hasher.port';

// OWASP baseline parameters: memory 19 MiB (19456 KiB), 2 iterations, parallelism 1
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;

// Pre-computed dummy hash using the exact same argon2id parameters for timing attack mitigation
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$7v8bA0mX8zJ6q4yL3k1wNg$X2j6Q+U9d5k8s4b7a1e0f3c6d9a2b5e8f1c4d7a0b3e';

export class Argon2PasswordHasher implements PasswordHasher {
  async hash(password: string): Promise<string> {
    const res = await argon2.hash(password, ARGON2_OPTIONS);
    return res.toString();
  }

  async verify(password: string, hash: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      return false;
    }
  }

  async dummyVerify(): Promise<void> {
    try {
      await argon2.verify(DUMMY_HASH, 'dummy-password-for-timing');
    } catch {
      // Intentionally ignored: this operation exists purely to ensure constant-time response
    }
  }
}
