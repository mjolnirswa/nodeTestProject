import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter } from 'prom-client';

@Injectable()
export class BalanceResetService {
  constructor(
    @InjectQueue('balance-reset') private readonly queue: Queue,

    @InjectMetric('balance_reset_enqueued_total')
    private readonly enqueuedTotal: Counter,
  ) {}

  async enqueueResetBalances(): Promise<void> {
    await this.queue.add('reset-balances', {});
    this.enqueuedTotal.inc();
  }
}
