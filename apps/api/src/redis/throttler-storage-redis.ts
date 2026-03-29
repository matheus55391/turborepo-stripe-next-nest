import { Injectable } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import type { ThrottlerStorageRecord } from '@nestjs/throttler/dist/throttler-storage-record.interface';
import { RedisService } from './redis.service';

@Injectable()
export class ThrottlerStorageRedis implements ThrottlerStorage {
  constructor(private readonly redis: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<ThrottlerStorageRecord> {
    const storageKey = `throttle:${throttlerName}:${key}`;
    const blockKey = `throttle:${throttlerName}:${key}:blocked`;

    // Check if currently blocked
    const blocked = await this.redis.get<number>(blockKey);
    if (blocked) {
      const blockTtl = await this.redis.client.ttl(blockKey);
      return {
        totalHits: limit + 1,
        timeToExpire: 0,
        isBlocked: true,
        timeToBlockExpire: Math.max(blockTtl, 0) * 1000,
      };
    }

    // Increment hit counter
    const totalHits = await this.redis.client.incr(storageKey);

    // Set TTL on first hit
    if (totalHits === 1) {
      await this.redis.client.expire(storageKey, Math.ceil(ttl / 1000));
    }

    const ttlRemaining = await this.redis.client.ttl(storageKey);

    // If limit exceeded, block the key
    if (totalHits > limit && blockDuration > 0) {
      await this.redis.client.set(
        blockKey,
        '1',
        'EX',
        Math.ceil(blockDuration / 1000),
      );
      return {
        totalHits,
        timeToExpire: Math.max(ttlRemaining, 0) * 1000,
        isBlocked: true,
        timeToBlockExpire: blockDuration,
      };
    }

    return {
      totalHits,
      timeToExpire: Math.max(ttlRemaining, 0) * 1000,
      isBlocked: false,
      timeToBlockExpire: 0,
    };
  }
}
