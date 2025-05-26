import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';

export class AvatarPreviewDto {
  @ApiProperty({ example: 123, description: 'ID аватара' })
  @Expose()
  id: number;

  @ApiProperty({ example: 'a8fa23d7.png', description: 'Имя файла аватара' })
  @Expose()
  filename: string;
}
