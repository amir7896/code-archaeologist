import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { ApiOkExample } from '../../common/swagger/swagger-docs';
import {
  SourceFileListResponseDto,
  SourceFileResponseDto,
  SourcePreviewResponseDto,
  SymbolDetailResponseDto,
  SymbolListResponseDto,
} from '../dto/source.dto';
import {
  sourceFileListResponseExample,
  sourceFileResponseExample,
  sourcePreviewResponseExample,
  symbolDetailResponseExample,
  symbolListResponseExample,
} from './source.schema';

export const ListFilesDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List indexed source files' }),
    ApiOkExample(SourceFileListResponseDto, sourceFileListResponseExample, 'File list'),
  );

export const GetFileDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a source file' }),
    ApiOkExample(SourceFileResponseDto, sourceFileResponseExample, 'File'),
  );

export const PreviewFileDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a source preview' }),
    ApiOkExample(SourcePreviewResponseDto, sourcePreviewResponseExample, 'File preview'),
  );

export const ListSymbolsDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'List indexed symbols' }),
    ApiOkExample(SymbolListResponseDto, symbolListResponseExample, 'Symbol list'),
  );

export const GetSymbolDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Get a symbol and its relations' }),
    ApiOkExample(SymbolDetailResponseDto, symbolDetailResponseExample, 'Symbol'),
  );
