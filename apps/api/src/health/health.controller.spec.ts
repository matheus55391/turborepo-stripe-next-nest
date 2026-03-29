import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

describe('HealthController', () => {
  let controller: HealthController;

  const mockPrisma = { $queryRaw: jest.fn() };
  const mockRedis = { client: { ping: jest.fn() } };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RedisService, useValue: mockRedis },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
  });

  afterEach(() => jest.clearAllMocks());

  it('should return ok when all services are up', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockRedis.client.ping.mockResolvedValue('PONG');

    const result = await controller.check();

    expect(result).toEqual({
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });
  });

  it('should return degraded when database is down', async () => {
    mockPrisma.$queryRaw.mockRejectedValue(new Error('Connection refused'));
    mockRedis.client.ping.mockResolvedValue('PONG');

    const result = await controller.check();

    expect(result).toEqual({
      status: 'degraded',
      checks: { database: 'down', redis: 'up' },
    });
  });

  it('should return degraded when redis is down', async () => {
    mockPrisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);
    mockRedis.client.ping.mockRejectedValue(new Error('Connection refused'));

    const result = await controller.check();

    expect(result).toEqual({
      status: 'degraded',
      checks: { database: 'up', redis: 'down' },
    });
  });
});
