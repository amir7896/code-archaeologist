import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { MessageResponseDto } from '../../auth/dto/auth-response.dto';
import { messageResponseExample } from '../../auth/swagger/auth.schema';
import { ApiCreatedExample, ApiOkExample, ApiRequestExample } from '../../common/swagger/swagger-docs';
import {
  CreateRepositoryDto,
  RepositoryListResponseDto,
  RepositoryResponseDto,
  RepositoryStatusResponseDto,
  SyncRepositoryDto,
  UpdateRepositoryDto,
} from '../dto/repository.dto';
import {
  createRepositoryRequestExample,
  repositoryListResponseExample,
  repositoryResponseExample,
  syncRepositoryRequestExample,
  updateRepositoryRequestExample,
} from './repository.schema';

export const ListRepositoriesDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List repositories in a workspace' }),
    ApiOkExample(RepositoryListResponseDto, repositoryListResponseExample, 'Repository list'),
  );

export const CreateRepositoryDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Add a Git repository and start ingestion' }),
    ApiRequestExample(CreateRepositoryDto, createRepositoryRequestExample, 'Add a repository'),
    ApiCreatedExample(RepositoryResponseDto, repositoryResponseExample, 'Created repository'),
  );

export const GetRepositoryDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a repository' }),
    ApiOkExample(RepositoryResponseDto, repositoryResponseExample, 'Repository'),
  );

export const GetRepositoryStatusDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get repository ingestion status and latest run' }),
    ApiOkExample(RepositoryStatusResponseDto, repositoryResponseExample, 'Ingestion status'),
  );

export const UpdateRepositoryDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Update repository name, branch, or credentials' }),
    ApiRequestExample(UpdateRepositoryDto, updateRepositoryRequestExample, 'Update a repository'),
    ApiOkExample(RepositoryResponseDto, repositoryResponseExample, 'Updated repository'),
  );

export const DeleteRepositoryDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Remove a repository' }),
    ApiOkExample(MessageResponseDto, messageResponseExample, 'Repository removed'),
  );

export const SyncRepositoryDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Re-sync a repository' }),
    ApiRequestExample(SyncRepositoryDto, syncRepositoryRequestExample, 'Sync a revision'),
    ApiOkExample(RepositoryResponseDto, repositoryResponseExample, 'Sync started'),
  );
