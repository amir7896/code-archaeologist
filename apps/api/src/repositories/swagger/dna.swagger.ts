import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiOkExample } from '../../common/swagger/swagger-docs';
import { DnaHealthResponseDto, DnaProfileResponseDto, InsightListResponseDto } from '../dto/dna.dto';
import {
  dnaHealthResponseExample,
  dnaProfileResponseExample,
  insightListResponseExample,
} from './dna.schema';

export const GetDnaProfileDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a Code DNA profile for a file, symbol, or folder' }),
    ApiQuery({ name: 'fileId', required: false, type: String }),
    ApiQuery({ name: 'symbolId', required: false, type: String }),
    ApiQuery({ name: 'module', required: false, type: String }),
    ApiOkExample(DnaProfileResponseDto, dnaProfileResponseExample, 'Code DNA profile'),
  );

export const ListHotspotsDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List hotspot files by churn, complexity, and consumers' }),
    ApiOkExample(InsightListResponseDto, insightListResponseExample, 'Hotspots'),
  );

export const ListRisksDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List file risk scores' }),
    ApiQuery({ name: 'level', required: false, type: String }),
    ApiOkExample(InsightListResponseDto, insightListResponseExample, 'Risks'),
  );

export const GetDnaHealthDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get repository risk summary' }),
    ApiOkExample(DnaHealthResponseDto, dnaHealthResponseExample, 'Health'),
  );
