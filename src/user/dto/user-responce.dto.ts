import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class UserResponseDto {
  @ApiProperty({ example: 1, description: 'ID пользователя' })
  @Expose()
  id: number;

  @ApiProperty({ example: 'mylogin', description: 'Логин пользователя' })
  @Expose()
  login: string;

  @ApiProperty({ example: 'user@example.com', description: 'Email пользователя' })
  @Expose()
  email: string;

  @ApiProperty({ example: 25, description: 'Возраст пользователя' })
  @Expose()
  age: number;

  @ApiProperty({ example: 'Люблю пить гинес', description: 'Описание пользователя' })
  @Expose()
  description: string;
}
