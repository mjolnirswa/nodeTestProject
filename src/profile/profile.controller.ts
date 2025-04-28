import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { CurrentUser } from 'src/user/decorator/current-user.decorator';
import { UserResponseDto } from 'src/user/dto/user-responce.dto';
import { UserService } from 'src/user/user.service';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiOkResponse({ type: UserResponseDto, description: 'Информация о текущем пользователе' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized: Неверный или отсутствующий токен' })
  async getMyProfile(@CurrentUser() user: { userId: number }): Promise<UserResponseDto> {
    const foundedUser = await this.userService.findById(user.userId);

    return plainToInstance(UserResponseDto, foundedUser, { excludeExtraneousValues: true });
  }
}
