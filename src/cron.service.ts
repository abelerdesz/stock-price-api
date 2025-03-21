import { Injectable, Logger } from '@nestjs/common';
import * as cron from 'node-cron';
import { PrismaService } from './prisma.service';

@Injectable()
export class CronService {
  private readonly logger = new Logger(CronService.name);
  private activeTasks: Map<string, cron.ScheduledTask> = new Map();

  constructor(private readonly prisma: PrismaService) {}

  startStockPriceUpdates(symbol: string): void {
    if (this.activeTasks.has(symbol)) {
      this.logger.log(`Task for ${symbol} already exists`);
      return;
    }

    const task = cron.schedule('* * * * *', async () => {
      try {
        const existingStock = await this.prisma.stock.findUnique({
          where: { symbol },
        });

        if (!existingStock) {
          this.logger.error(`Stock with symbol ${symbol} not found`);
          return;
      } catch (error) {
        this.logger.error(`Error updating data for ${symbol}:`, error);
      }
    });

    this.activeTasks.set(symbol, task);
    this.logger.log(`Started price updates for ${symbol}`);
  }

  stopStockPriceUpdates(symbol: string): void {
    const task = this.activeTasks.get(symbol);
    if (task) {
      task.stop();
      this.activeTasks.delete(symbol);
      this.logger.log(`Stopped price updates for ${symbol}`);
    }
  }

  private calculateMovingAverage(prices: number[]): number {
    if (prices.length === 0) return 0;
    const sum = prices.reduce((acc, price) => acc + price, 0);
    return sum / prices.length;
}
