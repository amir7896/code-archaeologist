import { ApiProperty } from '@nestjs/swagger';
import {
  EXAMPLE_DATE,
  EXAMPLE_REPOSITORY_ID,
  EXAMPLE_RUN_ID,
  EXAMPLE_TASK_ID,
  EXAMPLE_WORKSPACE_ID,
} from '../../common/swagger/example-ids';
import { paginationExample } from '../../workspaces/swagger/workspace.schema';

export const createRepositoryRequestExample = {
  url: 'https://github.com/amir7896/fastapi-nexus.git',
  name: 'Nexus Backend',
  defaultBranch: 'main',
  credential: {
    type: 'HTTPS_TOKEN',
    secret: 'ghp_example_access_token',
  },
};

export const updateRepositoryRequestExample = {
  name: 'Nexus Backend',
  defaultBranch: 'main',
  credential: {
    type: 'HTTPS_TOKEN',
    secret: 'ghp_replacement_access_token',
  },
};

export const syncRepositoryRequestExample = {
  revision: 'main',
};

export const analysisRunExample = {
  id: EXAMPLE_RUN_ID,
  revision: '20a7150c8f3b9d4e6a1f2c3d4e5f6789abcd0123',
  type: 'INGESTION',
  status: 'SUCCEEDED',
  progress: 100,
  error: null,
  createdAt: EXAMPLE_DATE,
  tasks: [
    {
      id: EXAMPLE_TASK_ID,
      taskType: 'PARSE_AST',
      status: 'SUCCEEDED',
      attempts: 1,
      error: null,
    },
  ],
};

export const repositoryResponseExample = {
  id: EXAMPLE_REPOSITORY_ID,
  workspaceId: EXAMPLE_WORKSPACE_ID,
  name: 'Nexus Backend',
  url: 'https://github.com/amir7896/fastapi-nexus.git',
  provider: 'GITHUB',
  defaultBranch: 'main',
  currentRevision: '20a7150',
  lastIndexedRevision: '20a7150',
  commitCount: 42,
  branchCount: 3,
  fileCount: 232,
  symbolCount: 180,
  lastParsedRevision: '20a7150',
  lastGraphRevision: '20a7150',
  lastDnaRevision: '20a7150',
  lastEvidenceRevision: '20a7150',
  status: 'READY',
  hasCredential: true,
  lastError: null,
  lastSyncedAt: EXAMPLE_DATE,
  createdAt: EXAMPLE_DATE,
  updatedAt: EXAMPLE_DATE,
  latestRun: analysisRunExample,
};

export const repositoryListResponseExample = {
  items: [repositoryResponseExample],
  pagination: paginationExample,
};

export class RepositorySchema {
  @ApiProperty({ type: String, example: EXAMPLE_REPOSITORY_ID })
  id!: string;

  @ApiProperty({ type: String, example: 'Nexus Backend' })
  name!: string;

  @ApiProperty({ type: String, example: 'https://github.com/amir7896/fastapi-nexus.git' })
  url!: string;

  @ApiProperty({ type: String, example: 'READY' })
  status!: string;
}
