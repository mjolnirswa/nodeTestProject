import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh токен', example: 'eyJhbGciOiJIUzI1NiIsInR...' })
  refresh_token: string;
}
