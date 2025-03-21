import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { StockMovingAverageResponse } from './types/stock.types';
import { Stock } from '@prisma/client';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreateStock(symbol: string): Promise<Stock> {
    const stock = await this.prisma.stock.upsert({
      where: { symbol },
      update: {},
      create: { symbol, price: 0, movingAverage: 0 },
    });
    return stock;
  }
}
