import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiOkExample } from '../../common/swagger/swagger-docs';
import {
  EvidenceListResponseDto,
  EvidenceResolveResponseDto,
  EvolutionResponseDto,
} from '../dto/evidence.dto';
import {
  evidenceListResponseExample,
  evidenceResolveResponseExample,
  evolutionResponseExample,
} from './evidence.schema';

export const ListEvidenceDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List scored historical evidence for a file or symbol' }),
    ApiQuery({ name: 'fileId', required: false, type: String }),
    ApiQuery({ name: 'symbolId', required: false, type: String }),
    ApiOkExample(EvidenceListResponseDto, evidenceListResponseExample, 'Evidence list'),
  );

export const ResolveEvidenceDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Resolve what is known about a file or symbol as of a revision',
    }),
    ApiQuery({ name: 'fileId', required: false, type: String }),
    ApiQuery({ name: 'symbolId', required: false, type: String }),
    ApiQuery({ name: 'revision', required: false, type: String }),
    ApiOkExample(EvidenceResolveResponseDto, evidenceResolveResponseExample, 'Historical resolve'),
  );

export const GetEvolutionDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get an evolution timeline for a file or symbol' }),
    ApiQuery({ name: 'fileId', required: false, type: String }),
    ApiQuery({ name: 'symbolId', required: false, type: String }),
    ApiOkExample(EvolutionResponseDto, evolutionResponseExample, 'Evolution timeline'),
  );

export const GetSymbolHistoryDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get scored commit history for a symbol' }),
    ApiOkExample(EvolutionResponseDto, evolutionResponseExample, 'Symbol history'),
  );
