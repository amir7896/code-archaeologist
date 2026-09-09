import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiOkExample } from '../../common/swagger/swagger-docs';
import { ImpactResponseDto } from '../dto/impact.dto';
import { impactResponseExample } from './impact.schema';

export const GetImpactDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'Get the deterministic blast radius for a file or symbol',
    }),
    ApiQuery({ name: 'fileId', required: false, type: String }),
    ApiQuery({ name: 'symbolId', required: false, type: String }),
    ApiQuery({ name: 'depth', required: false, type: Number, description: 'Walk depth from 1 to 6' }),
    ApiOkExample(ImpactResponseDto, impactResponseExample, 'Impact analysis'),
  );
