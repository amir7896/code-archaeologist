import { applyDecorators } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ApiCreatedExample, ApiOkExample, ApiRequestExample } from '../../common/swagger/swagger-docs';
import { AuthResponseDto, MessageResponseDto, TokenResponseDto } from '../dto/auth-response.dto';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { RegisterDto } from '../dto/register.dto';
import {
  authResponseExample,
  loginRequestExample,
  messageResponseExample,
  refreshRequestExample,
  registerRequestExample,
  tokenResponseExample,
} from './auth.schema';

export const RegisterDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Register with email and password and create a personal workspace' }),
    ApiRequestExample(RegisterDto, registerRequestExample, 'Register a new account'),
    ApiCreatedExample(AuthResponseDto, authResponseExample, 'Registered session'),
  );

export const LoginDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Login with email and password' }),
    ApiRequestExample(LoginDto, loginRequestExample, 'Sign in'),
    ApiOkExample(AuthResponseDto, authResponseExample, 'Authenticated session'),
  );

export const RefreshDocs = () =>
  applyDecorators(
    ApiOperation({ summary: 'Rotate refresh token and issue a new access token' }),
    ApiRequestExample(RefreshDto, refreshRequestExample, 'Refresh session'),
    ApiOkExample(TokenResponseDto, tokenResponseExample, 'New access token'),
  );

export const LogoutDocs = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Revoke the current refresh session' }),
    ApiOkExample(MessageResponseDto, messageResponseExample, 'Session revoked'),
  );
