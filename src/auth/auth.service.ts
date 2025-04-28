import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from 'src/user/dto/create-user.dto';
import { UserService } from 'src/user/user.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { UserResponseDto } from 'src/user/dto/user-responce.dto';
import { plainToInstance } from 'class-transformer';
import { LoginResponseDto } from './dto/login-responce.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(createUserDto: CreateUserDto): Promise<UserResponseDto> {
    const existingLogin = await this.userService.findByLogin(createUserDto.login);

    if (existingLogin) {
      throw new ConflictException('Пользователь с таким логином уже существует');
    }

    const existingEmail = await this.userService.findByEmail(createUserDto.email);

    if (existingEmail) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const user = await this.userService.create(createUserDto);

    return plainToInstance(UserResponseDto, user, { excludeExtraneousValues: true });
  }

  async login(loginDto: LoginDto): Promise<LoginResponseDto> {
    const user = await this.userService.findByLogin(loginDto.login);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
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

    return { access_token, refresh_token };
  }

  async refresh(refreshToken: string): Promise<LoginResponseDto> {
    const payload = await this.jwtService.verifyAsync(refreshToken);

    const user = await this.userService.findById(payload.sub);

    if (!user || user.refreshToken !== refreshToken) {
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

    return { access_token: newAccessToken, refresh_token: newRefreshToken };
  }

  async logout(userId: number) {
    await this.userService.updateRefreshToken(userId, null);
  }
}
