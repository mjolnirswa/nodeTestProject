import { Module } from '@nestjs/common';
import { BalanceResetController } from './balance-reset.controller';
import { BalanceResetService } from './balance-reset.service';
import { BullModule } from '@nestjs/bull';
import { UserModule } from 'src/user/user.module';
import { BalanceResetProcessor } from './balance-reset.processor';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'balance-reset',
    }),
    UserModule,
  ],
  controllers: [BalanceResetController],
  providers: [BalanceResetService, BalanceResetProcessor],
})
export class BalanceResetModule {}
