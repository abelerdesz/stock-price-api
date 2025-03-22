import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';
import { PrismaService } from './prisma.service';
import { Logger, NotFoundException } from '@nestjs/common';
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
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockFinnhubService = {
    getCurrentPriceForStock: jest.fn().mockResolvedValue(100),
    throwIfSymbolNotFound: jest
      .fn()
      .mockImplementation(async (symbol: string) => {
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
  });

  describe('startStockPriceUpdates', () => {
    const stock = { symbol: mockSymbol, id: 1 };

    it('should create and schedule a cron job', async () => {
      await service.startStockPriceUpdates(stock);
      expect(cron.schedule).toHaveBeenCalledWith(
        '* * * * *',
        expect.any(Function),
      );
    });

    it('should not create a new job if one already exists', async () => {
      await service.startStockPriceUpdates(stock);
      await service.startStockPriceUpdates(stock);
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });
  });
});
