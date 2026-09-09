import { applyDecorators, type Type } from '@nestjs/common';
import { ApiBody, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';

export function ApiRequestExample(
  type: Type<unknown>,
  value: Record<string, unknown>,
  summary = 'Example request',
) {
  return ApiBody({
    type,
    required: true,
    examples: {
      default: {
        summary,
        value,
      },
    },
  });
}

export function ApiOkExample(type: Type<unknown>, example: Record<string, unknown>, description?: string) {
  return applyDecorators(ApiOkResponse({ type, description, example }));
}

export function ApiCreatedExample(
  type: Type<unknown>,
  example: Record<string, unknown>,
  description?: string,
) {
  return applyDecorators(ApiCreatedResponse({ type, description, example }));
}
