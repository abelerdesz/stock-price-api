import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { PrismaService } from './prisma.service';
import { CronService } from './cron.service';

@Module({
  imports: [],
  controllers: [StockController],
  providers: [StockService, PrismaService, CronService],
})
export class StockModule {}
