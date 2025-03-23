import { ApiProperty } from '@nestjs/swagger';

export class StockPriceResponse {
  @ApiProperty({ example: 150.25, description: 'Current stock price' })
  price: number;

  @ApiProperty({
    example: 149.75,
    description: 'Moving average price (last <=10 known prices)',
  })
  movingAverage: number;

  @ApiProperty({
    example: '2023-05-17T15:30:00Z',
    description: 'Last price publication timestamp',
  })
  updatedAt: Date;
}

export interface StockPriceData {
  price: number;
  publishedAt: Date;
  accessedAt: Date;
}
