import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { UserService } from './user.service';
import { ApiBearerAuth, ApiBody, ApiOkResponse, ApiQuery, ApiTags } from '@nestjs/swagger';
import { UserResponseDto } from './dto/user-responce.dto';
import { plainToInstance } from 'class-transformer';
import { UpdateUserDto } from './dto/update-user.dto';

@ApiTags('User')
@UseGuards(JwtAuthGuard)
@Controller('user')
@ApiBearerAuth()
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Номер страницы' })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 10,
    description: 'Количество элементов на страницу',
  })
  @ApiQuery({ name: 'search', required: false, example: 'john', description: 'Поиск по логину' })
  @ApiOkResponse({ type: [UserResponseDto], description: 'Список пользователей' })
  async getAllUsers(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('search') search?: string,
  ): Promise<UserResponseDto[]> {
    return this.userService.getAllUsers(page, limit, search);
  }

  @Patch(':id')
  @ApiBody({ type: UpdateUserDto })
  @ApiOkResponse({ type: UserResponseDto, description: 'Пользователь успешно обновлён' })
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return await this.userService.updateUser(id, updateUserDto);
  }

  @Delete(':id')
  @ApiOkResponse({ description: 'Пользователь успешно удалён' })
  async deleteUser(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.userService.deleteUser(id);
  }
}
