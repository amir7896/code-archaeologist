import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { EnvModule } from './config/env.module';
import { DatabaseModule } from './database/database.module';
import { HealthModule } from './health/health.module';
import { InvestigationsModule } from './investigations/investigations.module';
import { RepositoriesModule } from './repositories/repositories.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';

@Module({
  imports: [
    EnvModule,
    DatabaseModule,
    ThrottlerModule.forRoot({
      errorMessage: 'Too many attempts. Try again in a minute.',
      throttlers: [{ name: 'default', ttl: 60_000, limit: 60 }],
      skipIf: (context) => {
        const path = context.switchToHttp().getRequest<{ url?: string }>().url ?? '';
        return path.includes('/health');
      },
    }),
    AuditModule,
    AuthModule,
    UsersModule,
    WorkspacesModule,
    RepositoriesModule,
    InvestigationsModule,
    HealthModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
