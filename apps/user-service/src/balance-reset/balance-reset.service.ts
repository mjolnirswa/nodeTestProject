import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

@Injectable()
export class BalanceResetService {
  constructor(@InjectQueue('balance-reset') private readonly queue: Queue) {}

  async enqueueResetBalances(): Promise<void> {
    await this.queue.add('reset-balances', {});
  }
}
