import { Injectable } from '@nestjs/common';
import { InjectMetric } from '@willsoto/nestjs-prometheus';
import { Counter, Histogram } from 'prom-client';

@Injectable()
export class MetricsService {
  /* ---------- user metrics  ---------- */
  constructor(
    @InjectMetric('user_created_total')
    private readonly userCreated: Counter,
    @InjectMetric('user_create_duration_seconds')
    private readonly userCreateDur: Histogram,
    @InjectMetric('balance_transfer_total')
    private readonly transferTotal: Counter<'result'>,
    @InjectMetric('balance_transfer_duration_seconds')
    private readonly transferDur: Histogram,

    /* ---------- balance-reset metrics ---------- */
    @InjectMetric('balance_reset_enqueued_total')
    private readonly resetEnqueued: Counter,
    @InjectMetric('balance_reset_processed_total')
    private readonly resetProcessed: Counter<'result'>,
    @InjectMetric('balance_reset_duration_seconds')
    private readonly resetDur: Histogram,
  ) {}

  startUserCreateTimer() {
    return this.userCreateDur.startTimer();
  }
  incUserCreated() {
    this.userCreated.inc();
  }

  startTransferTimer() {
    return this.transferDur.startTimer();
  }
  incTransfer(result: 'success' | 'error') {
    this.transferTotal.inc({ result });
  }

  incResetEnqueued() {
    this.resetEnqueued.inc();
  }
  startResetTimer() {
    return this.resetDur.startTimer();
  }
  incResetProcessed(result: 'success' | 'error') {
    this.resetProcessed.inc({ result });
  }
}
