import * as yup from 'yup';

const validUrlTest = (value?: string) => {
  if (!value) return true;
  try {
    const parsed = new URL(value);
    return (
      (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
};

export const envSchema = yup.object({
  APP_ENV: yup.string().oneOf(['development', 'preview', 'production']).default('development'),
  PORT: yup.number().integer().positive().default(4000),
  LOG_LEVEL: yup
    .string()
    .oneOf(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),
  MONGODB_URI: yup.string().required('MONGODB_URI is required'),
  MONGODB_DB_NAME: yup.string().default('hiretrail_dev'),
  WEB_APP_URL: yup
    .string()
    .test('valid-web-app-url', 'WEB_APP_URL must be a valid http or https URL', validUrlTest)
    .default('http://localhost:3000'),
  CORS_ORIGINS: yup.string().default('http://localhost:3000'),

  JWT_ACCESS_SECRET: yup
    .string()
    .min(32, 'JWT_ACCESS_SECRET must be at least 32 characters')
    .required('JWT_ACCESS_SECRET is required'),
  JWT_ISSUER: yup.string().default('hiretrail-api'),
  JWT_AUDIENCE: yup.string().default('hiretrail-web'),
  ACCESS_TOKEN_TTL_MIN: yup.number().integer().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: yup.number().integer().positive().default(30),

  COOKIE_SECRET: yup
    .string()
    .min(32, 'COOKIE_SECRET must be at least 32 characters')
    .required('COOKIE_SECRET is required'),
  IP_HASH_SALT: yup
    .string()
    .min(16, 'IP_HASH_SALT must be at least 16 characters')
    .required('IP_HASH_SALT is required'),

  GOOGLE_CLIENT_ID: yup.string().optional(),
  GOOGLE_CLIENT_SECRET: yup.string().optional(),
  GOOGLE_REDIRECT_URI: yup.string().optional(),

  GEMINI_API_KEY: yup.string().optional(),
  GEMINI_MODEL_EXTRACT: yup.string().default('gemini-3.5-flash-lite'),
  GEMINI_MODEL_GROUNDED: yup.string().default('gemini-3.8-flash'),
  // Comma-separated list, tried in order when the main model is overloaded or over quota.
  // The Flash-Lite models are the fastest and have the largest free limits (500 requests per day), so they come first.
  GEMINI_MODEL_FALLBACK: yup
    .string()
    .default(
      'gemini-3.5-flash-lite,gemini-flash-lite-latest,gemini-3.8-flash,gemini-3-flash-preview,gemini-flash-latest',
    ),
  // Comma-separated models tried in order for Google Search calls (company lookup and accuracy check)
  // when the main grounded model is over quota, overloaded, slow or does not support search.
  GEMINI_MODEL_GROUNDED_FALLBACK: yup
    .string()
    .default('gemini-flash-lite-latest,gemini-3.1-flash-lite,gemini-3-flash-preview'),
  GEMINI_TOOLS_WITH_SCHEMA: yup
    .boolean()
    .transform((val, orig) => (typeof orig === 'string' ? orig === 'true' : val))
    .default(false),
  // Web search used to find real public pages about a company (https://tavily.com, free plan)
  TAVILY_API_KEY: yup.string().optional(),
  // Stop using search after this many credits in a month (the free plan has about 1,000)
  TAVILY_MONTHLY_BUDGET: yup.number().integer().positive().default(900),
  // When search gives nothing, try the company's own website (guessed from its name)
  LOOKUP_WEBSITE_GUESS: yup
    .boolean()
    .transform((val, orig) => (typeof orig === 'string' ? orig === 'true' : val))
    .default(true),
  // Shared secret for scheduled jobs (Orbit reminder and digest emails). Generate a long random string.
  CRON_SECRET: yup.string().min(16, 'CRON_SECRET must be at least 16 characters').optional(),
  AI_ENABLED: yup
    .boolean()
    .transform((val, orig) => (typeof orig === 'string' ? orig === 'true' : val))
    .default(true),
  AI_GLOBAL_DAILY_LIMIT: yup.number().integer().positive().default(500),
  AI_QUOTA_AUTOFILL: yup.number().integer().positive().default(40),
  AI_QUOTA_COMPANY_VERIFY: yup.number().integer().positive().default(20),
  AI_QUOTA_COMPANY_LOOKUP: yup.number().integer().positive().default(20),
  AI_QUOTA_INSIGHTS: yup.number().integer().positive().default(1),
  AI_QUOTA_ORBIT_PARSE: yup.number().integer().positive().default(40),

  EMAIL_API_KEY: yup.string().when('APP_ENV', {
    is: 'production',
    then: (schema) =>
      schema.required('EMAIL_API_KEY (or RESEND_API_KEY) is required in production'),
    otherwise: (schema) => schema.optional(),
  }),
  EMAIL_FROM: yup.string().default('HireTrail <no-reply@hiretrail.local>'),
  SENTRY_DSN: yup.string().optional(),
});

export type RawEnv = yup.InferType<typeof envSchema>;
