import { ApiProperty } from '@nestjs/swagger';
import { EXAMPLE_DATE, EXAMPLE_USER_ID } from '../../common/swagger/example-ids';

export const registerRequestExample = {
  email: 'dev@example.com',
  password: 'password123',
  name: 'Ada Lovelace',
};

export const loginRequestExample = {
  email: 'dev@example.com',
  password: 'password123',
};

export const refreshRequestExample = {
  refreshToken: 'rt_example_refresh_token_value_16',
};

export const userResponseExample = {
  id: EXAMPLE_USER_ID,
  email: 'dev@example.com',
  name: 'Ada Lovelace',
  status: 'ACTIVE',
  createdAt: EXAMPLE_DATE,
};

export const tokenResponseExample = {
  accessToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.example',
  refreshToken: 'rt_example_refresh_token_value_16',
  tokenType: 'Bearer',
  expiresIn: 900,
};

export const authResponseExample = {
  ...tokenResponseExample,
  user: userResponseExample,
};

export const messageResponseExample = {
  status: 'ok',
};

export class AuthUserSchema {
  @ApiProperty({ type: String, example: EXAMPLE_USER_ID })
  id!: string;

  @ApiProperty({ type: String, example: 'dev@example.com' })
  email!: string;

  @ApiProperty({ type: String, example: 'Ada Lovelace' })
  name!: string;

  @ApiProperty({ type: String, enum: ['ACTIVE', 'DISABLED'], example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ type: String, format: 'date-time', example: EXAMPLE_DATE })
  createdAt!: string;
}

export class AuthTokenSchema {
  @ApiProperty({ type: String, example: tokenResponseExample.accessToken })
  accessToken!: string;

  @ApiProperty({ type: String, example: tokenResponseExample.refreshToken })
  refreshToken!: string;

  @ApiProperty({ type: String, example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ type: Number, example: 900 })
  expiresIn!: number;
}

export class AuthSessionSchema extends AuthTokenSchema {
  @ApiProperty({ type: () => AuthUserSchema, example: userResponseExample })
  user!: AuthUserSchema;
}

export class MessageSchema {
  @ApiProperty({ type: String, example: 'ok' })
  status!: string;
}
