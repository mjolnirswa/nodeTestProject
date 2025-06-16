import { Module } from '@nestjs/common';
import { BalanceResetController } from './balance-reset.controller';
import { BalanceResetService } from './balance-reset.service';
import { BullModule } from '@nestjs/bull';
import { BalanceResetProcessor } from './balance-reset.processor';
import { UserModule } from '../user/user.module';
import { MetricsModule } from '../metrics/metrics.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'balance-reset' }), UserModule, MetricsModule],
  controllers: [BalanceResetController],
  providers: [BalanceResetService, BalanceResetProcessor],
})
export class BalanceResetModule {}
