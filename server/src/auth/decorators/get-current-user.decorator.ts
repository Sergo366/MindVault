import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type JwtPayload = {
  userId: string;
  email: string;
  refreshToken?: string;
};

export const GetCurrentUser = createParamDecorator(
  (data: keyof JwtPayload | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<{ user: JwtPayload }>();
    if (!data) return request.user;
    return request.user[data];
  },
);
