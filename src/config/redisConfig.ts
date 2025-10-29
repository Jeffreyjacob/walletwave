import Redis, { RedisOptions } from 'ioredis';
import getConfig from './config';

const config = getConfig();
const password =
  config.redis.password !== '' ? { password: config.redis.password } : {};
const username =
  config.redis.password !== ''
    ? {
        username: config.redis.username,
      }
    : {};

const cacheRedis = new Redis({
  host: config.redis.host,
  ...password,
  ...username,
  port: config.redis.port,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 3,
  db: 0,
});

const bullmqRedis = new Redis({
  host: config.redis.host,
  ...password,
  ...username,
  port: config.redis.port,
  db: 1,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
});

cacheRedis.on('connect', () => {
  console.log('Connected to cache redis');
});

bullmqRedis.on('connect', () => {
  console.log('Connected to bullmq redis');
});

export { cacheRedis, bullmqRedis };
