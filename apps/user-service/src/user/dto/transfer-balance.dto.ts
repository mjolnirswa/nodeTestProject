import { ApiProperty } from '@nestjs/swagger';

export class TransferBalanceDto {
  @ApiProperty({ example: 2 })
  toUserId: number;

  @ApiProperty({ example: 20.51 })
  amount: number;
}
