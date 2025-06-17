import { Module } from '@nestjs/common';
import { makeCounterProvider, makeHistogramProvider } from '@willsoto/nestjs-prometheus';
import { MetricsService } from './metrics.service';

const userMetrics = [
  makeCounterProvider({
    name: 'user_created_total',
    help: 'Total number of users created',
  }),
  makeHistogramProvider({
    name: 'user_create_duration_seconds',
    help: 'Duration of user registration in seconds',
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  }),
  makeCounterProvider({
    name: 'balance_transfer_total',
    help: 'Total balance-transfer attempts',
    labelNames: ['result'],
  }),
  makeHistogramProvider({
    name: 'balance_transfer_duration_seconds',
    help: 'Duration of balance transfers in seconds',
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  }),
];

const resetMetrics = [
  makeCounterProvider({
    name: 'balance_reset_enqueued_total',
    help: 'Total balance-reset jobs enqueued',
  }),
  makeCounterProvider({
    name: 'balance_reset_processed_total',
    help: 'Total balance-reset jobs processed',
    labelNames: ['result'],
  }),
  makeHistogramProvider({
    name: 'balance_reset_duration_seconds',
    help: 'Duration of balance-reset jobs in seconds',
    buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
  }),
];

const metricsProviders = [...userMetrics, ...resetMetrics];

@Module({
  providers: [MetricsService, ...metricsProviders],
  exports: [MetricsService, ...metricsProviders],
})
export class MetricsModule {}
