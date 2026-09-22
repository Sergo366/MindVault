import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetCurrentUserId = createParamDecorator(
  (data: undefined, context: ExecutionContext): string => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: { userId: string } }>();
    return request.user.userId;
  },
);
