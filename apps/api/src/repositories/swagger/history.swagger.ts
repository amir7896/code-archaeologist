import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiOkExample } from '../../common/swagger/swagger-docs';
import {
  BranchListResponseDto,
  CommitDetailResponseDto,
  CommitListResponseDto,
  FileHistoryResponseDto,
} from '../dto/history.dto';
import {
  branchListResponseExample,
  commitDetailResponseExample,
  commitListResponseExample,
  fileHistoryResponseExample,
} from './history.schema';

export const ListBranchesDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List indexed branches' }),
    ApiOkExample(BranchListResponseDto, branchListResponseExample, 'Branch list'),
  );

export const ListCommitsDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List indexed commits' }),
    ApiOkExample(CommitListResponseDto, commitListResponseExample, 'Commit list'),
  );

export const GetCommitDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a commit and its changed files' }),
    ApiOkExample(CommitDetailResponseDto, commitDetailResponseExample, 'Commit'),
  );

export const FileHistoryDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get history for a file path' }),
    ApiOkExample(FileHistoryResponseDto, fileHistoryResponseExample, 'File history'),
  );
