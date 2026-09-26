import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { RtStrategy } from './rt.strategy';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [UsersModule, PassportModule, RedisModule, JwtModule.register({})],
  providers: [AuthService, JwtStrategy, RtStrategy],
  controllers: [AuthController],
})
export class AuthModule {}
