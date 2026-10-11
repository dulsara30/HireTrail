// Set test environment variables before anything loads
process.env.APP_ENV = 'development';
process.env.LOG_LEVEL = 'fatal';
process.env.MONGODB_URI = 'mongodb://localhost:27017/hiretrail_test';
process.env.MONGODB_DB_NAME = 'hiretrail_test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-minimum-32-characters-long';
process.env.COOKIE_SECRET = 'test-cookie-secret-minimum-32-characters-long';
process.env.IP_HASH_SALT = 'test-ip-salt-16-bytes';
process.env.WEB_APP_URL = 'http://localhost:3000';
process.env.CORS_ORIGINS = 'http://localhost:3000';
