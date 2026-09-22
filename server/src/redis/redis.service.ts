import { Injectable, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService {
  readonly redisClient: Redis;
  private readonly logger = new Logger(RedisService.name);
  private isConnected = false;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST') || 'localhost';
    const port = this.configService.get<number>('REDIS_PORT') || 6379;
    const password = this.configService.get<string>('REDIS_PASSWORD') || '';
    const useTls = this.configService.get<string>('REDIS_TLS') === 'true';

    this.logger.log(`Connecting to Redis at ${host}:${port}, TLS: ${useTls}`);

    const redisOptions: any = {
      host,
      port,
      password,
      retryStrategy: (times: number) => {
        const delay = Math.min(times * 100, 5000);
        this.logger.warn(`Redis connection retry ${times}, delay: ${delay}ms`);
        return delay;
      },
      maxRetriesPerRequest: 5,
      enableReadyCheck: true,
      enableOfflineQueue: true,
      keepAlive: 30000,
      connectTimeout: 10000,
      lazyConnect: false,
    };

    if (useTls) {
      redisOptions.tls = {
        rejectUnauthorized: false,
        servername: host,
      };
    }

    this.redisClient = new Redis(redisOptions);

    this.redisClient.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Connected to Redis');
    });

    this.redisClient.on('error', (error) => {
      this.isConnected = false;
      this.logger.error('Redis connection error:', error);
    });

    this.redisClient.on('close', () => {
      this.isConnected = false;
      this.logger.warn('Redis connection closed');
    });
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping set operation');
      return;
    }
    try {
      if (ttlSeconds) {
        await this.redisClient.set(key, value, 'EX', ttlSeconds);
      } else {
        await this.redisClient.set(key, value);
      }
    } catch (error) {
      this.logger.error(`Failed to set key ${key}:`, error);
    }
  }

  async get(key: string) {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping get operation');
      return null;
    }
    try {
      return await this.redisClient.get(key);
    } catch (error) {
      this.logger.error(`Failed to get key ${key}:`, error);
      return null;
    }
  }

  async del(key: string) {
    if (!this.isConnected) {
      this.logger.warn('Redis not connected, skipping del operation');
      return;
    }
    try {
      await this.redisClient.del(key);
    } catch (error) {
      this.logger.error(`Failed to delete key ${key}:`, error);
    }
  }

  onModuleDestroy() {
    this.redisClient.disconnect();
  }
}
