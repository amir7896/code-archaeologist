import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ApiOkExample } from '../../common/swagger/swagger-docs';
import { GraphCyclesResponseDto, GraphMapResponseDto, GraphNeighborsResponseDto } from '../dto/graph.dto';
import {
  graphCyclesResponseExample,
  graphMapResponseExample,
  graphNeighborsResponseExample,
} from './graph.schema';

export const GetGraphMapDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get the repository architecture map' }),
    ApiOkExample(GraphMapResponseDto, graphMapResponseExample, 'Architecture map'),
  );

const GraphWalkQueryDocs = () =>
  applyDecorators(
    ApiQuery({ name: 'fileId', required: true, type: String, description: 'Indexed file id' }),
    ApiQuery({ name: 'depth', required: false, type: Number, description: 'Walk depth from 1 to 6' }),
  );

export const GetGraphDependenciesDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List files this file depends on' }),
    GraphWalkQueryDocs(),
    ApiOkExample(GraphNeighborsResponseDto, graphNeighborsResponseExample, 'Dependencies'),
  );

export const GetGraphDependentsDocs = () =>
  applyDecorators(
    ApiOperation({
      summary: 'List files that depend on this file',
    }),
    GraphWalkQueryDocs(),
    ApiOkExample(
      GraphNeighborsResponseDto,
      { ...graphNeighborsResponseExample, direction: 'dependents' },
      'Dependents',
    ),
  );

export const GetGraphCyclesDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List dependency cycles' }),
    ApiOkExample(GraphCyclesResponseDto, graphCyclesResponseExample, 'Cycles'),
  );
