import {
  Body,
  Controller,
  Res,
  Post,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthService, Tokens } from './auth.service';
import { SignupDto } from './dtos/signup.dto';
import { SigninDto } from './dtos/signin.dto';

import { Public } from './public.decorator';
import { RtGuard } from './rt.guard';
import { GetCurrentUserId } from './decorators/get-current-user-id.decorator';
import { GetCurrentUser } from './decorators/get-current-user.decorator';
import { Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  private setCookies(res: Response, tokens: Tokens) {
    const isProd = process.env.NODE_ENV === 'production';

    res.cookie('access_token', tokens.access_token, {
      httpOnly: false, // Accessible by Next.js middleware
      secure: true, // Must be true for sameSite: 'none'
      sameSite: isProd ? 'none' : 'lax',
      path: '/',
    });

    res.cookie('refresh_token', tokens.refresh_token, {
      httpOnly: true, // Secure
      secure: true,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  private clearCookies(res: Response) {
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Public()
  @Post('signup')
  async signup(
    @Body() body: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.signup(body);
    this.setCookies(res, tokens);

    return {
      user: tokens.user,
      accessToken: tokens.access_token,
    };
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Public()
  @Post('signin')
  async signin(
    @Body() body: SigninDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const user = await this.authService.validateUser(body.email, body.password);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const tokens = await this.authService.login(user);
    this.setCookies(res, tokens);

    return {
      user: tokens.user,
      accessToken: tokens.access_token,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @GetCurrentUserId() userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(userId);
    this.clearCookies(res);
    return { success: true };
  }

  @Public()
  @UseGuards(RtGuard)
  @Post('refreshToken')
  @HttpCode(HttpStatus.OK)
  async refreshTokens(
    @GetCurrentUserId() userId: string,
    @GetCurrentUser('refreshToken') rt: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const tokens = await this.authService.refreshTokens(userId, rt);
    this.setCookies(res, tokens);

    return {
      user: tokens.user,
      accessToken: tokens.access_token,
    };
  }
}
