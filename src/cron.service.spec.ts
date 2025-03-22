import { Test, TestingModule } from '@nestjs/testing';
import { CronService } from './cron.service';
import { PrismaService } from './prisma.service';
import { Logger } from '@nestjs/common';
import * as cron from 'node-cron';

jest.mock('node-cron', () => ({
  schedule: jest.fn().mockReturnValue({
    stop: jest.fn(),
  }),
}));

describe('CronService', () => {
  let service: CronService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    stock: {
      findUnique: jest.fn().mockResolvedValue({
        id: 1,
        symbol: 'NFLX',
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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CronService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    module.useLogger(new Logger());
    service = module.get<CronService>(CronService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('startStockPriceUpdates', () => {
    const stock = { symbol: 'NFLX', id: 1 };

    it('should create and schedule a cron job', () => {
      service.startStockPriceUpdates(stock);
      expect(cron.schedule).toHaveBeenCalledWith(
        '* * * * *',
        expect.any(Function),
      );
    });

    it('should not create a new job if one already exists', () => {
      service.startStockPriceUpdates(stock);
      service.startStockPriceUpdates(stock);
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });
  });
});
