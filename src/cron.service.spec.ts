import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';
import { PrismaService } from './prisma.service';
import { Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import * as cron from 'node-cron';
import { FinnhubService } from './finnhub.service';

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    stop: jest.fn(),
  }),
}));

describe('CronService', () => {
  const mockSymbol = 'NFLX';
  let service: CronService;
  let prismaService: PrismaService;
  let finnhubService: FinnhubService;

  const mockPriceData = {
    price: 350.25,
    publishedAt: new Date(),
    accessedAt: new Date(),
  };

  const mockPrismaService = {
    stock: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        symbol: mockSymbol,
        price: 100,
        movingAverage: 100,
      }),
      update: jest.fn(),
    },
    stockPrice: {
      create: jest.fn().mockResolvedValue({
        id: 1,
        stockId: 1,
        price: mockPriceData.price,
        publishedAt: mockPriceData.publishedAt,
        accessedAt: mockPriceData.accessedAt,
      }),
    },
    $transaction: jest.fn().mockImplementation(async (callback) => {
      return callback(mockPrismaService);
    }),
  };

  const mockFinnhubService = {
    getCurrentPriceAndTimestampForStock: jest
      .fn()
      .mockResolvedValue(mockPriceData),
    throwIfSymbolNotFound: jest.fn().mockImplementation((symbol: string) => {
      if (symbol === 'NFLX') {
        return;
      }

      throw new NotFoundException(`Stock with symbol '${symbol}' not found`);
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FinnhubService,
          useValue: mockFinnhubService,
        },
      ],
    }).compile();

    module.useLogger(new Logger());
    service = module.get<CronService>(CronService);
    prismaService = module.get<PrismaService>(PrismaService);
    finnhubService = module.get<FinnhubService>(FinnhubService);
  });

  describe('startStockPriceUpdates', () => {
    it('should create and schedule a cron job', async () => {
      await service.startStockPriceUpdates(mockSymbol);
      expect(cron.schedule).toHaveBeenCalledWith(
        '* * * * *',
        expect.any(Function),
      );
      expect(
        finnhubService.getCurrentPriceAndTimestampForStock,
      ).toHaveBeenCalledWith(mockSymbol);
    });

    it('should not create a new job if one already exists', async () => {
      await service.startStockPriceUpdates(mockSymbol);
      await expect(service.startStockPriceUpdates(mockSymbol)).rejects.toThrow(
        BadRequestException,
      );
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if stock does not exist', async () => {
      mockPrismaService.stock.findUnique.mockResolvedValueOnce(null);
      await expect(service.startStockPriceUpdates(mockSymbol)).rejects.toThrow(
        NotFoundException,
      );
      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });

  describe('onApplicationShutdown', () => {
    it('should stop all running jobs', async () => {
      const stopMock = jest.fn();
      const mockJob = { stop: stopMock };

      // Manually set jobs in the service
      // @ts-ignore - Accessing private property for testing
      service.jobs.set(mockSymbol, mockJob as any);

      await service.onApplicationShutdown();
      expect(stopMock).toHaveBeenCalled();
    });
  });
});
