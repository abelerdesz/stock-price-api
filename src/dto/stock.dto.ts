import { IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class StockSymbolDto {
  @ApiProperty({
    description: 'Stock symbol',
    example: 'NFLX',
    pattern: '^[A-Z]{1,5}$',
  })
  @IsString()
  @Matches(/^[A-Z]{1,5}$/, {
    message: 'Symbol must be 1-5 uppercase letters',
  })
  symbol: string;
}
