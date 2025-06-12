import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { plainToInstance } from 'class-transformer';
import { UserService } from '../user/user.service';
import { UserResponseDto } from '../user/dto/user-responce.dto';
import { JwtAuthGuard } from '../auth/guard/jwt-auth.guard';
import { CurrentUser } from '../user/decorator/current-user.decorator';

@ApiTags('Profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my')
  @ApiOkResponse({ type: UserResponseDto, description: 'Информация о текущем пользователе' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized: Неверный или отсутствующий токен' })
  async getMyProfile(@CurrentUser() user: { id: number }): Promise<UserResponseDto> {
    const foundedUser = await this.userService.findById(user.id);

    return plainToInstance(UserResponseDto, foundedUser, { excludeExtraneousValues: true });
  }
}
