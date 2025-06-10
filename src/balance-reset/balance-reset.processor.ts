import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { UserService } from 'src/user/user.service';
import { Inject } from '@nestjs/common';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import { Logger } from 'winston';

@Processor('balance-reset')
export class BalanceResetProcessor {
  constructor(
    private readonly userService: UserService,
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: Logger,
  ) {}

  @Process('reset-balances')
  async handleResetBalances(job: Job) {
    this.logger.log('info', `👷 Запущена задача #${job.id} на обнуление балансов`);

    try {
      const users = await this.userService.getAllWithBalance();
      this.logger.debug(`Найдено ${users.length} пользователей с ненулевым балансом`);

      for (const user of users) {
        user.balance = 0;
      }

      await this.userService.saveMany(users);
      this.logger.log('info', `✅ Обнулено: ${users.length} пользователей`);
    } catch (error) {
      this.logger.error('❌ Ошибка при выполнении задачи reset-balances', {
        jobId: job.id,
        stack: error.stack,
        message: error.message,
      });
    }
  }
}
