import { IsString, Matches } from 'class-validator';

export class StockSymbolDto {
  @IsString()
  @Matches(/^[A-Z]{1,5}$/, {
    message: 'Symbol must be 1-5 uppercase letters',
  })
  symbol: string;
}
