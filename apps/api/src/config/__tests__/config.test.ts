import { describe, it, expect } from 'vitest';
import { loadConfig } from '../config';

describe('Config Loader and Env Validation', () => {
  const validEnv: NodeJS.ProcessEnv = {
    APP_ENV: 'development',
    PORT: '4000',
    LOG_LEVEL: 'info',
    MONGODB_URI: 'mongodb://localhost:27017/hiretrail',
    MONGODB_DB_NAME: 'hiretrail_dev',
    JWT_ACCESS_SECRET: 'super-secure-secret-that-is-at-least-32-chars-long!',
    COOKIE_SECRET: 'super-secure-cookie-secret-that-is-at-least-32-chars-long!',
    IP_HASH_SALT: 'secure-ip-hash-salt-16-bytes',
    WEB_APP_URL: 'http://localhost:3000',
    CORS_ORIGINS: 'http://localhost:3000,http://127.0.0.1:3000',
  };

  it('loads valid configuration successfully', () => {
    const config = loadConfig(validEnv);
    expect(config.port).toBe(4000);
    expect(config.appEnv).toBe('development');
    expect(config.mongodbUri).toBe('mongodb://localhost:27017/hiretrail');
    expect(config.jwt.accessSecret).toBe('super-secure-secret-that-is-at-least-32-chars-long!');
    expect(config.corsOrigins).toEqual(['http://localhost:3000', 'http://127.0.0.1:3000']);
  });

  it('fails with clear message when required env var is missing', () => {
    const invalidEnv = { ...validEnv };
    delete invalidEnv.MONGODB_URI;

    expect(() => loadConfig(invalidEnv)).toThrow(
      /Environment validation failed:\s+- MONGODB_URI: MONGODB_URI is required/,
    );
  });

  it('fails when JWT secret is shorter than 32 characters', () => {
    const invalidEnv = {
      ...validEnv,
      JWT_ACCESS_SECRET: 'too-short',
    };

    expect(() => loadConfig(invalidEnv)).toThrow(
      /JWT_ACCESS_SECRET must be at least 32 characters/,
    );
  });
});
