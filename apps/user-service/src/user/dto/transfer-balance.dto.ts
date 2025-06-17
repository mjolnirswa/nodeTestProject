import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsPositive, Min } from 'class-validator';

export class TransferBalanceDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Type(() => Number)
  @Min(1)
  toUserId: number;

  @ApiProperty({ example: 20.51 })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Type(() => Number)
  @IsPositive()
  amount: number;
}
