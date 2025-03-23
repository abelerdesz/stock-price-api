import {
  Injectable,
  Logger,
  NotFoundException,
  OnApplicationShutdown,
  BadRequestException,
} from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from './prisma.service';
import { FinnhubService } from './finnhub.service';
import { format } from 'date-fns';
import { Stock } from '@prisma/client';

@Injectable()
export class CronService implements OnApplicationShutdown {
  private readonly logger = new Logger(CronService.name);
  private jobs: Map<string, cron.ScheduledTask> = new Map();
  private activeUpdates = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly finnhubService: FinnhubService,
  ) {}

  async startStockPriceUpdates(symbol: string): Promise<void> {
    if (this.jobs.has(symbol)) {
      throw new BadRequestException(
        `Stock with symbol ${symbol} is already being tracked`,
      );
    }

    const stock = await this.prisma.stock.findUnique({
      where: { symbol },
    });

    if (!stock) {
      throw new NotFoundException(
        `Stock with symbol ${symbol} has not yet been created`,
      );
    }

    // Trigger an initial price fetch to
    // 1. see if the symbol is valid
    // 2. make GET instantly usable
    // If the symbol doesn't exist, let an error be thrown to prevent job creation
    await this.doPriceUpdate(stock);

    const job = cron.schedule(
      '* * * * *',
      async () => await this.doPriceUpdate(stock),
    );

    this.jobs.set(symbol, job);
    this.logger.log(`Started price updates for ${symbol}`);
  }

  private async doPriceUpdate(stock: Stock): Promise<void> {
    if (this.activeUpdates.has(stock.symbol)) {
      this.logger.log(
        `Price update for ${stock.symbol} is already in progress, skipping`,
      );
      return;
    }

    try {
      this.activeUpdates.add(stock.symbol);

      const quoteData = await this.finnhubService.getCurrentQuoteForStock(
        stock.symbol,
      );

      await this.prisma.$transaction(async (tx) => {
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
      });
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
    } finally {
      this.activeUpdates.delete(stock.symbol);
    }
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
