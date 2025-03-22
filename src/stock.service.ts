import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StockMovingAverageResponse } from './types/stock.types';
import { Stock } from '@prisma/client';
import { FinnhubService } from './finnhub.service';

@Injectable()
export class StockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finnhubService: FinnhubService,
  ) {}

  async getStockPriceData(symbol: string): Promise<StockMovingAverageResponse> {
    let stock = await this.prisma.stock.findUnique({
      where: { symbol },
      include: {
        priceHistory: {
          orderBy: {
            timestamp: 'desc',
          },
          take: 10,
        },
      },
    });

    // We don't want to start a price update job,
    // but we might as well store the stock and the first price seen
    if (!stock) {
      const newStock = await this.getOrCreateStock(symbol);
      const quoteData =
        await this.finnhubService.getCurrentPriceAndTimestampForStock(symbol);
      const stockPrice = await this.prisma.stockPrice.create({
        data: {
          price: quoteData.price,
          timestamp: quoteData.timestamp,
          stockId: newStock.id,
        },
      });

      stock = await this.prisma.stock.update({
        where: { id: newStock.id },
        data: {
          priceHistory: {
            connect: { id: stockPrice.id },
          },
        },
        include: {
          priceHistory: {
            orderBy: {
              timestamp: 'desc',
            },
            take: 10,
          },
        },
      });

      if (!stock) {
        throw new NotFoundException(
          `Failed to retrieve stock with symbol ${symbol}`,
        );
      }
    }

    const currentPrice =
      stock.priceHistory && stock.priceHistory.length
        ? stock.priceHistory[0].price
        : 0;

    const updatedAt =
      stock.priceHistory && stock.priceHistory.length > 0
        ? stock.priceHistory[0].timestamp
        : new Date();

    // Calculate movingAverage from >up to< 10 latest prices
    // (not caring if we don't have 10 prices)
    const prices = stock.priceHistory
      ? stock.priceHistory.map((record) => record.price)
      : [currentPrice];
    const movingAverage = this.calculateMovingAverage(prices);

    return {
      price: currentPrice,
      updatedAt,
      movingAverage,
    };
  }

  async getOrCreateStock(symbol: string): Promise<Stock> {
    const stock = await this.prisma.stock.upsert({
      where: { symbol },
      update: {},
      create: { symbol },
    });

    return stock;
  }

  // A weighted moving average or exponential moving average might be more suitable
  // (but this is simple and works)
  private calculateMovingAverage(prices: number[]): number {
    if (prices.length === 0) return 0;
    const sum = prices.reduce((acc, price) => acc + price, 0);
    return sum / prices.length;
  }
}
