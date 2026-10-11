import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { app } from '../../../app';

describe('GET /health route', () => {
  let mongod: MongoMemoryServer;

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('returns 200 with db: up when database is connected', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body).toEqual({
      data: {
        status: 'ok',
        db: 'up',
        version: '0.1.0',
      },
    });
  });

  it('also responds on root /health alias', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.data.db).toBe('up');
  });

  it('returns 503 with db: down when database is disconnected', async () => {
    await mongoose.disconnect();

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(503);
    expect(res.body).toEqual({
      data: {
        status: 'degraded',
        db: 'down',
        version: '0.1.0',
      },
    });

    // Reconnect for cleanup
    await mongoose.connect(mongod.getUri());
  });
});
