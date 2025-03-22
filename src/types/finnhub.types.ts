export interface FinnhubQuoteResponse {
  c: number; // current price
  d: number; // change
  dp: number; // percent change
  h: number; // high price of the day
  l: number; // low price of the day
  o: number; // open price
  pc: number; // previous close price
  t: number; // timestamp
}

import { IsNumber, IsNotEmpty, Min } from 'class-validator';
import { Transform, plainToInstance } from 'class-transformer';

export class ValidatedFinnhubQuoteDto {
  @IsNumber()
  @IsNotEmpty()
  c: number; // current price

  @IsNumber()
  d: number; // change

  @IsNumber()
  dp: number; // percent change

  @IsNumber()
  @Min(0)
  h: number; // high price of the day

  @IsNumber()
  @Min(0)
  l: number; // low price of the day

  @IsNumber()
  @Min(0)
  o: number; // open price

  @IsNumber()
  @Min(0)
  pc: number; // previous close price

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => (typeof value === 'number' ? value : Number(value)))
  t: number; // timestamp

  // Normalize values
  get currentPrice(): number {
    return Number(this.c.toFixed(2));
  }

  get change(): number {
    return Number(this.d.toFixed(2));
  }

  get percentChange(): number {
    return Number(this.dp.toFixed(2));
  }

  get highPrice(): number {
    return Number(this.h.toFixed(2));
  }

  get lowPrice(): number {
    return Number(this.l.toFixed(2));
  }

  get openPrice(): number {
    return Number(this.o.toFixed(2));
  }

  get previousClosePrice(): number {
    return Number(this.pc.toFixed(2));
  }

  get timestamp(): Date {
    return new Date(this.t * 1000); // Convert seconds to milliseconds
  }

  static fromApiResponse(data: FinnhubQuoteResponse): ValidatedFinnhubQuoteDto {
    return plainToInstance(ValidatedFinnhubQuoteDto, data);
  }
}
