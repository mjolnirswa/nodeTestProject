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
import { InjectRepository } from '@nestjs/typeorm';
import { RefreshToken } from './entity/refresh-token.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
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
      this.logger.warn(`Логин ${loginDto.login} не найден`);
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

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 дней

    await this.refreshTokenRepository.save({
      token: refresh_token,
      user: { id: user.id },
      expiresAt,
    });

    this.logger.log('info', `🔐 Пользователь ${user.login} вошёл в систему`);

    return { access_token, refresh_token };
  }

  async refresh(refreshToken: string): Promise<LoginResponseDto> {
    this.logger.verbose(`♻️ Запрос на обновление токена`);

    try {
      await this.jwtService.verifyAsync(refreshToken);
    } catch {
      this.logger.warn(`Не удалось декодировать refresh токен`);
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenInDb = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!tokenInDb || tokenInDb.expiresAt < new Date()) {
      this.logger.warn(`Просроченный или несуществующий refresh токен`);
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = tokenInDb.user;

    const newPayload = { sub: user.id };

    const newAccessToken = await this.jwtService.signAsync(newPayload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION'),
    });

    const newRefreshToken = await this.jwtService.signAsync(newPayload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION'),
    });

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await this.refreshTokenRepository.save({
      token: newRefreshToken,
      user: { id: user.id },
      expiresAt,
    });

    await this.refreshTokenRepository.delete({ token: refreshToken });

    this.logger.log('info', `✅ Refresh токены обновлены для userId: ${user.id}`);

    return {
      access_token: newAccessToken,
      refresh_token: newRefreshToken,
    };
  }

  async logout(userId: number) {
    // Удаляем все refresh токены для этого пользователя
    await this.refreshTokenRepository.delete({ user: { id: userId } });

    this.logger.log('info', `🚪 Пользователь с ID ${userId} вышел из системы`);
  }
}
