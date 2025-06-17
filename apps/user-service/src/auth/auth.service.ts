import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-responce.dto';
import { RefreshToken } from './entity/refresh-token.entity';
import { UserService } from '../user/user.service';
import { CreateUserDto } from '../user/dto/create-user.dto';
import { UserResponseDto } from '../user/dto/user-responce.dto';

import { PinoLogger } from 'nestjs-pino';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly logger: PinoLogger,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
  ) {
    this.logger.setContext(AuthService.name);
  }

  async register(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    this.logger.debug({ login: createUserDto.login }, 'attempting registration');

    if (await this.userService.findByLogin(createUserDto.login)) {
      this.logger.warn({ login: createUserDto.login }, 'login already taken');
      throw new ConflictException('Пользователь с таким логином уже существует');
    }

    if (await this.userService.findByEmail(createUserDto.email)) {
      this.logger.warn({ email: createUserDto.email }, 'email already taken');
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const user = await this.userService.create(createUserDto);
    this.logger.info({ id: user.id, login: user.login }, 'user registered');

    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    this.logger.debug({ login: loginDto.login }, 'login attempt');

    const user = await this.userService.findByLogin(loginDto.login);
    if (!user) {
      this.logger.warn({ login: loginDto.login }, 'login not found');
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!(await bcrypt.compare(loginDto.password, user.password))) {
      this.logger.warn({ login: loginDto.login }, 'wrong password');
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION'),
    });

    const refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION'),
    });

    await this.refreshTokenRepository.save({
      token: refresh_token,
      user: { id: user.id },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    this.logger.info({ id: user.id, login: user.login }, 'user logged in');

    return { access_token, refresh_token };
  }

  async refresh(refreshToken: string): Promise<LoginResponseDto> {
    this.logger.debug('refresh token request');

    try {
      await this.jwtService.verifyAsync(refreshToken);
    } catch {
      this.logger.warn('failed to decode refresh token');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const tokenInDb = await this.refreshTokenRepository.findOne({
      where: { token: refreshToken },
      relations: ['user'],
    });

    if (!tokenInDb || tokenInDb.expiresAt < new Date()) {
      this.logger.warn('refresh token invalid or expired');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = tokenInDb.user;
    const payload = { sub: user.id };

    const access_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_ACCESS_TOKEN_EXPIRATION'),
    });

    const new_refresh_token = await this.jwtService.signAsync(payload, {
      expiresIn: this.configService.get<string>('JWT_REFRESH_TOKEN_EXPIRATION'),
    });

    await this.refreshTokenRepository.save({
      token: new_refresh_token,
      user: { id: user.id },
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await this.refreshTokenRepository.delete({ token: refreshToken });

    this.logger.info({ id: user.id }, 'refresh tokens rotated');

    return { access_token, refresh_token: new_refresh_token };
  }

  async logout(userId: number) {
    await this.refreshTokenRepository.delete({ user: { id: userId } });
    this.logger.info({ id: userId }, 'user logged out');
  }

  async verifyAccessToken(token: string): Promise<{ sub: number }> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('JWT_SECRET'),
      });
    } catch (e) {
      this.logger.warn({ err: e }, 'invalid access token');
      throw new UnauthorizedException('Invalid access token');
    }
  }
}
