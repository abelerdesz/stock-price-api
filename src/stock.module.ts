import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { PrismaService } from './prisma.service';
import { CronService } from './cron.service';
import { HttpModule } from '@nestjs/axios';
import { FinnhubService } from './finnhub.service';

@Module({
  imports: [HttpModule],
  controllers: [StockController],
  providers: [StockService, PrismaService, CronService, FinnhubService],
})
export class StockModule {}
