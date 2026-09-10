import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MessageResponseDto } from '../auth/dto/auth-response.dto';
import { RequireRole } from '../workspaces/decorators/require-role.decorator';
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard';
import {
  ConnectGithubDto,
  GithubAuthorizeResponseDto,
  GithubIntegrationResponseDto,
  GithubOAuthDto,
} from './dto/integration.dto';
import { IntegrationsService } from './integrations.service';
import {
  ConnectGithubDocs,
  DisconnectGithubDocs,
  GetGithubIntegrationDocs,
  GithubAuthorizeDocs,
  GithubOAuthDocs,
  SyncGithubDocs,
} from './swagger/integration.swagger';

@ApiTags('integrations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, WorkspaceGuard)
@Controller('workspaces/:workspaceId/integrations')
export class IntegrationsController {
  constructor(@Inject(IntegrationsService) private readonly integrations: IntegrationsService) {}

  @Get('github')
  @GetGithubIntegrationDocs()
  getGithub(
    @Param('workspaceId') workspaceId: string,
    @Req() request: { protocol?: string; headers: { host?: string } },
  ): Promise<GithubIntegrationResponseDto> {
    return this.integrations.getGithub(workspaceId, requestOrigin(request));
  }

  @Get('github/authorize')
  @RequireRole('ADMIN')
  @GithubAuthorizeDocs()
  authorize(@Param('workspaceId') workspaceId: string): GithubAuthorizeResponseDto {
    return this.integrations.authorizeUrl(workspaceId);
  }

  @Post('github')
  @RequireRole('ADMIN')
  @ConnectGithubDocs()
  connect(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: ConnectGithubDto,
    @Req() request: { protocol?: string; headers: { host?: string } },
  ): Promise<GithubIntegrationResponseDto> {
    return this.integrations.connectWithToken(workspaceId, user, body, requestOrigin(request));
  }

  @Post('github/oauth')
  @RequireRole('ADMIN')
  @GithubOAuthDocs()
  oauth(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Body() body: GithubOAuthDto,
    @Req() request: { protocol?: string; headers: { host?: string } },
  ): Promise<GithubIntegrationResponseDto> {
    return this.integrations.connectWithOAuth(workspaceId, user, body, requestOrigin(request));
  }

  @Post('github/sync')
  @HttpCode(200)
  @RequireRole('ANALYST')
  @SyncGithubDocs()
  sync(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: RequestUser,
    @Req() request: { protocol?: string; headers: { host?: string } },
  ): Promise<GithubIntegrationResponseDto> {
    return this.integrations.requestSync(workspaceId, user, requestOrigin(request));
  }

  @Delete('github')
  @HttpCode(200)
  @RequireRole('ADMIN')
  @DisconnectGithubDocs()
  async disconnect(
    @Param('workspaceId') workspaceId: string,
    @CurrentUser() user: RequestUser,
  ): Promise<MessageResponseDto> {
    await this.integrations.disconnect(workspaceId, user);
    return { status: 'ok' };
  }
}

export function requestOrigin(request: { protocol?: string; headers: { host?: string; 'x-forwarded-proto'?: string } }): string | undefined {
  const host = request.headers.host;
  if (!host) {
    return undefined;
  }
  const proto = request.headers['x-forwarded-proto'] || request.protocol || 'http';
  return `${proto}://${host}`;
}
