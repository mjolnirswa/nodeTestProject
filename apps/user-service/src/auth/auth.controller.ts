import { Body, Controller, Post, Res, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-responce.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { Public } from './decorators/public.decorator';
import { Response } from 'express';
import { CurrentUser } from '../user/decorator/current-user.decorator';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UserResponseDto } from '../user/dto/user-responce.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @ApiOkResponse({ type: UserResponseDto, description: 'Пользователь успешно зарегистрирован' })
  @ApiBadRequestResponse({ description: 'Ошибка валидации данных при регистрации' })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Public()
  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @ApiOkResponse({ type: LoginResponseDto, description: 'Успешная авторизация' })
  @ApiUnauthorizedResponse({ description: 'Неверные учетные данные' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ access_token: string }> {
    const { access_token, refresh_token } = await this.authService.login(loginDto);

    res.cookie('refreshToken', refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return { access_token };
  }

  @Public()
  @Post('refresh')
  @ApiBody({ type: RefreshTokenDto })
  @ApiOkResponse({ description: 'Обновление access и refresh токенов' })
  @ApiUnauthorizedResponse({ description: 'Неверный refresh токен' })
  async refresh(@Body('refresh_token') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @ApiOkResponse({ description: 'Выход из системы' })
  @ApiBearerAuth()
  async logout(@CurrentUser() user: { userId: number }) {
    return this.authService.logout(user.userId);
  }
}
