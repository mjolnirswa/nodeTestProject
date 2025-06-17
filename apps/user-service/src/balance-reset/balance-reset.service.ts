import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { MetricsService } from '../metrics/metrics.service';

@Injectable()
export class BalanceResetService {
  constructor(
    @InjectQueue('balance-reset') private readonly queue: Queue,
    private readonly metrics: MetricsService,
  ) {}

  async enqueueResetBalances(): Promise<void> {
    await this.queue.add('reset-balances', {});
    this.metrics.incResetEnqueued();
  }
}
