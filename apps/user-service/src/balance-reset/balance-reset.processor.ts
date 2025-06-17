import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { PinoLogger } from 'nestjs-pino';
import { UserService } from '../user/user.service';
import { Counter, Histogram } from 'prom-client';
import { InjectMetric } from '@willsoto/nestjs-prometheus';

@Processor('balance-reset')
export class BalanceResetProcessor {
  constructor(
    private readonly userService: UserService,
    private readonly logger: PinoLogger,

    @InjectMetric('balance_reset_processed_total')
    private readonly processedTotal: Counter<'result'>,

    @InjectMetric('balance_reset_duration_seconds')
    private readonly durationHist: Histogram,
  ) {
    this.logger.setContext(BalanceResetProcessor.name);
  }

  @Process('reset-balances')
  async handleResetBalances(job: Job) {
    const stop = this.durationHist.startTimer();

    try {
      this.logger.info({ jobId: job.id }, 'balance-reset job started');

      const users = await this.userService.getAllWithBalance();
      for (const user of users) user.balance = 0;
      await this.userService.saveMany(users);

      this.processedTotal.inc({ result: 'success' });
      this.logger.info({ updated: users.length }, 'balances reset');
    } catch (err) {
      this.processedTotal.inc({ result: 'error' });
      this.logger.error({ err, jobId: job.id }, 'balance-reset failed');
      throw err;
    } finally {
      stop();
    }
  }
}
