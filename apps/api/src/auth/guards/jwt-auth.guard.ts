import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type AppEnv } from '@code-archaeologist/shared';
import { ApiErrors } from '../../common/api-exception';
import { APP_ENV } from '../../config/env.service';
import { PrismaService } from '../../database/prisma.service';
import { type AccessTokenPayload, type RequestUser } from '../auth.types';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: RequestUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw ApiErrors.unauthorized('Missing access token');
    }

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(header.slice(7), {
        secret: this.env.JWT_ACCESS_SECRET,
      });
    } catch {
      throw ApiErrors.unauthorized('Invalid access token');
    }

    if (payload.typ !== 'access' || !payload.sub || !payload.sid) {
      throw ApiErrors.unauthorized('Invalid access token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.status !== 'ACTIVE') {
      throw ApiErrors.unauthorized('Invalid access token');
    }

    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.userId !== user.id || session.revokedAt || session.expiresAt <= new Date()) {
      throw ApiErrors.unauthorized('Session has been revoked');
    }

    request.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      sessionId: session.id,
    };
    return true;
  }
}
