import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PinoLogger } from 'nestjs-pino';
import { UserService } from '../user/user.service';

@Processor('balance-reset')
export class BalanceResetProcessor {
  constructor(
    private readonly userService: UserService,
    private readonly logger: PinoLogger,
  ) {
    this.logger.setContext(BalanceResetProcessor.name);
  }

  @Process('reset-balances')
  async handleResetBalances(job: Job) {
    this.logger.info({ jobId: job.id }, 'balance-reset job started');

    try {
      const users = await this.userService.getAllWithBalance();
      this.logger.debug({ count: users.length }, 'users with non-zero balance found');

      for (const user of users) {
        user.balance = 0;
      }

      await this.userService.saveMany(users);
      this.logger.info({ updated: users.length }, 'balances reset successfully');
    } catch (error) {
      this.logger.error({ jobId: job.id, err: error }, 'error executing balance-reset job');
    }
  }
}
