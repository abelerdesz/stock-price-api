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
  const mockSymbol = 'NFLX';
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
    startStockPriceUpdates: jest.fn().mockResolvedValue(undefined),
  };

  const mockFinnhubService = {
    getCurrentPriceAndTimestampForStock: jest.fn().mockResolvedValue({
      price: 350.25,
      publishedAt: new Date(),
      accessedAt: new Date(),
    }),
    throwIfSymbolNotFound: jest.fn().mockImplementation((symbol: string) => {
      if (symbol === mockSymbol) {
        return;
      }

      throw new NotFoundException(`Stock with symbol '${symbol}' not found`);
    }),
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

  describe('getStock', () => {
    it('should return stock information for a valid symbol', async () => {
      const mockResponse: StockMovingAverageResponse = {
        price: 950.84,
        updatedAt: new Date(),
        movingAverage: 945.3,
      };

      jest
        .spyOn(stockService, 'getStockAndPriceData')
        .mockResolvedValue(mockResponse);

      const result = await stockController.getStock({ symbol: mockSymbol });

      expect(result).toEqual(mockResponse);
      expect(stockService.getStockAndPriceData).toHaveBeenCalledWith(
        mockSymbol,
      );
    });

    it('should throw NotFoundException when stock is not found', async () => {
      const validSymbol = 'VLD';
      jest
        .spyOn(stockService, 'getStockAndPriceData')
        .mockRejectedValue(new NotFoundException());

      await expect(
        stockController.getStock({ symbol: validSymbol }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('startStockUpdates', () => {
    it('should start tracking a stock price via stock service', async () => {
      jest
        .spyOn(stockService, 'createStockAndStartPriceUpdates')
        .mockResolvedValue(undefined);

      const result = await stockController.startStockUpdates({
        symbol: mockSymbol,
      });

      expect(result).toEqual({
        message: `Started tracking stock ${mockSymbol}`,
      });
      expect(stockService.createStockAndStartPriceUpdates).toHaveBeenCalledWith(
        mockSymbol,
      );
    });
  });
});
