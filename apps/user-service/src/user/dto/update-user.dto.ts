import { IsEmail, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Новый логин пользователя' })
  @IsOptional()
  @IsString()
  login?: string;

  @ApiPropertyOptional({ description: 'Новый email пользователя' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ description: 'Новый пароль пользователя' })
  @IsOptional()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ description: 'Новый возраст пользователя' })
  @IsOptional()
  @IsInt()
  @Min(0)
  age?: number;

  @ApiPropertyOptional({ description: 'Новое описание пользователя' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}
