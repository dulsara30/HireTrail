import mongoose from 'mongoose';
import { logger } from '../logger/logger';
import { softDeletePlugin } from './plugins/soft-delete.plugin';
import { toJsonPlugin } from './plugins/to-json.plugin';

interface GlobalMongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  var __mongooseConnection: GlobalMongooseCache | undefined;
}

const cache: GlobalMongooseCache = global.__mongooseConnection ?? {
  conn: null,
  promise: null,
};

global.__mongooseConnection = cache;

// Apply global security and query settings
mongoose.set('sanitizeFilter', true);
mongoose.set('strictQuery', true);

// Register global schema plugins
mongoose.plugin(softDeletePlugin);
mongoose.plugin(toJsonPlugin);

export async function connectDatabase(uri: string, dbName?: string): Promise<typeof mongoose> {
  if (cache.conn && mongoose.connection.readyState === 1) {
    return cache.conn;
  }

  if (!cache.promise) {
    logger.info(
      { uri: uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:[REDACTED]@'), dbName },
      'Connecting to MongoDB',
    );

    cache.promise = mongoose
      .connect(uri, {
        dbName,
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      })
      .then((m) => {
        logger.info('MongoDB connection established successfully');
        return m;
      })
      .catch((err) => {
        logger.error({ err }, 'Failed to connect to MongoDB');
        cache.promise = null;
        throw err;
      });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}

export async function pingDatabase(): Promise<boolean> {
  try {
    if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
      return false;
    }
    const adminDb = mongoose.connection.db.admin();
    const pingResult = await adminDb.ping();
    return Boolean(pingResult && pingResult.ok === 1);
  } catch {
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }
  cache.conn = null;
  cache.promise = null;
}
