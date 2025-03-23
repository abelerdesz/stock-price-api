import { Controller, Get, Put, Param, NotFoundException } from '@nestjs/common';
import { StockService } from './stock.service';
import { StockPriceResponse } from './types/stock.types';
import { StockSymbolDto } from './dto/stock.dto';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('stocks')
@Controller('stock')
export class StockController {
  constructor(private readonly stockService: StockService) {}

  @ApiOperation({ summary: 'Get current stock price information' })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description:
      'Returns current stock price, moving average of last <=10 prices, and date of last publication',
    type: StockPriceResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Stock tracking has not been initialized with a PUT request.',
  })
  @Get(':symbol')
  async getStock(
    @Param()
    params: StockSymbolDto,
  ): Promise<StockPriceResponse> {
    return this.stockService.getStockAndPriceData(params.symbol);
  }

  @ApiOperation({ summary: 'Start tracking a stock' })
  @ApiParam({
    name: 'symbol',
    description: 'Stock symbol',
    type: 'string',
  })
  @ApiResponse({
    status: 200,
    description: 'Stock tracking started',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Started tracking stock NFLX',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Stock tracking already started',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Stock with symbol NFLX is already being tracked',
        },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Error starting price updates for NFLX',
        },
      },
    },
  })
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
