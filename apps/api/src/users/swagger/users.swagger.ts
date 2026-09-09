import { applyDecorators } from '@nestjs/common';
import { ApiOperation } from '@nestjs/swagger';
import { UserResponseDto } from '../../auth/dto/auth-response.dto';
import { userResponseExample } from '../../auth/swagger/auth.schema';
import { ApiOkExample } from '../../common/swagger/swagger-docs';

export const CurrentUserDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Current authenticated user' }),
    ApiOkExample(UserResponseDto, userResponseExample, 'Current user'),
  );
