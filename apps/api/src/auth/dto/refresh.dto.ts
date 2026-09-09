import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ type: String })
  @IsString()
  @MinLength(16)
  refreshToken!: string;
}
