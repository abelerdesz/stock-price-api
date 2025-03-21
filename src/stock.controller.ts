import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockMovingAverageResponse } from './types/stock.types';
import { StockSymbolDto } from './dto/stock.dto';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get(':symbol')
  async getSymbol(
    @Param()
    params: StockSymbolDto,
  ): Promise<StockMovingAverageResponse> {
    const stock = await this.stockService.getOrCreateStock(params.symbol);

    if (!stock) {
      throw new NotFoundException(
        `Stock with symbol ${params.symbol} not found`,
      );
    }

    return {
      price: stock.price,
      updatedAt: stock.updatedAt,
      movingAverage: stock.movingAverage,
    };
  }
}
