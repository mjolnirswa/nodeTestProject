import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { UserService } from './user.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { UserResponseDto } from './dto/user-responce.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CurrentUser } from './decorator/current-user.decorator';
import { TransferBalanceDto } from './dto/transfer-balance.dto';

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

  @UseGuards(JwtAuthGuard)
  @Post('transfer')
  @ApiBody({ type: TransferBalanceDto })
  @ApiOkResponse({ description: 'Перевод выполнен успешно' })
  @ApiBadRequestResponse({ description: 'Ошибка валидации или недостаточно средств' })
  async transfer(@CurrentUser() user: { id: number }, @Body() dto: TransferBalanceDto) {
    return this.userService.transferBalance(user.id, dto.toUserId, dto.amount);
  }

  @Patch(':id/add-balance')
  @HttpCode(204)
  @ApiOkResponse({ description: 'Баланс успешно пополнен' })
  @ApiBadRequestResponse({ description: 'Некорректная сумма' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: {
          type: 'number',
          example: 50.0,
          description: 'Сумма пополнения (в долларах)',
        },
      },
      required: ['amount'],
    },
  })
  @ApiParam({
    name: 'id',
    type: Number,
    description: 'ID пользователя, которому нужно пополнить баланс',
    example: 1,
  })
  async addBalance(
    @Param('id', ParseIntPipe) id: number,
    @Body('amount') amount: number,
  ): Promise<void> {
    return this.userService.addBalance(id, amount);
  }
}
