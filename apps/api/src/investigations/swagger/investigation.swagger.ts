import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiCreatedExample, ApiOkExample } from '../../common/swagger/swagger-docs';
import {
  AiStatusResponseDto,
  InvestigationListResponseDto,
  InvestigationResponseDto,
} from '../dto/investigation.dto';
import {
  aiStatusExample,
  investigationListResponseExample,
  investigationResponseExample,
} from './investigation.schema';

export const CreateInvestigationDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Ask a question about a repository using indexed evidence' }),
    ApiCreatedExample(InvestigationResponseDto, investigationResponseExample, 'Investigation'),
  );

export const ListInvestigationsDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List questions asked about a repository' }),
    ApiOkExample(InvestigationListResponseDto, investigationListResponseExample, 'Investigations'),
  );

export const GetInvestigationDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get an investigation with messages and citations' }),
    ApiOkExample(InvestigationResponseDto, investigationResponseExample, 'Investigation'),
  );

export const ListInvestigationMessagesDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List investigation messages' }),
    ApiOkExample(InvestigationResponseDto, investigationResponseExample, 'Investigation messages'),
  );

export const ListInvestigationEvidenceDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List investigation citations' }),
    ApiOkExample(InvestigationResponseDto, investigationResponseExample, 'Investigation evidence'),
  );

export const GetAiStatusDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Check whether the local model is reachable' }),
    ApiOkExample(AiStatusResponseDto, aiStatusExample, 'AI status'),
  );
