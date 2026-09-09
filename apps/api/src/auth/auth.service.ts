import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@code-archaeologist/core';
import { type AppEnv } from '@code-archaeologist/shared';
import * as argon2 from 'argon2';
import { AuditService } from '../audit/audit.service';
import { ApiErrors } from '../common/api-exception';
import { APP_ENV } from '../config/env.service';
import { PrismaService } from '../database/prisma.service';
import { type AuthResponseDto, type TokenResponseDto, type UserResponseDto } from './dto/auth-response.dto';
import { type LoginDto } from './dto/login.dto';
import { type RegisterDto } from './dto/register.dto';
import { type AccessTokenPayload, type RefreshTokenPayload, type RequestUser } from './auth.types';
import { hashToken, pendingSessionHash, slugifyName, ttlToSeconds } from './token.util';

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(AuditService) private readonly audit: AuditService,
    @Inject(APP_ENV) private readonly env: AppEnv,
  ) {}

  async register(input: RegisterDto): Promise<AuthResponseDto> {
    const email = normalizeEmail(input.email);
    const passwordHash = await argon2.hash(input.password, { type: argon2.argon2id });
    const name = input.name.trim();

    try {
      const result = await this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: { email, passwordHash, name },
        });
        const workspace = await tx.workspace.create({
          data: {
            name: `${name}'s workspace`,
            slug: slugifyName(name),
            ownerId: user.id,
            members: {
              create: { userId: user.id, role: 'OWNER', status: 'ACTIVE' },
            },
          },
        });
        const tokens = await this.issueTokens(tx, user.id, user.email);
        return { user, workspace, tokens };
      });

      await this.audit.record({
        userId: result.user.id,
        workspaceId: result.workspace.id,
        action: 'AUTH_REGISTER',
        resource: `user:${result.user.id}`,
        metadata: { workspaceId: result.workspace.id },
      });

      return { ...result.tokens, user: toUserResponse(result.user) };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw ApiErrors.conflict('AUTH_EMAIL_TAKEN', 'An account with this email already exists');
      }
      throw error;
    }
  }

  async login(input: LoginDto): Promise<AuthResponseDto> {
    const email = normalizeEmail(input.email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw ApiErrors.invalidCredentials();
    }

    const passwordOk = await argon2.verify(user.passwordHash, input.password);
    if (!passwordOk) {
      throw ApiErrors.invalidCredentials();
    }
    if (user.status !== 'ACTIVE') {
      throw ApiErrors.disabled();
    }

    const tokens = await this.prisma.$transaction((tx) => this.issueTokens(tx, user.id, user.email));
    await this.audit.record({
      userId: user.id,
      action: 'AUTH_LOGIN',
      resource: `user:${user.id}`,
    });
    return { ...tokens, user: toUserResponse(user) };
  }

  async refresh(refreshToken: string): Promise<TokenResponseDto> {
    let payload: RefreshTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<RefreshTokenPayload>(refreshToken, {
        secret: this.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw ApiErrors.unauthorized('Invalid refresh token');
    }

    if (payload.typ !== 'refresh' || !payload.sid || !payload.sub) {
      throw ApiErrors.unauthorized('Invalid refresh token');
    }

    const session = await this.prisma.session.findUnique({ where: { id: payload.sid } });
    if (!session || session.userId !== payload.sub) {
      throw ApiErrors.unauthorized('Invalid refresh token');
    }

    if (session.revokedAt) {
      await this.prisma.session.updateMany({
        where: { userId: session.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      throw ApiErrors.unauthorized('Refresh token reuse detected');
    }

    if (session.expiresAt <= new Date() || session.refreshTokenHash !== hashToken(refreshToken)) {
      throw ApiErrors.unauthorized('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: session.userId } });
    if (!user || user.status !== 'ACTIVE') {
      throw ApiErrors.unauthorized('Invalid refresh token');
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.session.update({
        where: { id: session.id },
        data: { revokedAt: new Date() },
      });
      return this.issueTokens(tx, user.id, user.email);
    });
  }

  async logout(user: RequestUser): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: user.sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      userId: user.id,
      action: 'AUTH_LOGOUT',
      resource: `session:${user.sessionId}`,
    });
  }

  async me(user: RequestUser): Promise<UserResponseDto> {
    const record = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return toUserResponse(record);
  }

  private async issueTokens(
    tx: Prisma.TransactionClient,
    userId: string,
    email: string,
  ): Promise<TokenResponseDto> {
    const expiresAt = new Date(Date.now() + this.env.JWT_REFRESH_TTL_DAYS * 86_400_000);
    const session = await tx.session.create({
      data: {
        userId,
        refreshTokenHash: pendingSessionHash(),
        expiresAt,
      },
    });

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email, sid: session.id, typ: 'access' } satisfies AccessTokenPayload,
      { secret: this.env.JWT_ACCESS_SECRET, expiresIn: this.env.JWT_ACCESS_TTL as `${number}${'s' | 'm' | 'h' | 'd'}` },
    );
    const refreshToken = await this.jwt.signAsync(
      { sub: userId, sid: session.id, typ: 'refresh' } satisfies RefreshTokenPayload,
      { secret: this.env.JWT_REFRESH_SECRET, expiresIn: `${this.env.JWT_REFRESH_TTL_DAYS}d` },
    );

    await tx.session.update({
      where: { id: session.id },
      data: { refreshTokenHash: hashToken(refreshToken) },
    });

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: ttlToSeconds(this.env.JWT_ACCESS_TTL),
    };
  }
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function toUserResponse(user: { id: string; email: string; name: string; status: string; createdAt: Date }): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    status: user.status,
    createdAt: user.createdAt,
  };
}
