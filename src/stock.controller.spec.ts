import { Test, TestingModule } from '@nestjs/testing';
import { StockController } from './stock.controller';
import { StockService } from './stock.service';
import { Stock } from '@prisma/client';
import { PrismaService } from './prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('StockController', () => {
  let stockController: StockController;
  let stockService: StockService;

  const mockPrismaService = {
    stock: {
      upsert: jest.fn(),
    },
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
      ],
    }).compile();

    stockController = app.get<StockController>(StockController);
    stockService = app.get<StockService>(StockService);
  });

  describe('getSymbol', () => {
    it('should return stock information for a valid symbol', async () => {
      const mockSymbol = 'NFLX';
      const mockResponse: Stock = {
        id: 1,
        symbol: mockSymbol,
        price: 950.84,
        updatedAt: new Date(),
        movingAverage: 945.3,
      };

      jest
        .spyOn(stockService, 'getOrCreateStock')
        .mockResolvedValue(mockResponse);

      const result = await stockController.getSymbol({ symbol: mockSymbol });

      expect(result).toEqual({
        price: mockResponse.price,
        updatedAt: mockResponse.updatedAt,
        movingAverage: mockResponse.movingAverage,
      });
      expect(stockService.getOrCreateStock).toHaveBeenCalledWith(mockSymbol);
    });

    it('should throw NotFoundException when stock is not found', async () => {
      const validSymbol = 'VLD';
      jest
        .spyOn(stockService, 'getOrCreateStock')
        .mockResolvedValue(undefined as unknown as Stock);

      await expect(
        stockController.getSymbol({ symbol: validSymbol }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
