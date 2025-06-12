import { ApiProperty } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { AvatarPreviewDto } from 'src/avatar/dto/avatar-preview.dto';

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
  age: string;

  @ApiProperty({ example: 'Люблю пить гинес', description: 'Описание пользователя' })
  @Expose()
  description: string;

  @Expose()
  @Type(() => AvatarPreviewDto)
  avatars: AvatarPreviewDto[];

  @ApiProperty({ example: 100.5, description: 'Баланс пользователя в долларах' })
  @Expose()
  balance: number;
}
