import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from './prisma.service';
import { FinnhubService } from './finnhub.service';
import { Stock } from '@prisma/client';
import { StockSymbol } from './types/stock.types';

@Injectable()
export class CronService implements OnApplicationShutdown {
  private readonly logger = new Logger(CronService.name);
  private jobs: Map<StockSymbol, cron.ScheduledTask> = new Map();

  constructor(
    private readonly prisma: PrismaService,
    private readonly finnhubService: FinnhubService,
  ) {}

  startStockPriceUpdates(stock: Stock): void {
    const symbol = stock.symbol;

    if (this.jobs.has(symbol)) {
      this.logger.log(`Task for ${symbol} already exists`);
      return;
    }

    const job = cron.schedule('* * * * *', async () => {
      try {
        const currentPrice =
          await this.finnhubService.getCurrentPriceForStock(symbol);

        await this.prisma.stockPrice.create({
          data: {
            price: currentPrice,
            stockId: stock.id,
          },
        });

        await this.prisma.stock.update({
          where: { id: stock.id },
          data: {
            priceHistory: {
              connect: { id: stock.id },
            },
          },
        });
      } catch (error) {
        this.logger.error(`Error updating price data for ${symbol}:`, error);
      }
    });

    this.jobs.set(symbol, job);
    this.logger.log(`Started price updates for ${symbol}`);
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log(`Stopping all running jobs`);

    for (const job of this.jobs.values()) {
      job.stop();
    }
  }
}
