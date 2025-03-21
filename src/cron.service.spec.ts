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
      findUnique: jest.fn(),
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
    const symbol = 'NFLX';

    it('should create and schedule a cron job', () => {
      service.startStockPriceUpdates(symbol);
      expect(cron.schedule).toHaveBeenCalledWith(
        '* * * * *',
        expect.any(Function),
      );
    });

    it('should not create a new job if one already exists', () => {
      service.startStockPriceUpdates(symbol);
      service.startStockPriceUpdates(symbol);
      expect(cron.schedule).toHaveBeenCalledTimes(1);
    });
  });

  describe('stopStockPriceUpdates', () => {
    const symbol = 'NFLX';

    it('should stop the scheduled task', () => {
      service.startStockPriceUpdates(symbol);
      service.stopStockPriceUpdates(symbol);

      const mockScheduledTask = (cron.schedule as jest.Mock).mock.results[0]
        .value;
      expect(mockScheduledTask.stop).toHaveBeenCalled();
    });

    it('should do nothing if no task exists', () => {
      service.stopStockPriceUpdates('NONEXISTENT');
      expect(cron.schedule).not.toHaveBeenCalled();
    });
  });
});
