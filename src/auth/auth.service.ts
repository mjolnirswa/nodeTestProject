import { ConflictException, Injectable, UnauthorizedException, Inject } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from 'src/user/dto/user-responce.dto';
import { plainToInstance } from 'class-transformer';
import { LoginResponseDto } from './dto/login-responce.dto';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.verbose(`Регистрация пользователя с логином: ${createUserDto.login}`);

    const existingLogin = await this.userService.findByLogin(createUserDto.login);
    if (existingLogin) {
      this.logger.warn(`Регистрация провалена: логин ${createUserDto.login} уже занят`);
      throw new ConflictException('Пользователь с таким логином уже существует');
    }

    const existingEmail = await this.userService.findByEmail(createUserDto.email);
    if (existingEmail) {
      this.logger.warn(`Регистрация провалена: email ${createUserDto.email} уже занят`);
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const user = await this.userService.create(createUserDto);
    this.logger.log('info', `✅ Пользователь ${user.login} зарегистрирован (ID: ${user.id})`);

    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    this.logger.verbose(`Попытка входа для логина: ${loginDto.login}`);

    const user = await this.userService.findByLogin(loginDto.login);
    if (!user) {
      this.logger.warn(`Неудачная попытка входа: логин ${loginDto.login} не найден`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);
    if (!isPasswordValid) {
      this.logger.warn(`Неверный пароль для логина ${loginDto.login}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION'),
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION'),
    });

    await this.userService.updateRefreshToken(user.id, refresh_token);

    this.logger.log('info', `🔐 Пользователь ${user.login} вошёл в систему`);

    return { access_token, refresh_token };
  }

  async refresh(refreshToken: string): Promise<LoginResponseDto> {
    this.logger.verbose(`Запрос на обновление токена`);

    const payload = await this.jwtService.verifyAsync(refreshToken);
    const user = await this.userService.findById(payload.sub);

    if (!user || user.refreshToken !== refreshToken) {
      this.logger.warn(`Невалидный refresh токен для userId: ${payload.sub}`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const newPayload = { sub: user.id };

    const newAccessToken = await this.jwtService.signAsync(newPayload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION'),
    });

    const newRefreshToken = await this.jwtService.signAsync(newPayload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION'),
    });

    await this.userService.updateRefreshToken(user.id, newRefreshToken);

    this.logger.log('info', `♻️ Токены обновлены для userId: ${user.id}`);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: number) {
    await this.userService.updateRefreshToken(userId, null);
    this.logger.log('info', `🚪 Пользователь с ID ${userId} вышел из системы`);
  }
}
