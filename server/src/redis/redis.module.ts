import { Module } from '@nestjs/common';
import { RedisService } from './redis.service';

@Module({
  providers: [RedisService],
  imports: [],
  exports: [RedisService],
  controllers: [],
})
export class RedisModule {}
