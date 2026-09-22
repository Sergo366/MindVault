import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity';
import { SignupDto } from './dtos/signup.dto';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../users/user.service';
import { RedisService } from '../redis/redis.service';

export interface Tokens {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
  };
}

@Injectable()
export class AuthService {
  constructor(
    private usersService: UserService,
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async getTokens(userId: string): Promise<Tokens> {
    const [at, rt] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
        },
        {
          secret: process.env.JWT_SECRET || 'secretKey',
          expiresIn: '24h',
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
        },
        {
          secret: process.env.JWT_REFRESH_SECRET || 'refreshSecretKey',
          expiresIn: '7d',
        },
      ),
    ]);

    return {
      access_token: at,
      refresh_token: rt,
      user: {
        id: userId,
      },
    };
  }

  async updateRtHash(userId: string, rt: string) {
    const hash = await bcrypt.hash(rt, 10);
    try {
      await this.redisService.set(`rt:${userId}`, hash, 7 * 24 * 60 * 60);
    } catch (error) {
      console.warn(`Failed to save RT to Redis for user ${userId}`, error);
    }
  }

  async signup(signupDto: SignupDto): Promise<Tokens> {
    if (signupDto.password !== signupDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    const existingUser = await this.usersService.findByEmail(signupDto.email);

    if (existingUser) {
      throw new BadRequestException('Email already in use');
    }

    const hashedPassword = await bcrypt.hash(signupDto.password, 10);

    const user = await this.usersService.create({
      email: signupDto.email,
      password: hashedPassword,
    });

    const tokens = await this.getTokens(user.id);
    await this.updateRtHash(user.id, tokens.refresh_token);


    return tokens;
  }

  async validateUser(email: string, pass: string): Promise<User | null> {
    const user = await this.usersService.findByEmail(email);
    if (user && (await bcrypt.compare(pass, user.password))) {
      return user;
    }
    return null;
  }

  async login(user: User): Promise<Tokens> {
    const tokens = await this.getTokens(user.id);
    await this.updateRtHash(user.id, tokens.refresh_token);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    try {
      await this.redisService.del(`rt:${userId}`);
    } catch (e) {
      console.error('Redis del error:', e);
      throw new InternalServerErrorException(
        'Failed to delete refresh token from Redis. Please try again later. If the issue persists, please contact support. Error: ' +
          e,
      );
    }
  }

  async refreshTokens(userId: string, rt: string): Promise<Tokens> {
    if (!userId) {
      throw new BadRequestException('User does not exist');
    }

    let refreshToken = null;

    try {
      refreshToken = await this.redisService.get(`rt:${userId}`);
    } catch (error) {
      console.warn(`Failed to get RT from Redis for user ${userId}`, error);
      throw new InternalServerErrorException(
        'Authentication service is currently unavailable',
      );
    }

    if (!refreshToken) {
      await this.logout(userId);
      throw new ForbiddenException('Access Denied');
    }

    const rtMatches = await bcrypt.compare(rt, refreshToken);

    if (!rtMatches) {
      throw new ForbiddenException('Access Denied');
    }
    const tokens = await this.getTokens(userId);
    await this.updateRtHash(userId, tokens.refresh_token);
    return tokens;
  }
}
