import { Controller, Get, Put, Param, NotFoundException } from '@nestjs/common';
import { StockService } from './stock.service';
import { CronService } from './cron.service';
import { StockMovingAverageResponse } from './types/stock.types';
import { StockSymbolDto } from './dto/stock.dto';

@Controller('stock')
export class StockController {
  constructor(
    private readonly stockService: StockService,
    private readonly cronService: CronService,
  ) {}

  @Get(':symbol')
  async getSymbol(
    @Param()
    params: StockSymbolDto,
  ): Promise<StockMovingAverageResponse> {
    return this.stockService.getStockWithPriceData(params.symbol);
  }

  @Put(':symbol')
  async startStockTracking(
    @Param()
    params: StockSymbolDto,
  ): Promise<{ message: string }> {
    const stock = await this.stockService.getOrCreateStock(params.symbol);

    this.cronService.startStockPriceUpdates(params.symbol);

    return {
      message: `Started tracking stock ${params.symbol}`,
    };
  }
}
