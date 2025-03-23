import { Controller, Get, Put, Param, NotFoundException } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockMovingAverageResponse } from './types/stock.types';
import { StockSymbolDto } from './dto/stock.dto';

@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @Get(':symbol')
  async getStock(
    @Param()
    params: StockSymbolDto,
  ): Promise<StockMovingAverageResponse> {
    return this.stockService.getStockAndPriceData(params.symbol);
  }

  @Put(':symbol')
  async startStockUpdates(
    @Param()
    params: StockSymbolDto,
  ): Promise<{ message: string }> {
    await this.stockService.createStockAndStartPriceUpdates(params.symbol);

    return {
      message: `Started tracking stock ${params.symbol}`,
    };
  }
}
