import { Controller, Get, Param } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockMovingAverageResponse } from './types/stock.types';
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get(':symbol')
  async getSymbol(
    @Param('symbol') symbol: string,
  ): Promise<StockMovingAverageResponse> {
    const stock = await this.stockService.getOrCreateStock(symbol);
    return {
      price: stock.price,
      updatedAt: stock.updatedAt,
      movingAverage: stock.movingAverage,
    };
  }
}
