import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsInt, IsNotEmpty, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'newuser', description: 'Логин нового пользователя' })
  @IsNotEmpty()
  @IsString()
  login: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email нового пользователя' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'securePassword', description: 'Пароль нового пользователя' })
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: 25, description: 'Возраст пользователя' })
  @IsInt()
  @Min(0)
  @IsNotEmpty()
  age: string;

  @ApiProperty({ example: 'I love coding', description: 'Описание пользователя, до 1000 символов' })
  @IsString()
  @MaxLength(1000)
  @IsNotEmpty()
  description: string;
}
