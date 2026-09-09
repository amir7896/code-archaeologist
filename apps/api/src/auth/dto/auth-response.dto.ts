import { ApiProperty } from '@nestjs/swagger';

export class UserResponseDto {
  @ApiProperty({ type: String, example: '7f1b2c3d-4e5f-6789-abcd-ef0123456789' })
  id!: string;

  @ApiProperty({ type: String, example: 'dev@example.com' })
  email!: string;

  @ApiProperty({ type: String, example: 'Ada Lovelace' })
  name!: string;

  @ApiProperty({ type: String, enum: ['ACTIVE', 'DISABLED'] })
  status!: string;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}

export class TokenResponseDto {
  @ApiProperty({ type: String })
  accessToken!: string;

  @ApiProperty({ type: String })
  refreshToken!: string;

  @ApiProperty({ type: String, example: 'Bearer' })
  tokenType!: 'Bearer';

  @ApiProperty({ type: Number, description: 'Access token lifetime in seconds', example: 900 })
  expiresIn!: number;
}

export class AuthResponseDto extends TokenResponseDto {
  @ApiProperty({ type: () => UserResponseDto })
  user!: UserResponseDto;
}

export class MessageResponseDto {
  @ApiProperty({ type: String, example: 'ok' })
  status!: string;
}
