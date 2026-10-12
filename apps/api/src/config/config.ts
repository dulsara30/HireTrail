import { envSchema } from './env.schema';

export interface AppConfig {
  appEnv: 'development' | 'preview' | 'production';
  port: number;
  logLevel: 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace';
  mongodbUri: string;
  mongodbDbName: string;
  webAppUrl: string;
  corsOrigins: string[];
  jwt: {
    accessSecret: string;
    issuer: string;
    audience: string;
    accessTokenTtlMin: number;
    refreshTokenTtlDays: number;
  };
  cookieSecret: string;
  ipHashSalt: string;
  google: {
    clientId?: string;
    clientSecret?: string;
    redirectUri?: string;
  };
  ai: {
    enabled: boolean;
    geminiApiKey?: string;
    modelExtract: string;
    modelGrounded: string;
    toolsWithSchema: boolean;
    globalDailyLimit: number;
    quotas: {
      autofill: number;
      companyVerify: number;
      companyLookup: number;
      insights: number;
    };
  };
  email: {
    apiKey?: string;
    from: string;
  };
  sentryDsn?: string;
}

export function loadConfig(rawEnv: NodeJS.ProcessEnv = process.env): AppConfig {
  try {
    const envWithAlias = {
      ...rawEnv,
      EMAIL_API_KEY: rawEnv.EMAIL_API_KEY || rawEnv.RESEND_API_KEY,
    };
    const validated = envSchema.validateSync(envWithAlias, {
      abortEarly: false,
      stripUnknown: true,
    });

    const corsOrigins = (validated.CORS_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const config: AppConfig = {
      appEnv: validated.APP_ENV as 'development' | 'preview' | 'production',
      port: validated.PORT,
      logLevel: validated.LOG_LEVEL as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace',
      mongodbUri: validated.MONGODB_URI,
      mongodbDbName: validated.MONGODB_DB_NAME,
      webAppUrl: validated.WEB_APP_URL,
      corsOrigins: corsOrigins.length > 0 ? corsOrigins : [validated.WEB_APP_URL],
      jwt: {
        accessSecret: validated.JWT_ACCESS_SECRET,
        issuer: validated.JWT_ISSUER,
        audience: validated.JWT_AUDIENCE,
        accessTokenTtlMin: validated.ACCESS_TOKEN_TTL_MIN,
        refreshTokenTtlDays: validated.REFRESH_TOKEN_TTL_DAYS,
      },
      cookieSecret: validated.COOKIE_SECRET,
      ipHashSalt: validated.IP_HASH_SALT,
      google: {
        clientId: validated.GOOGLE_CLIENT_ID,
        clientSecret: validated.GOOGLE_CLIENT_SECRET,
        redirectUri: validated.GOOGLE_REDIRECT_URI,
      },
      ai: {
        enabled: validated.AI_ENABLED,
        geminiApiKey: validated.GEMINI_API_KEY,
        modelExtract: validated.GEMINI_MODEL_EXTRACT,
        modelGrounded: validated.GEMINI_MODEL_GROUNDED,
        toolsWithSchema: validated.GEMINI_TOOLS_WITH_SCHEMA,
        globalDailyLimit: validated.AI_GLOBAL_DAILY_LIMIT,
        quotas: {
          autofill: validated.AI_QUOTA_AUTOFILL,
          companyVerify: validated.AI_QUOTA_COMPANY_VERIFY,
          companyLookup: validated.AI_QUOTA_COMPANY_LOOKUP,
          insights: validated.AI_QUOTA_INSIGHTS,
        },
      },
      email: {
        apiKey: validated.EMAIL_API_KEY,
        from: validated.EMAIL_FROM,
      },
      sentryDsn: validated.SENTRY_DSN,
    };

    return Object.freeze(config);
  } catch (error) {
    if (
      error &&
      typeof error === 'object' &&
      'inner' in error &&
      Array.isArray((error as { inner: unknown[] }).inner)
    ) {
      const details = (error as { inner: Array<{ path?: string; message: string }> }).inner
        .map((e) => `  - ${e.path ?? 'unknown'}: ${e.message}`)
        .join('\n');
      throw new Error(`[HireTrail Config Error] Environment validation failed:\n${details}`);
    }
    throw error;
  }
}

// Global cached config loaded from process.env (or populated lazily)
let activeConfig: AppConfig | null = null;

export const config: AppConfig = new Proxy({} as AppConfig, {
  get(_target, prop: keyof AppConfig) {
    if (!activeConfig) {
      activeConfig = loadConfig(process.env);
    }
    return activeConfig[prop];
  },
});
