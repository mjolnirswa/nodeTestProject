import { Module } from '@nestjs/common';
import { BalanceResetController } from './balance-reset.controller';
import { BalanceResetService } from './balance-reset.service';
import { BullModule } from '@nestjs/bull';
import { BalanceResetProcessor } from './balance-reset.processor';
import { UserModule } from '../user/user.module';
import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';

const metricsProviders = [
  /* сколько заданий отправили в очередь */
  makeCounterProvider({
    name: 'balance_reset_enqueued_total',
    help: 'Total balance-reset jobs enqueued',
  }),

  /* сколько заданий реально обработано (success | error) */
  makeCounterProvider({
    name: 'balance_reset_processed_total',
    help: 'Total balance-reset jobs processed',
    labelNames: ['result'],
  }),

  /* длительность обработки задания */
  makeHistogramProvider({
    name: 'balance_reset_duration_seconds',
    help: 'Duration of balance-reset jobs in seconds',
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  }),
];

@Module({
  imports: [BullModule.registerQueue({ name: 'balance-reset' }), UserModule],
  controllers: [BalanceResetController],
  providers: [BalanceResetService, BalanceResetProcessor, ...metricsProviders],
})
export class BalanceResetModule {}
