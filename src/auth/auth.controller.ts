import { Body, Controller, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { UserResponseDto } from 'src/user/dto/user-responce.dto';
import { LoginResponseDto } from './dto/login-responce.dto';
import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @ApiOkResponse({ type: UserResponseDto, description: 'Пользователь успешно зарегистрирован' })
  @ApiBadRequestResponse({ description: 'Ошибка валидации данных при регистрации' })
  async register(@Body() createUserDto: CreateUserDto) {
    return this.authService.register(createUserDto);
  }

  @Post('login')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  @ApiOkResponse({ type: LoginResponseDto, description: 'Успешная авторизация' })
  @ApiUnauthorizedResponse({ description: 'Неверные учетные данные' })
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

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
