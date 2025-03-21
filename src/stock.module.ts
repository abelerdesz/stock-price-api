import { Module } from '@nestjs/common';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { PrismaService } from './prisma.service';
@Module({
  imports: [],
  controllers: [StockController],
  providers: [StockService, PrismaService],
})
export class StockModule {}
