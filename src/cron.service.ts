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

@Injectable()
export class CronService implements OnApplicationShutdown {
  private readonly logger = new Logger(CronService.name);
  private jobs: Map<string, cron.ScheduledTask> = new Map();

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

    // If the symbol doesn't exist, let an error be thrown
    let quoteData =
      await this.finnhubService.getCurrentPriceAndTimestampForStock(symbol);

    const job = cron.schedule('* * * * *', async () => {
      try {
        quoteData =
          await this.finnhubService.getCurrentPriceAndTimestampForStock(symbol);

        try {
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
              `Updated price for ${symbol} to $${quoteData.price} (Published at: ${this.formatDate(quoteData.publishedAt)}, Accessed at: ${this.formatDate(quoteData.accessedAt, true)})`,
            );
          });
        } catch (error) {
          if (error.code === 'P2002') {
            // Prisma unique constraint violation code
            this.logger.log(
              `No new price available since last run, skipping price update for ${symbol}`,
            );
          } else {
            throw error;
          }
        }
      } catch (error) {
        this.logger.error(`Error updating price data for ${symbol}:`, error);
      }
    });

    this.jobs.set(symbol, job);
    this.logger.log(`Started price updates for ${symbol}`);
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Stopping all running jobs');

    for (const job of this.jobs.values()) {
      job.stop();
    }
  }

  private formatDate(date: Date, short: boolean = false): string {
    return format(date, short ? 'HH:mm:ss' : 'yyyy-MM-dd HH:mm:ss');
  }
}
