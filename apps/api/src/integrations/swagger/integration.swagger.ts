import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { MessageResponseDto } from '../../auth/dto/auth-response.dto';
import { messageResponseExample } from '../../auth/swagger/auth.schema';
import { ApiCreatedExample, ApiOkExample, ApiRequestExample } from '../../common/swagger/swagger-docs';
import {
  ConnectGithubDto,
  GithubAuthorizeResponseDto,
  GithubIntegrationResponseDto,
  GithubOAuthDto,
  ThreadDetailResponseDto,
  ThreadListResponseDto,
  WebhookAckDto,
} from '../dto/integration.dto';
import {
  connectGithubRequestExample,
  githubAuthorizeExample,
  githubIntegrationExample,
  threadListExample,
} from './integration.schema';

export const GetGithubIntegrationDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get the workspace GitHub connection' }),
    ApiOkExample(GithubIntegrationResponseDto, githubIntegrationExample, 'GitHub connection'),
  );

export const ConnectGithubDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Connect GitHub with a personal access token' }),
    ApiRequestExample(ConnectGithubDto, connectGithubRequestExample, 'GitHub token'),
    ApiCreatedExample(GithubIntegrationResponseDto, githubIntegrationExample, 'Connected GitHub'),
  );

export const GithubAuthorizeDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Start GitHub OAuth when a GitHub App/OAuth app is configured' }),
    ApiOkExample(GithubAuthorizeResponseDto, githubAuthorizeExample, 'Authorize URL'),
  );

export const GithubOAuthDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Finish GitHub OAuth' }),
    ApiRequestExample(GithubOAuthDto, { code: 'code', state: 'state' }, 'OAuth callback'),
    ApiOkExample(GithubIntegrationResponseDto, githubIntegrationExample, 'Connected GitHub'),
  );

export const SyncGithubDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Request an incremental GitHub issue/PR sync' }),
    ApiOkExample(GithubIntegrationResponseDto, githubIntegrationExample, 'Sync requested'),
  );

export const DisconnectGithubDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Disconnect GitHub' }),
    ApiOkExample(MessageResponseDto, messageResponseExample, 'Disconnected'),
  );

export const ListThreadsDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List indexed issues and pull requests' }),
    ApiOkExample(ThreadListResponseDto, threadListExample, 'Threads'),
  );

export const GetThreadDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get one indexed issue or pull request and its code links' }),
    ApiOkExample(ThreadDetailResponseDto, threadListExample.items[0], 'Thread'),
  );

export const GithubWebhookDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Receive a verified GitHub webhook' }),
    ApiOkExample(WebhookAckDto, { status: 'accepted' }, 'Webhook accepted'),
  );
