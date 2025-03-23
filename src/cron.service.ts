import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  BadRequestException,
} from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from './prisma.service';
import { FinnhubService } from './finnhub.service';
import { format } from 'date-fns';
import { Stock } from '@prisma/client';
import { StockPriceData } from './types/stock.types';

@Injectable()
export class CronService implements OnApplicationShutdown {
  private readonly logger = new Logger(CronService.name);

  private jobs: Map<string, cron.ScheduledTask> = new Map();

  private activeUpdates = new Set<string>();

  private readonly MAX_TRACKED_STOCKS = 50;

  constructor(
    private readonly prisma: PrismaService,
    private readonly finnhubService: FinnhubService,
  ) {}

  async startStockPriceUpdates(stock: Stock): Promise<void> {
    if (this.jobs.has(stock.symbol)) {
      throw new BadRequestException(
        `Stock with symbol ${stock.symbol} is already being tracked`,
      );
    }

    if (this.jobs.size >= this.MAX_TRACKED_STOCKS) {
      throw new BadRequestException(
        `Cannot track more than ${this.MAX_TRACKED_STOCKS} stocks`,
      );
    }

    const job = cron.schedule(
      '* * * * *',
      async () => await this.doPriceUpdate(stock),
    );

    this.jobs.set(stock.symbol, job);
    this.logger.log(`Started price updates for ${stock.symbol}`);
  }

  private async doPriceUpdate(stock: Stock): Promise<void> {
    if (this.activeUpdates.has(stock.symbol)) {
      this.logger.log(
        `Price update for ${stock.symbol} is already in progress, skipping`,
      );
      return;
    }

    this.activeUpdates.add(stock.symbol);

    const quoteData = await this.finnhubService.getCurrentQuoteForStock(
      stock.symbol,
    );

    await this.updateStockWithQuoteData(stock, quoteData);

    this.activeUpdates.delete(stock.symbol);
  }

  async updateStockWithQuoteData(stock: Stock, quoteData: StockPriceData) {
    this.prisma.$transaction(async (tx) => {
      try {
        const priceRecord = await tx.stockPrice.create({
          data: {
            stockId: stock.id,
            price: quoteData.price,
            publishedAt: quoteData.publishedAt,
            accessedAt: quoteData.accessedAt,
          },
        });

        await tx.stock.update({
          where: { id: stock.id },
          data: {
            priceHistory: {
              connect: { id: priceRecord.id },
            },
          },
          include: {
            priceHistory: {
              orderBy: {
                publishedAt: 'desc',
              },
            },
          },
        });

        this.logger.log(
          `Updated price for ${stock.symbol} to $${quoteData.price} (Published at: ${this.formatDate(quoteData.publishedAt)}, Accessed at: ${this.formatDate(quoteData.accessedAt, true)})`,
        );
      } catch (error) {
        if (error.code === 'P2002') {
          // Prisma unique constraint violation code
          this.logger.log(
            `No new price available since last run, skipping price update for ${stock.symbol}`,
          );
        } else {
          this.logger.error(
            `Error updating price data for ${stock.symbol}:`,
            error,
          );

          throw error;
        }
      }
    });
  }

  private formatDate(date: Date, short: boolean = false): string {
    return format(date, short ? 'HH:mm:ss' : 'yyyy-MM-dd HH:mm:ss');
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Stopping all running jobs');

    for (const job of this.jobs.values()) {
      job.stop();
    }
  }
}
