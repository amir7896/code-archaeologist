import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { type WorkspaceRoleName } from '@code-archaeologist/shared';

export type RequestMembership = {
  role: WorkspaceRoleName;
};

export const CurrentMembership = createParamDecorator(
  (_data: unknown, context: ExecutionContext): RequestMembership => {
    const request = context.switchToHttp().getRequest<{ membership: RequestMembership }>();
    return request.membership;
  },
);
