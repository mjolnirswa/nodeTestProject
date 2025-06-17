import { Controller, Patch, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiOkResponse } from '@nestjs/swagger';
import { BalanceResetService } from './balance-reset.service';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('Balance Reset')
@Controller('balance-reset')
export class BalanceResetController {
  constructor(private readonly balanceResetService: BalanceResetService) {}

  @Public()
  @Patch()
  @HttpCode(202)
  @ApiOperation({ summary: 'Асинхронно обнулить баланс всем пользователям' })
  @ApiOkResponse({ description: 'Задача добавлена в очередь' })
  async reset(): Promise<void> {
    await this.balanceResetService.enqueueResetBalances();
  }
}
