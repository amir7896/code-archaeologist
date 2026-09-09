import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUserDocs } from './swagger/users.swagger';
import { AuthService } from '../auth/auth.service';
import { type RequestUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserResponseDto } from '../auth/dto/auth-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class UsersController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Get('me')
  @CurrentUserDocs()
  me(@CurrentUser() user: RequestUser): Promise<UserResponseDto> {
    return this.auth.me(user);
  }
}
