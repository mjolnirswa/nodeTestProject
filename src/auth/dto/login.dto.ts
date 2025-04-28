import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'mylogin', description: 'Логин пользователя' })
  @IsNotEmpty()
  @IsString()
  login: string;

  @ApiProperty({ example: 'strongPassword123', description: 'Пароль пользователя' })
  @IsNotEmpty()
  @IsString()
  password: string;
}
