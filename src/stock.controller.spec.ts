import { Test, TestingModule } from '@nestjs/testing';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { CronService } from './cron.service';
import { Stock } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { NotFoundException } from '@nestjs/common';
import { StockMovingAverageResponse } from './types/stock.types';
import { FinnhubService } from './finnhub.service';

describe('StockController', () => {
  let stockController: StockController;
  let stockService: StockService;
  let cronService: CronService;

  const mockPrismaService = {
    stock: {
      upsert: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    stockPrice: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockCronService = {
    startStockPriceUpdates: jest.fn(),
  };

  const mockFinnhubService = {
    getCurrentPriceForStock: jest.fn().mockResolvedValue(100),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [StockController],
      providers: [
        StockService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: CronService,
          useValue: mockCronService,
        },
        {
          provide: FinnhubService,
          useValue: mockFinnhubService,
        },
      ],
    }).compile();

    stockController = app.get<StockController>(StockController);
    stockService = app.get<StockService>(StockService);
    cronService = app.get<CronService>(CronService);
  });

  describe('getSymbol', () => {
    it('should return stock information for a valid symbol', async () => {
      const mockSymbol = 'NFLX';
      const mockResponse: StockMovingAverageResponse = {
        price: 950.84,
        updatedAt: new Date(),
        movingAverage: 945.3,
      };

      jest
        .spyOn(stockService, 'getStockPriceData')
        .mockResolvedValue(mockResponse);

      const result = await stockController.getStock({ symbol: mockSymbol });

      expect(result).toEqual(mockResponse);
      expect(stockService.getStockPriceData).toHaveBeenCalledWith(mockSymbol);
    });

    it('should throw NotFoundException when stock is not found', async () => {
      const validSymbol = 'VLD';
      jest
        .spyOn(stockService, 'getStockPriceData')
        .mockRejectedValue(new NotFoundException());

      await expect(
        stockController.getStock({ symbol: validSymbol }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('startStockTracking', () => {
    it('should start tracking a stock price via cron job', async () => {
      const mockSymbol = 'NFLX';
      const mockStock: Stock = {
        id: 1,
        symbol: mockSymbol,
      } as Stock;

      jest.spyOn(stockService, 'getOrCreateStock').mockResolvedValue(mockStock);

      const result = await stockController.startStockTracking({
        symbol: mockSymbol,
      });

      expect(result).toEqual({
        message: `Started tracking stock ${mockSymbol}`,
      });
      expect(stockService.getOrCreateStock).toHaveBeenCalledWith(mockSymbol);
      expect(cronService.startStockPriceUpdates).toHaveBeenCalledWith(
        mockStock,
      );
    });
  });
});
