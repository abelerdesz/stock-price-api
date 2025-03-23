import { IsNumber, IsNotEmpty, Min, IsOptional } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { FinnhubQuoteResponse } from '../types/finnhub.types';

export class ValidatedFinnhubQuoteDto {
  readonly accessedAt: Date = new Date();

  @IsNumber()
  @IsNotEmpty()
  c: number; // current price

  @IsOptional()
  @IsNumber()
  d: number | null; // change

  @IsOptional()
  @IsNumber()
  dp: number | null; // percent change

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
  t: number; // timestamp

  // Normalize values
  get currentPrice(): number {
    return Number(this.c.toFixed(2));
  }

  get change(): number | null {
    return this.d ? Number(this.d.toFixed(2)) : null;
  }

  get percentChange(): number | null {
    return this.dp ? Number(this.dp.toFixed(2)) : null;
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

  get publishedAt(): Date {
    return new Date(this.t * 1000); // Convert seconds to milliseconds
  }

  static fromApiResponse(data: FinnhubQuoteResponse): ValidatedFinnhubQuoteDto {
    return plainToInstance(ValidatedFinnhubQuoteDto, data);
  }
}
