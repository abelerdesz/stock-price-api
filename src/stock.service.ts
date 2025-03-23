import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StockPriceResponse } from './types/stock.types';
import { CronService } from './cron.service';
import { FinnhubService } from './finnhub.service';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cronService: CronService,
    private readonly finnhubService: FinnhubService,
  ) {}

  async getStockAndPriceData(symbol: string): Promise<StockPriceResponse> {
    const stock = await this.prisma.stock.findUnique({
      where: { symbol },
      include: {
        priceHistory: {
          orderBy: {
            publishedAt: 'desc',
          },
          take: 10,
        },
      },
    });

    if (!stock) {
      throw new NotFoundException(
        `Stock with symbol ${symbol} is not being tracked`,
      );
    }

    const currentPrice =
      stock.priceHistory && stock.priceHistory.length
        ? stock.priceHistory[0].price
        : 0;

    const updatedAt =
      stock.priceHistory && stock.priceHistory.length > 0
        ? stock.priceHistory[0].publishedAt
        : new Date();

    // Calculate movingAverage from >up to< 10 latest prices
    // (not caring if we don't have 10 prices)
    const prices = stock.priceHistory
      ? stock.priceHistory.map((record) => record.price)
      : [currentPrice];
    const movingAverage = this.calculateMovingAverage(prices);

    return {
      price: currentPrice,
      updatedAt:
        updatedAt instanceof Date ? updatedAt : new Date(Number(updatedAt)),
      movingAverage,
    };
  }

  async createStockAndStartPriceUpdates(symbol: string) {
    // If the symbol doesn't exist, let the creation fail
    const quoteData = await this.finnhubService.getCurrentQuoteForStock(symbol);

    const stock = await this.prisma.stock.upsert({
      where: { symbol },
      update: {},
      create: { symbol },
    });

    // Initial price creation
    await this.cronService.updateStockWithQuoteData(stock, quoteData);

    try {
      await this.cronService.startStockPriceUpdates(stock);
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        `Error starting price updates for ${symbol}`,
      );
    }
  }

  // A weighted moving average or exponential moving average might be more suitable
  // (but this is simple and works)
  private calculateMovingAverage(prices: number[]): number {
    if (prices.length === 0) return 0;
    const sum = prices.reduce((acc, price) => acc + price, 0);
    return Number((sum / prices.length).toFixed(2));
  }
}
