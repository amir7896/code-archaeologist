import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ type: String, example: 'rt_example_refresh_token_value_16' })
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}
