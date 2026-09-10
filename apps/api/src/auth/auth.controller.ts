import { Body, Controller, HttpCode, Inject, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { type RequestUser } from './auth.types';
import { AuthResponseDto, MessageResponseDto, TokenResponseDto } from './dto/auth-response.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LoginDocs, LogoutDocs, RefreshDocs, RegisterDocs } from './swagger/auth.swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @RegisterDocs()
  register(@Body() body: RegisterDto): Promise<AuthResponseDto> {
    return this.auth.register(body);
  }

  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @LoginDocs()
  login(@Body() body: LoginDto): Promise<AuthResponseDto> {
    return this.auth.login(body);
  }

  @Post('refresh')
  @HttpCode(200)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @RefreshDocs()
  refresh(@Body() body: RefreshDto): Promise<TokenResponseDto> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @LogoutDocs()
  async logout(@CurrentUser() user: RequestUser): Promise<MessageResponseDto> {
    await this.auth.logout(user);
    return { status: 'ok' };
  }
}
